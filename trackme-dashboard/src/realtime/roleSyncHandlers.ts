/**
 * Socket.IO Real-Time Role Synchronization
 * 
 * Handles real-time updates for:
 * - Role changes
 * - Permission updates
 * - Hierarchy notifications
 * - Team status changes
 */

import type { Server, Socket } from 'socket.io';
import { getDb } from '../api/db';
import type { RoleName } from '../api/roleHierarchy';
import { ObjectId } from 'mongodb';
import {
  canManageRole,
  getRoleInfo,
  getSuperiors,
  getSubordinates,
  normalizeRoleName,
} from '../api/roleHierarchy';

function isObjectIdLike(id: string) {
  return ObjectId.isValid(id);
}

/**
 * Register role synchronization event handlers
 */
export function registerRoleSyncHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const userId = String(socket.handshake.auth?.userId || '');
    const claimedRole = normalizeRoleName(socket.handshake.auth?.role);

    if (!userId) {
      socket.disconnect(true);
      return;
    }

    // Join user-specific room for targeted broadcasts
    socket.join(`user:${userId}`);
    if (claimedRole) {
      socket.join(`role:${claimedRole}`);
      socket.join(`hierarchy:${claimedRole}`);
    }

    const resolveCurrentUserRole = async (): Promise<RoleName | null> => {
      if (!isObjectIdLike(userId)) {
        return claimedRole;
      }
      try {
        const db = await getDb();
        const user = await db.collection('users').findOne(
          { _id: new ObjectId(userId) },
          { projection: { role: 1 } }
        );
        return normalizeRoleName(String(user?.role || '')) ?? claimedRole;
      } catch {
        return claimedRole;
      }
    };

    /**
     * Subscribe to hierarchy updates for specific role
     */
    socket.on('hierarchy:subscribe', async (data: { role: RoleName }) => {
      const requestedRole = normalizeRoleName(data?.role);
      const actorRole = await resolveCurrentUserRole();
      if (!requestedRole || !actorRole) {
        socket.emit('error', { message: 'Invalid role scope' });
        return;
      }

      const canViewRequestedRole = actorRole === 'super_admin' || actorRole === requestedRole || canManageRole(actorRole, requestedRole);
      if (!canViewRequestedRole) {
        socket.emit('error', { message: 'Unauthorized hierarchy scope' });
        return;
      }

      // Join role-specific broadcast room
      socket.join(`hierarchy:${requestedRole}`);

      // Send current organizational structure
      const db = await getDb();
      const users = await db
        .collection('users')
        .find({ role: { $in: [requestedRole, requestedRole === 'control_room_commander' ? 'control_room' : requestedRole] } })
        .project({ _id: 1, email: 1, role: 1, status: 1 })
        .toArray();

      socket.emit('hierarchy:snapshot', {
        role: requestedRole,
        members: users,
        timestamp: new Date(),
      });
    });

    /**
     * Listen for role change notifications
     */
    socket.on('hierarchy:roleChange', async (event: {
      userId: string;
      newRole: RoleName;
      previousRole: RoleName;
      changedBy: string;
    }) => {
      const { userId: changedUserId } = event;
      const newRole = normalizeRoleName(event?.newRole);
      const previousRole = normalizeRoleName(event?.previousRole);
      const actorRole = await resolveCurrentUserRole();
      if (!newRole || !previousRole || !actorRole) {
        socket.emit('error', { message: 'Invalid role change payload' });
        return;
      }

      if (!isObjectIdLike(changedUserId)) {
        socket.emit('error', { message: 'Invalid target user' });
        return;
      }

      // Verify authorization via strict chain of command.
      if (!canManageRole(actorRole, newRole)) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Update user in database
      const db = await getDb();
      const targetUser = await db.collection('users').findOne({ _id: new ObjectId(changedUserId) }, { projection: { role: 1 } });
      const targetCurrentRole = normalizeRoleName(String(targetUser?.role || ''));
      if (!targetCurrentRole || !canManageRole(actorRole, targetCurrentRole)) {
        socket.emit('error', { message: 'Cannot update this user role' });
        return;
      }

      await db.collection('users').updateOne(
        { _id: new ObjectId(changedUserId) },
        {
          $set: {
            role: newRole,
            updatedAt: new Date(),
          },
        }
      );

      // Broadcast to all relevant parties
      io.to(`hierarchy:${previousRole}`).emit('hierarchy:memberLeft', {
        userId: changedUserId,
        role: previousRole,
        timestamp: new Date(),
      });

      io.to(`hierarchy:${newRole}`).emit('hierarchy:memberJoined', {
        userId: changedUserId,
        role: newRole,
        timestamp: new Date(),
      });

      // Notify the affected user
      io.to(`user:${changedUserId}`).emit('roleUpdated', {
        newRole,
        previousRole,
        permissions: getRoleInfo(newRole).realTimeCapabilities,
        timestamp: new Date(),
      });

      // Notify superiors in chain
      const superiors = getSuperiors(newRole);
      for (const superior of superiors) {
        io.to(`role:${superior}`).emit('hierarchy:alert', {
          type: 'roleChange',
          userId: changedUserId,
          newRole,
          previousRole,
          changedBy: userId,
          timestamp: new Date(),
        });
      }
    });

    socket.on('hierarchy:query', async (data: {
      type: 'superiors' | 'subordinates' | 'peers';
      role: RoleName;
    }) => {
      const { type } = data;
      const role = normalizeRoleName(data?.role);
      if (!role) {
        socket.emit('hierarchy:queryResult', { type, role: null, result: [] });
        return;
      }

      let result: RoleName[] = [];

      switch (type) {
        case 'superiors':
          result = getSuperiors(role);
          break;
        case 'subordinates':
          result = getSubordinates(role);
          break;
        case 'peers':
          // Same level roles (not implemented yet - would need to import role info)
          result = [];
          break;
      }

      socket.emit('hierarchy:queryResult', { type, role, result });
    });

    /**
     * Listen for team status changes
     */
    socket.on('hierarchy:teamStatus', async (data: {
      role: RoleName;
      status: 'online' | 'offline' | 'busy';
    }) => {
      const actorRole = await resolveCurrentUserRole();
      const role = normalizeRoleName(data?.role) ?? actorRole;
      const status = data?.status;
      if (!role || !status) {
        socket.emit('error', { message: 'Invalid team status payload' });
        return;
      }

      // Update user status
      const db = await getDb();
      const userSelector = isObjectIdLike(userId)
        ? { _id: new ObjectId(userId) }
        : { userId };
      await db.collection('users').updateOne(
        userSelector,
        {
          $set: {
            status,
            lastStatusUpdate: new Date(),
          },
        }
      );

      // Broadcast status change to team
      io.to(`hierarchy:${role}`).emit('hierarchy:memberStatus', {
        userId,
        status,
        timestamp: new Date(),
      });

      // Notify superiors
      const superiors = getSuperiors(role);
      for (const superior of superiors) {
        io.to(`role:${superior}`).emit('hierarchy:teamStatusUpdate', {
          role,
          userId,
          status,
          timestamp: new Date(),
        });
      }
    });

    /**
     * Broadcast incident escalation up the chain
     */
    socket.on('hierarchy:escalateIncident', async (data: {
      incidentId: string;
      currentRole: RoleName;
      escalationReason: string;
    }) => {
      const incidentId = String(data?.incidentId || '');
      const escalationReason = String(data?.escalationReason || '');
      const actorRole = await resolveCurrentUserRole();
      const currentRole = normalizeRoleName(data?.currentRole) ?? actorRole;
      if (!incidentId || !currentRole) {
        socket.emit('error', { message: 'Invalid escalation payload' });
        return;
      }

      if (actorRole && currentRole !== actorRole) {
        socket.emit('error', { message: 'Role mismatch for escalation' });
        return;
      }

      const superiors = getSuperiors(currentRole);
      
      for (const superior of superiors) {
        io.to(`role:${superior}`).emit('hierarchy:incidentEscalated', {
          incidentId,
          escalatedFrom: currentRole,
          escalatedBy: userId,
          reason: escalationReason,
          timestamp: new Date(),
        });
      }
    });

    /**
     * Handle authority override (superior overrides subordinate decision)
     */
    socket.on('hierarchy:authorityOverride', async (data: {
      targetUserId: string;
      decisionType: string;
      originalDecision: any;
      overrideDecision: any;
    }) => {
      const actorRole = await resolveCurrentUserRole();
      const { targetUserId, decisionType, originalDecision, overrideDecision } = data;

      // Verify user has authority
      if (!actorRole || !['super_admin', 'control_room_commander', 'dispatcher'].includes(actorRole)) {
        socket.emit('error', { message: 'Unauthorized to override' });
        return;
      }

      // Notify affected user
      io.to(`user:${targetUserId}`).emit('hierarchy:decisionOverridden', {
        decisionType,
        originalDecision,
        overrideDecision,
        overriddenBy: userId,
        overriddenByRole: actorRole,
        timestamp: new Date(),
      });

      // Log override
      const db = await getDb();
      await db.collection('auditLog').insertOne({
        type: 'authorityOverride',
        userId,
        userRole: actorRole,
        targetUserId,
        decisionType,
        originalDecision,
        overrideDecision,
        timestamp: new Date(),
      });
    });

    /**
     * Request delegation of task to subordinate
     */
    socket.on('hierarchy:delegateTask', async (data: {
      taskId: string;
      targetRole: RoleName;
      instructions: string;
    }) => {
      const actorRole = await resolveCurrentUserRole();
      const { taskId, instructions } = data;
      const targetRole = normalizeRoleName(data?.targetRole);
      if (!targetRole || !actorRole) {
        socket.emit('error', { message: 'Invalid delegation payload' });
        return;
      }
      if (!canManageRole(actorRole, targetRole)) {
        socket.emit('error', { message: 'Cannot delegate outside hierarchy' });
        return;
      }

      // Broadcast delegation to role
      io.to(`hierarchy:${targetRole}`).emit('hierarchy:taskDelegated', {
        taskId,
        delegatedFrom: actorRole,
        delegatedBy: userId,
        instructions,
        timestamp: new Date(),
      });
    });

    /**
     * Handle disconnection cleanup
     */
    socket.on('disconnect', () => {
      // Update user status to offline
      void getDb().then((database) => {
        const userSelector = isObjectIdLike(userId)
          ? { _id: new ObjectId(userId) }
          : { userId };
        database.collection('users').updateOne(
          userSelector,
          {
            $set: {
              status: 'offline',
              lastStatusUpdate: new Date(),
            },
          }
        );
      });

      // Notify team
      if (claimedRole) {
        io.to(`role:${claimedRole}`).emit('hierarchy:memberDisconnected', {
          userId,
          timestamp: new Date(),
        });
      }
    });
  });
}

