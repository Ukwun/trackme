/**
 * TrackMe Role Hierarchy System
 * 
 * Implements realistic organizational hierarchy with:
 * - Authority levels and command chain
 * - Role transition rules (realistic promotions/demotions)
 * - Role-based permission inheritance
 * - Real-time hierarchy notifications
 * - Audit trail for role changes
 */

export enum RoleLevel {
  SUPER_ADMIN = 0,           // 👑 System authority
  CONTROL_ROOM_COMMANDER = 1, // 🏛️ Tactical command
  DISPATCHER = 2,            // 📡 Dispatch operations
  FIELD_SUPERVISOR = 3,      // 👷 Field operations
  PATROL_OFFICER = 4,        // 🚗 Field agent/officer
}

export type RoleName = 
  | 'super_admin'
  | 'control_room_commander'
  | 'dispatcher'
  | 'field_supervisor'
  | 'patrol_officer'
  | 'field_agent';

const ROLE_ALIASES: Record<string, RoleName> = {
  control_room: 'control_room_commander',
};

export function normalizeRoleName(role: string | null | undefined): RoleName | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();
  if (normalized in ROLE_ALIASES) {
    return ROLE_ALIASES[normalized];
  }
  if (normalized in ROLE_HIERARCHY) {
    return normalized as RoleName;
  }
  return null;
}

/**
 * Role Hierarchy Definition
 * Maps each role to its authority level and properties
 */
export const ROLE_HIERARCHY: Record<RoleName, {
  level: RoleLevel;
  title: string;
  description: string;
  icon: string;
  color: string;
  canManage: RoleName[]; // Roles this role can manage
  managedBy: RoleName[]; // Roles that can manage this role
  realTimeCapabilities: string[];
  operationalDomain: string;
}> = {
  super_admin: {
    level: RoleLevel.SUPER_ADMIN,
    title: 'Super Admin',
    description: 'Highest authority in the system. Manages entire infrastructure.',
    icon: '👑',
    color: 'blue',
    canManage: ['control_room_commander', 'dispatcher', 'field_supervisor', 'patrol_officer', 'field_agent'],
    managedBy: [],
    realTimeCapabilities: [
      'system:monitor',
      'user:create',
      'user:delete',
      'role:assign',
      'role:revoke',
      'device:register',
      'device:disable',
      'incident:view:all',
      'analytics:access:all',
      'audit:view:all',
      'system:config',
    ],
    operationalDomain: 'System-wide oversight',
  },

  control_room_commander: {
    level: RoleLevel.CONTROL_ROOM_COMMANDER,
    title: 'Control Room Commander',
    description: 'Tactical command center. Oversees incident management and unit coordination.',
    icon: '🏛️',
    color: 'purple',
    canManage: ['dispatcher', 'field_supervisor', 'patrol_officer'],
    managedBy: ['super_admin'],
    realTimeCapabilities: [
      'incident:create',
      'incident:assign',
      'incident:update:status',
      'incident:close',
      'geofence:create',
      'geofence:edit',
      'unit:coordinate',
      'communications:broadcast',
      'device:view:region',
      'analytics:view:regional',
      'role:delegate', // Can delegate tasks to lower roles
    ],
    operationalDomain: 'Regional/Tactical incident command',
  },

  dispatcher: {
    level: RoleLevel.DISPATCHER,
    title: 'Dispatcher',
    description: 'Dispatch operations. Manages unit assignments and communication relay.',
    icon: '📡',
    color: 'green',
    canManage: ['field_supervisor', 'patrol_officer'],
    managedBy: ['super_admin', 'control_room_commander'],
    realTimeCapabilities: [
      'incident:assign',
      'incident:update:status',
      'unit:assign',
      'communications:send',
      'device:view:assigned',
      'queue:manage',
      'task:create',
      'status:monitor',
    ],
    operationalDomain: 'Dispatch queue and unit assignment',
  },

  field_supervisor: {
    level: RoleLevel.FIELD_SUPERVISOR,
    title: 'Field Supervisor',
    description: 'Field operations leadership. Coordinates patrol officers and manages field incidents.',
    icon: '👷',
    color: 'amber',
    canManage: ['patrol_officer', 'field_agent'],
    managedBy: ['super_admin', 'control_room_commander', 'dispatcher'],
    realTimeCapabilities: [
      'incident:view:assigned',
      'incident:update:status',
      'unit:monitor',
      'communications:local',
      'device:view:team',
      'task:assign:local',
      'location:monitor:team',
      'status:report',
    ],
    operationalDomain: 'Field team operations',
  },

  patrol_officer: {
    level: RoleLevel.PATROL_OFFICER,
    title: 'Patrol Officer',
    description: 'Field responder. Executes assigned tasks and reports location/status.',
    icon: '🚗',
    color: 'yellow',
    canManage: [],
    managedBy: ['super_admin', 'control_room_commander', 'dispatcher', 'field_supervisor'],
    realTimeCapabilities: [
      'incident:view:assigned',
      'incident:update:status',
      'location:report',
      'status:update',
      'communications:receive',
      'task:view',
      'device:view:self',
    ],
    operationalDomain: 'Field response operations',
  },

  field_agent: {
    level: RoleLevel.PATROL_OFFICER, // Same level as patrol officer
    title: 'Field Agent',
    description: 'Field operative. Simple task executor with basic location reporting.',
    icon: '🔷',
    color: 'cyan',
    canManage: [],
    managedBy: ['super_admin', 'control_room_commander', 'dispatcher', 'field_supervisor', 'patrol_officer'],
    realTimeCapabilities: [
      'task:view',
      'location:report',
      'status:update',
      'communications:receive',
      'device:view:self',
    ],
    operationalDomain: 'Field task execution',
  },
};

