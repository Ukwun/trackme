// Advanced permissions utility for fine-grained access control with role hierarchy
// Usage: hasPermission(user, 'device:transfer:ownership')

import { normalizeRoleName } from './roleHierarchy';

/**
 * Comprehensive permissions matrix aligned with role hierarchy
 * Each role inherits capabilities based on their operational domain
 */
const PERMISSIONS: Record<string, string[]> = {
  // 👑 SUPER ADMIN - System-wide authority, no restrictions
  super_admin: [
    // System-wide access
    'system:*',
    'user:*',
    'role:*',
    'device:*',
    'incident:*',
    'analytics:*',
    'geofence:*',
    'admin:*',
    'audit:*',
    'region:*',
    
    // Specific device management capabilities
    'device:register:phone',
    'device:register:imei',
    'device:edit:metadata',
    'device:disable',
    'device:transfer:ownership',
    'device:share:any',
    
    // Specific user management
    'user:create',
    'user:suspend',
    'user:assign:permissions',
    'user:create:regions',
    'user:manage:all',
    
    // Intelligence access
    'intelligence:live:tracking',
    'intelligence:playback',
    'intelligence:export:reports',
    'intelligence:access:all',
    
    // Real-time capabilities
    'realtime:view:all',
    'realtime:command:all',
  ],

  // 🏛️ CONTROL ROOM COMMANDER - Tactical incident command
  control_room_commander: [
    'incident:*',
    'device:view:all',
    'device:create',
    'geofence:*',
    'user:view',
    'analytics:view',
    'unit:view',
    'unit:coordinate',
    'communications:broadcast',
    'role:delegate',
    'intelligence:live:tracking',
    'intelligence:playback',
    'incident:escalate',
  ],

  // 📡 DISPATCHER - Dispatch operations
  dispatcher: [
    'device:create',
    'device:view:assigned',
    'incident:create',
    'incident:view',
    'incident:assign',
    'incident:update:status',
    'geofence:view',
    'unit:view',
    'unit:assign',
    'unit:status',
    'communications:send',
    'queue:manage',
    'task:create',
  ],

  // 👷 FIELD SUPERVISOR - Field operations leadership
  field_supervisor: [
    'incident:view:assigned',
    'incident:update:status',
    'device:view:team',
    'unit:view',
    'unit:monitor',
    'communications:local',
    'task:assign:local',
    'location:monitor:team',
    'status:report',
  ],

  // 🚗 PATROL OFFICER / FIELD AGENT - Field responders
  patrol_officer: [
    'incident:create',
    'incident:view:assigned',
    'incident:update:status',
    'device:view:self',
    'location:report',
    'status:update',
    'communications:receive',
    'task:view',
  ],

  // 🔷 FIELD AGENT - Simple task executor
  field_agent: [
    'task:view',
    'location:report',
    'status:update',
    'communications:receive',
    'device:view:self',
  ],

  // 📊 ANALYST - Data analysis and reporting
  analyst: [
    'analytics:view',
    'analytics:export',
    'analytics:report',
    'incident:view',
    'device:view',
    'intelligence:playback',
  ],
};

export function hasPermission(user: { role: string }, permission: string) {
  if (!user?.role) return false;
  const normalizedRole = normalizeRoleName(user.role) ?? user.role;
  const perms = PERMISSIONS[normalizedRole] || [];
  if (perms.includes(permission)) return true;
  
  // Wildcard match (e.g., 'user:*' matches 'user:create')
  const [domain] = permission.split(':');
  return perms.includes(`${domain}:*`);
}

export function getPermissions(role: string) {
  const normalizedRole = normalizeRoleName(role) ?? role;
  return PERMISSIONS[normalizedRole] || [];
}

/**
 * Check if a user can perform an action on another user
 * (considering role hierarchy)
 */
export function canManageUser(managerRole: string, targetRole: string): boolean {
  const manager = normalizeRoleName(managerRole) ?? managerRole;
  const target = normalizeRoleName(targetRole) ?? targetRole;

  // Super admin can manage anyone
  if (manager === 'super_admin') return true;
  
  // Control room can manage dispatchers and lower
  if (manager === 'control_room_commander' && 
      ['dispatcher', 'field_supervisor', 'patrol_officer', 'field_agent', 'analyst'].includes(target)) {
    return true;
  }
  
  // Dispatcher can manage field supervisors and officers
  if (manager === 'dispatcher' && 
      ['field_supervisor', 'patrol_officer', 'field_agent'].includes(target)) {
    return true;
  }
  
  // Field supervisor can manage patrol officers and field agents
  if (manager === 'field_supervisor' && 
      ['patrol_officer', 'field_agent'].includes(target)) {
    return true;
  }
  
  return false;
}