/**
 * Emit role change event from server
 */
export function broadcastRoleChange(
  io: Server,
  event: {
    userId: string;
    newRole: RoleName;
    previousRole: RoleName;
    changedAt: Date;
  }
) {
  // Broadcast to affected role rooms
  io.to(`hierarchy:${event.previousRole}`).emit('member:roleChanged', event);
  io.to(`hierarchy:${event.newRole}`).emit('member:joined', {
    userId: event.userId,
    role: event.newRole,
    timestamp: event.changedAt,
  });

  // Notify user directly
  io.to(`user:${event.userId}`).emit('yourRoleChanged', {
    newRole: event.newRole,
    previousRole: event.previousRole,
    timestamp: event.changedAt,
  });
}

/**
 * Broadcast permissions update
 */
export function broadcastPermissionsUpdate(
  io: Server,
  userId: string,
  role: RoleName
) {
  const permissions = getRoleInfo(role).realTimeCapabilities;
  io.to(`user:${userId}`).emit('permissionsUpdated', {
    role,
    permissions,
    timestamp: new Date(),
  });
}

/**
 * Send hierarchy alert to specific role
 */
export function sendHierarchyAlert(
  io: Server,
  targetRole: RoleName,
  alert: {
    type: string;
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    data?: any;
  }
) {
  io.to(`role:${targetRole}`).emit('hierarchy:alert', {
    ...alert,
    timestamp: new Date(),
  });
}