/**
 * Real-time role relationship capabilities
 * Defines what actions trigger real-time notifications
 */
export const ROLE_RELATIONSHIP_EVENTS = {
  role_changed: 'user:role:changed',           // User promoted/demoted
  role_delegated: 'role:delegated',            // Superior delegates task
  chain_of_command_alert: 'hierarchy:alert',   // Alert up/down chain
  authority_override: 'hierarchy:override',    // Superior overrides decision
  region_assignment: 'role:region:assigned',   // Regional assignment
  team_joined: 'role:team:joined',             // User added to team
  team_left: 'role:team:left',                 // User removed from team
  escalation: 'incident:escalated',            // Incident escalated up hierarchy
};

/**
 * Get role hierarchy info
 */
export function getRoleInfo(role: RoleName) {
  return ROLE_HIERARCHY[role];
}

export function getRoleInfoByName(role: string | null | undefined) {
  const normalized = normalizeRoleName(role);
  return normalized ? ROLE_HIERARCHY[normalized] : null;
}

/**
 * Check if role A can manage role B
 */
export function canManageRole(managerRole: RoleName, targetRole: RoleName): boolean {
  const manager = ROLE_HIERARCHY[managerRole];
  if (!manager) return false;
  if (managerRole === targetRole) return false;
  return manager.canManage.includes(targetRole);
}

/**
 * Get authority level (0 = highest, 4 = lowest)
 */
export function getAuthorityLevel(role: RoleName): RoleLevel {
  return ROLE_HIERARCHY[role]?.level ?? RoleLevel.PATROL_OFFICER;
}

/**
 * Check if role A outranks role B
 */
export function outranks(higherRole: RoleName, lowerRole: RoleName): boolean {
  return getAuthorityLevel(higherRole) < getAuthorityLevel(lowerRole);
}

/**
 * Get all roles that outrank a given role
 */
export function getSuperiors(role: RoleName): RoleName[] {
  const level = getAuthorityLevel(role);
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, info]) => info.level < level)
    .map(([name]) => name as RoleName);
}

