/**
 * Real-Time Role Relationship Events System
 * 
 * Handles all real-time synchronization of role relationships:
 * - Role changes and promotions
 * - Team assignments
 * - Region assignments
 * - Delegation of authority
 * - Escalation events
 * - Chain of command alerts
 */

import { getDb } from './db';
import { getRealtimeServer } from '../realtime/server';
import { logActivity } from './logActivity';
import type { RoleName } from './roleHierarchy';
import { ObjectId } from 'mongodb';
import { ROLE_HIERARCHY } from './roleHierarchy';

/**
 * Assign user to region/team (SUPER_ADMIN delegates regional authority)
 */
export async function assignUserToRegion(
  userId: string,
  regionId: string,
  assignedBy: string,
  authority: 'full' | 'limited' = 'full'
): Promise<{
  success: boolean;
  error?: string;
  event?: Record<string, any>;
}> {
  try {
    const db = await getDb();
    const io = getRealtimeServer();

    // Verify user and region exist
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    const region = await db.collection('regions').findOne({ _id: new ObjectId(regionId) });

    if (!user || !region) {
      return { success: false, error: 'User or region not found' };
    }

    // Update user's region assignment
    const updateResult = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          region: String(region._id),
          regionAuthority: authority,
          assignedToRegionAt: new Date().toISOString(),
          assignedToRegionBy: assignedBy,
        },
      }
    );

    if (!updateResult.modifiedCount) {
      return { success: false, error: 'Failed to assign region' };
    }

    // Update region's officer list
    const regionUpdateResult = await db.collection('regions').updateOne(
      { _id: new ObjectId(regionId) },
      { $addToSet: { officers: userId } }
    );

    const event = {
      userId,
      email: user.email,
      role: user.role,
      regionId: String(region._id),
      regionName: region.name,
      authority,
      assignedBy,
      timestamp: new Date(),
      eventType: 'region:assignment',
    };

    // Log activity
    await logActivity({
      userId: assignedBy,
      action: 'role:region:assigned',
      meta: { targetUserId: userId, regionId, authority },
    });

    // Broadcast event
    if (io) {
      // Notify user
      io.to(`user:${userId}`).emit('regionAssigned', event);
      
      // Notify region commanders
      io.to(`region:${regionId}`).emit('officerAssigned', event);
      
      // Notify all admins
      io.emit('systemEvent', {
        type: 'user:region:assigned',
        data: event,
      });
    }

    return { success: true, event };
  } catch (error) {
    console.error('Error assigning region:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Create team and assign members (FIELD_SUPERVISOR or higher creates team)
 */
export async function createTeam(
  teamName: string,
  supervisorId: string,
  memberIds: string[],
  createdBy: string
): Promise<{
  success: boolean;
  error?: string;
  teamId?: string;
  event?: Record<string, any>;
}> {
  try {
    const db = await getDb();
    const io = getRealtimeServer();

    // Verify supervisor exists and is Field Supervisor or higher
    const supervisor = await db.collection('users').findOne({ _id: new ObjectId(supervisorId) });
    if (!supervisor) {
      return { success: false, error: 'Supervisor not found' };
    }

    const supervisorRoleLevel = ROLE_HIERARCHY[supervisor.role as RoleName]?.level ?? 999;
    if (supervisorRoleLevel > 3) {
      // FIELD_SUPERVISOR is level 3
      return { success: false, error: 'Supervisor role not authorized to create teams' };
    }

    // Create team
    const team = {
      name: teamName,
      supervisor: supervisorId,
      members: memberIds,
      createdBy,
      createdAt: new Date().toISOString(),
      status: 'active',
      eventLog: [],
    };

    const result = await db.collection('teams').insertOne(team);
    const teamId = String(result.insertedId);

    // Update members to reference team
    if (memberIds.length > 0) {
      await db.collection('users').updateMany(
        { _id: { $in: memberIds.map((id) => new ObjectId(id)) } },
        { $set: { teamId } }
      );
    }

    const event = {
      teamId,
      teamName,
      supervisorId,
      supervisorEmail: supervisor.email,
      memberCount: memberIds.length,
      createdAt: new Date(),
    };

    // Log and broadcast
    await logActivity({
      userId: createdBy,
      action: 'team:created',
      meta: { teamId, teamName, supervisorId, memberCount: memberIds.length },
    });

    if (io) {
      io.emit('teamCreated', event);
      
      // Notify team members
      memberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit('addedToTeam', {
          teamId,
          teamName,
          supervisorId,
          supervisorEmail: supervisor.email,
        });
      });
    }

    return { success: true, teamId, event };
  } catch (error) {
    console.error('Error creating team:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Escalate incident to superior (Field officer escalates to supervisor, then to dispatcher, etc.)
 */
export async function escalateIncident(
  incidentId: string,
  escalatedBy: string,
  escalationReason: string
): Promise<{
  success: boolean;
  error?: string;
  event?: Record<string, any>;
}> {
  try {
    const db = await getDb();
    const io = getRealtimeServer();

    // Get incident
    const selector = ObjectId.isValid(incidentId)
      ? { _id: new ObjectId(incidentId) }
      : { id: String(incidentId) };
    const incident = await db.collection('incidents').findOne(selector);

    if (!incident) {
      return { success: false, error: 'Incident not found' };
    }

    // Get user info
    const user = await db.collection('users').findOne({ _id: new ObjectId(escalatedBy) });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Determine escalation chain
    const userRoleLevel = ROLE_HIERARCHY[user.role as RoleName]?.level ?? 999;
    
    let escalationTargets: string[] = [];
    if (userRoleLevel >= 4) {
      // Field agent or patrol officer → escalate to dispatcher
      const dispatchers = await db
        .collection('users')
        .find({ role: 'dispatcher' })
        .toArray();
      escalationTargets = dispatchers.map((d) => String(d._id));
    } else if (userRoleLevel >= 2) {
      // Dispatcher → escalate to control room
      const commanders = await db
        .collection('users')
        .find({ role: 'control_room_commander' })
        .toArray();
      escalationTargets = commanders.map((c) => String(c._id));
    } else if (userRoleLevel >= 1) {
      // Control room → escalate to super admin
      const admins = await db
        .collection('users')
        .find({ role: 'super_admin' })
        .toArray();
      escalationTargets = admins.map((a) => String(a._id));
    }

    // Update incident escalation
    const escalationEntry = {
      escalatedBy,
      escalatedByRole: user.role,
      escalatedByEmail: user.email,
      reason: escalationReason,
      timestamp: new Date().toISOString(),
      targetRoles: getTargetRolesByLevel(userRoleLevel),
    };

    await db.collection('incidents').updateOne(
      selector,
      {
        $push: { escalations: escalationEntry },
        $set: { escalationLevel: userRoleLevel + 1, updatedAt: new Date().toISOString() },
      } as any
    );

    // Create notifications for escalation targets
    const notifications = escalationTargets.map((targetId) => ({
      recipientId: targetId,
      type: 'incident:escalated',
      title: `Incident Escalated`,
      message: `${incident.title} escalated by ${user.email}: ${escalationReason}`,
      data: { incidentId, escalationEntry },
      priority: 'high',
      createdAt: new Date(),
    }));

    if (notifications.length > 0) {
      await db.collection('notifications').insertMany(notifications);
    }

    const event = {
      incidentId,
      escalatedBy,
      escalatedByRole: user.role,
      reason: escalationReason,
      targetCount: escalationTargets.length,
      timestamp: new Date(),
    };

    // Broadcast escalation
    if (io) {
      io.emit('incidentEscalated', event);
      
      // Send direct notifications to targets
      escalationTargets.forEach((targetId) => {
        io.to(`user:${targetId}`).emit('notification', {
          type: 'incident:escalated',
          incidentId,
          reason: escalationReason,
        });
      });
    }

    // Log activity
    await logActivity({
      userId: escalatedBy,
      action: 'incident:escalated',
      meta: { incidentId, reason: escalationReason, targetCount: escalationTargets.length },
    });

    return { success: true, event };
  } catch (error) {
    console.error('Error escalating incident:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Delegate authority temporarily (e.g., Control Room Commander delegates to Dispatcher)
 */
export async function delegateAuthority(
  delegatedBy: string,
  delegatedTo: string,
  authority: string[], // Specific permissions to delegate
  expiresIn: number = 3600000 // 1 hour in ms
): Promise<{
  success: boolean;
  error?: string;
  delegationId?: string;
}> {
  try {
    const db = await getDb();
    const io = getRealtimeServer();

    // Verify both users exist
    const delegator = await db.collection('users').findOne({ _id: new ObjectId(delegatedBy) });
    const delegatee = await db.collection('users').findOne({ _id: new ObjectId(delegatedTo) });

    if (!delegator || !delegatee) {
      return { success: false, error: 'User not found' };
    }

    // Check hierarchy (delegator must outrank delegatee)
    const delegatorLevel = ROLE_HIERARCHY[delegator.role as RoleName]?.level ?? 999;
    const delegateeLevel = ROLE_HIERARCHY[delegatee.role as RoleName]?.level ?? 999;

    if (delegatorLevel >= delegateeLevel) {
      return { success: false, error: 'Cannot delegate to equal or higher rank' };
    }

    // Create delegation record
    const delegation = {
      delegatedBy,
      delegatedByRole: delegator.role,
      delegatedByEmail: delegator.email,
      delegatedTo,
      delegatedToRole: delegatee.role,
      delegatedToEmail: delegatee.email,
      authority,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresIn).toISOString(),
      status: 'active',
    };

    const result = await db.collection('delegations').insertOne(delegation);
    const delegationId = String(result.insertedId);

    // Notify delegatee
    if (io) {
      io.to(`user:${delegatedTo}`).emit('authorityDelegated', {
        delegatedBy,
        delegatedByEmail: delegator.email,
        authority,
        expiresAt: delegation.expiresAt,
      });
    }

    // Log activity
    await logActivity({
      userId: delegatedBy,
      action: 'role:authority:delegated',
      meta: { delegatedTo, authority, expiresIn },
    });

    return { success: true, delegationId };
  } catch (error) {
    console.error('Error delegating authority:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Helper: Get target roles for incident escalation
 */
function getTargetRolesByLevel(currentLevel: number): string[] {
  if (currentLevel >= 4) return ['dispatcher'];
  if (currentLevel >= 3) return ['dispatcher', 'control_room_commander'];
  if (currentLevel >= 2) return ['control_room_commander'];
  return ['super_admin'];
}

/**
 * Get organizational structure (for SUPER_ADMIN dashboard)
 */
export async function getOrganizationalStructure(): Promise<Record<string, any>> {
  try {
    const db = await getDb();

    const users = await db.collection('users').find({}).toArray();
    const teams = await db.collection('teams').find({}).toArray();
    const regions = await db.collection('regions').find({}).toArray();

    // Organize by role
    const byRole: Record<string, any> = {};
    users.forEach((user) => {
      const role = user.role;
      if (!byRole[role]) {
        byRole[role] = [];
      }
      byRole[role].push({
        userId: String(user._id),
        email: user.email,
        status: user.suspended ? 'suspended' : 'active',
        assignedToRegion: user.region,
      });
    });

    return {
      users: {
        total: users.length,
        byRole,
      },
      teams: {
        total: teams.length,
        teams: teams.map((t) => ({
          teamId: String(t._id),
          name: t.name,
          supervisor: t.supervisor,
          memberCount: t.members?.length || 0,
        })),
      },
      regions: {
        total: regions.length,
        regions: regions.map((r) => ({
          regionId: String(r._id),
          name: r.name,
          officers: r.officers?.length || 0,
        })),
      },
    };
  } catch (error) {
    console.error('Error getting organizational structure:', error);
    return {};
  }
}
