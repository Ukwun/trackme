/**
 * Real-time Role Management System
 * 
 * Handles:
 * - Role transitions with validation
 * - Broadcasting role changes via Socket.IO
 * - Permission synchronization
 * - Hierarchy notifications
 * - Audit logging
 */

import { getDb } from './db';
import { getRealtimeServer } from '../realtime/server';
import type { RoleName } from './roleHierarchy';
import { ObjectId } from 'mongodb';
import {
  canTransitionRole,
  getRoleInfo,
  getSuperiors,
  getNotificationRecipients,
  normalizeRoleName,
  ROLE_RELATIONSHIP_EVENTS,
} from './roleHierarchy';

export interface RoleChangeEvent {
  userId: string;
  email: string;
  previousRole: RoleName;
  newRole: RoleName;
  changedBy: string;
  changedByRole: RoleName;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RoleAuditEntry extends RoleChangeEvent {
  _id?: string;
  status: 'approved' | 'rejected' | 'pending';
  rejectionReason?: string;
}

/**
 * Perform a role transition with full validation and notifications
 */
export async function transitionRole(
  targetUserId: string,
  newRole: RoleName,
  performedByUserId: string,
  reason?: string
): Promise<{
  success: boolean;
  error?: string;
  event?: RoleChangeEvent;
}> {
  try {
    const db = await getDb();

    // Get target user current role
    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return { success: false, error: 'Target user not found' };
    }

    // Get performer info for authorization check
    const performer = await db.collection('users').findOne({ _id: new ObjectId(performedByUserId) });
    if (!performer) {
      return { success: false, error: 'Performer not authorized' };
    }

    const normalizedNewRole = normalizeRoleName(newRole);
    const currentRole = normalizeRoleName(String(targetUser.role || ''));
    const performerRole = normalizeRoleName(String(performer.role || ''));

    if (!normalizedNewRole || !currentRole || !performerRole) {
      return { success: false, error: 'Invalid role data for transition' };
    }

    // Validate the transition
    const validation = canTransitionRole(currentRole, normalizedNewRole, performerRole);
    if (!validation.allowed) {
      // Log rejected transition
      await db.collection('roleAudit').insertOne({
        userId: targetUserId,
        email: targetUser.email,
        previousRole: currentRole,
        newRole: normalizedNewRole,
        changedBy: performedByUserId,
        changedByRole: performerRole,
        timestamp: new Date(),
        reason,
        status: 'rejected',
        rejectionReason: validation.reason,
      });

      return { success: false, error: validation.reason };
    }

    // Perform the role change
    const updateResult = await db.collection('users').updateOne(
      { _id: new ObjectId(targetUserId) },
      {
        $set: {
          role: normalizedNewRole,
          roleCanonical: normalizedNewRole,
          updatedAt: new Date(),
          updatedBy: performedByUserId,
        },
      }
    );

    if (!updateResult.modifiedCount) {
      return { success: false, error: 'Failed to update user role' };
    }

    // Create audit entry
    const event: RoleChangeEvent = {
      userId: targetUserId,
      email: targetUser.email,
      previousRole: currentRole,
      newRole: normalizedNewRole,
      changedBy: performedByUserId,
      changedByRole: performerRole,
      timestamp: new Date(),
      reason,
    };

    await db.collection('roleAudit').insertOne({
      ...event,
      status: 'approved',
    });

    // Broadcast role change in real-time
    await broadcastRoleChange(event);

    // Notify relevant parties
    await notifyRoleChange(event);

    // Update user's active sessions with new permissions
    await syncUserPermissions(targetUserId, newRole);

    return { success: true, event };
  } catch (error) {
    console.error('Error transitioning role:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Broadcast role change to all connected clients
 */
async function broadcastRoleChange(event: RoleChangeEvent) {
  try {
    const io = getRealtimeServer();
    if (!io) return;

    // Emit to all connected clients
    io.emit('roleChanged', {
      userId: event.userId,
      newRole: event.newRole,
      previousRole: event.previousRole,
      changedAt: event.timestamp,
    });

    // If target user is online, send direct notification
    io.to(`user:${event.userId}`).emit('yourRoleUpdated', event);
  } catch (error) {
    console.error('Error broadcasting role change:', error);
  }
}

/**
 * Notify relevant people about role changes
 */
async function notifyRoleChange(event: RoleChangeEvent) {
  try {
    const db = await getDb();
    const io = getRealtimeServer();
    if (!io) return;

    // Get role info
    const newRoleInfo = getRoleInfo(event.newRole);
    const superiors = getSuperiors(event.newRole);

    // Create notification entries
    const notifications = [];

    // Notify performer
    notifications.push({
      recipientId: event.changedBy,
      type: ROLE_RELATIONSHIP_EVENTS.role_changed,
      title: `Role Updated`,
      message: `${event.email} promoted to ${newRoleInfo.title}`,
      data: event,
      readAt: null,
      createdAt: new Date(),
    });

    // Notify target user
    notifications.push({
      recipientId: event.userId,
      type: ROLE_RELATIONSHIP_EVENTS.role_changed,
      title: `Your Role Changed`,
      message: `Your role is now ${newRoleInfo.title}`,
      data: event,
      readAt: null,
      createdAt: new Date(),
      priority: 'high',
    });

    // Notify superiors in chain
    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(event.userId) });
    if (targetUser && superiors.length > 0) {
      const superiorUsers = await db
        .collection('users')
        .find({ role: { $in: superiors } })
        .toArray();

      superiorUsers.forEach((superior) => {
        notifications.push({
          recipientId: superior._id,
          type: ROLE_RELATIONSHIP_EVENTS.chain_of_command_alert,
          title: `Team Role Change`,
          message: `${event.email} is now ${newRoleInfo.title}`,
          data: event,
          readAt: null,
          createdAt: new Date(),
        });
      });
    }

    // Insert all notifications
    if (notifications.length > 0) {
      await db.collection('notifications').insertMany(notifications);
    }

    // Emit notifications in real-time
    notifications.forEach((notif) => {
      io.to(`user:${notif.recipientId}`).emit('notification', notif);
    });
  } catch (error) {
    console.error('Error notifying role change:', error);
  }
}

/**
 * Sync user permissions to all their active sessions
 */
async function syncUserPermissions(userId: string, role: RoleName) {
  try {
    const io = getRealtimeServer();
    if (!io) return;
    
    io.to(`user:${userId}`).emit('permissionsUpdated', { userId, role, updatedAt: new Date() });
  } catch (error) {
    console.error('Error syncing permissions:', error);
  }
}

/**
 * Get role audit history for a user
 */
export async function getRoleAuditHistory(userId: string, limit = 50) {
  try {
    const db = await getDb();
    return await db
      .collection('roleAudit')
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('Error fetching role audit history:', error);
    return [];
  }
}

/**
 * Get all pending role transitions (for approval)
 */
export async function getPendingRoleTransitions() {
  try {
    const db = await getDb();
    return await db
      .collection('roleAudit')
      .find({ status: 'pending' })
      .sort({ timestamp: -1 })
      .toArray();
  } catch (error) {
    console.error('Error fetching pending transitions:', error);
    return [];
  }
}

/**
 * Approve a pending role transition
 */
export async function approvePendingTransition(
  auditId: string,
  approvedBy: string
) {
  try {
    const db = await getDb();
    const pending = await db.collection('roleAudit').findOne({ _id: new ObjectId(auditId), status: 'pending' });

    if (!pending) {
      return { success: false, error: 'Pending transition not found' };
    }

    // Perform the role change
    return await transitionRole(
      pending.userId,
      pending.newRole,
      approvedBy,
      `Approved by ${approvedBy}`
    );
  } catch (error) {
    console.error('Error approving transition:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get real-time role statistics
 */
export async function getRoleStatistics() {
  try {
    const db = await getDb();
    const stats = await db
      .collection('users')
      .aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            lastUpdated: { $max: '$updatedAt' },
          },
        },
      ])
      .toArray();

    return Object.fromEntries(stats.map((s) => [s._id, s.count]));
  } catch (error) {
    console.error('Error fetching role statistics:', error);
    return {};
  }
}

/**
 * Get organizational structure (hierarchy visualization)
 */
export async function getOrganizationalStructure() {
  try {
    const db = await getDb();
    const users = await db.collection('users').find({}).toArray();

    const structure: Record<RoleName, any[]> = {
      super_admin: [],
      control_room_commander: [],
      dispatcher: [],
      field_supervisor: [],
      patrol_officer: [],
      field_agent: [],
    };

    users.forEach((user) => {
      const role = user.role as RoleName;
      if (structure[role]) {
        structure[role].push({
          id: user._id,
          email: user.email,
          role,
          status: user.status || 'offline',
        });
      }
    });

    return structure;
  } catch (error) {
    console.error('Error fetching organizational structure:', error);
    return {};
  }
}