/**
 * Get all roles subordinate to a given role
 */
export function getSubordinates(role: RoleName): RoleName[] {
  const level = getAuthorityLevel(role);
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, info]) => info.level > level)
    .map(([name]) => name as RoleName);
}

/**
 * Get direct chain of command (superior only)
 */
export function getDirectSuperior(role: RoleName): RoleName | null {
  const level = getAuthorityLevel(role);
  if (level === RoleLevel.SUPER_ADMIN) return null;

  const superiors = Object.entries(ROLE_HIERARCHY)
    .filter(([_, info]) => info.level < level)
    .sort(([_, a], [__, b]) => b.level - a.level); // Highest level first

  return superiors.length > 0 ? (superiors[0][0] as RoleName) : null;
}

/**
 * Validate role transition (realistic organizational rules)
 */
export function canTransitionRole(
  currentRole: RoleName,
  newRole: RoleName,
  performedBy: RoleName
): {
  allowed: boolean;
  reason?: string;
} {
  // Super admin can assign any role
  if (performedBy === 'super_admin') {
    return { allowed: true };
  }

  // Can only manage subordinates
  if (!canManageRole(performedBy, newRole)) {
    return {
      allowed: false,
      reason: `${performedBy} cannot assign ${newRole}. Insufficient authority.`,
    };
  }

  // Cannot demote yourself
  if (currentRole === performedBy) {
    return { allowed: false, reason: 'Cannot change your own role.' };
  }

  // Cannot promote someone above your level
  if (getAuthorityLevel(newRole) < getAuthorityLevel(performedBy)) {
    return {
      allowed: false,
      reason: `Cannot promote user above your authority level.`,
    };
  }

  return { allowed: true };
}

/**
 * Get all permissions that should be inherited by a role
 * based on hierarchy position
 */
export function getInheritedPermissions(role: RoleName): string[] {
  const info = ROLE_HIERARCHY[role];
  if (!info) return [];

  const permissions = [...info.realTimeCapabilities];

  // Lower roles inherit some permissions from higher roles
  if (role !== 'super_admin') {
    const superiors = getSuperiors(role);
    // Inherit view/report permissions from all superiors
    superiors.forEach((superior) => {
      const superiorInfo = ROLE_HIERARCHY[superior];
      const viewPerms = superiorInfo.realTimeCapabilities.filter((p) =>
        p.includes(':view') || p.includes(':report') || p.includes(':monitor')
      );
      permissions.push(...viewPerms);
    });
  }

  return [...new Set(permissions)]; // Remove duplicates
}

/**
 * Check role relationship for real-time access
 */
export function hasRoleRelationship(
  userRole: RoleName,
  targetRole: RoleName,
  relationshipType: 'manage' | 'view' | 'communicate'
): boolean {
  const userLevel = getAuthorityLevel(userRole);
  const targetLevel = getAuthorityLevel(targetRole);

  switch (relationshipType) {
    case 'manage':
      return canManageRole(userRole, targetRole);
    case 'view':
      // Can view equals or subordinate roles
      return userLevel <= targetLevel;
    case 'communicate':
      // Can communicate with equals, superiors, and subordinates
      return true; // Full hierarchy can communicate
    default:
      return false;
  }
}

/**
 * Get notification recipients based on hierarchy
 */
export function getNotificationRecipients(
  event: string,
  triggeringRole: RoleName,
  scope: 'team' | 'region' | 'system'
): RoleName[] {
  const role = ROLE_HIERARCHY[triggeringRole];
  if (!role) return [];

  switch (scope) {
    case 'team':
      // Notify direct superiors
      return role.managedBy;
    case 'region':
      // Notify region command chain
      return getSuperiors(triggeringRole);
    case 'system':
      // Notify only super admin
      return ['super_admin'];
    default:
      return [];
  }
}
