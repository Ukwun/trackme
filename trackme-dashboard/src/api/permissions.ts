// Advanced permissions utility for fine-grained access control
// Usage: hasPermission(user, 'incident:assign')

const PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    'incident:*', 'user:*', 'analytics:*', 'device:*', 'geofence:*', 'admin:*'
  ],
  control_room: [
    'device:create',
    'incident:view', 'incident:assign', 'incident:update', 'incident:close',
    'geofence:view', 'geofence:create', 'geofence:update',
    'unit:view', 'unit:status',
    'analytics:view',
    'device:view'
  ],
  dispatcher: [
    'device:create',
    'incident:create',
    'incident:view', 'incident:assign', 'incident:update',
    'unit:view', 'unit:assign', 'unit:status',
    'device:view',
    'communications:send',
  ],
  patrol_officer: [
    'incident:create',
    'incident:view', 'incident:update', 'incident:status',
    'location:report', 'status:update', 'device:view',
    'unit:view',
  ],
  analyst: [
    'analytics:view', 'analytics:export', 'analytics:report',
    'incident:view', 'device:view',
  ],
  field_agent: [
    'incident:create',
    'incident:view', 'incident:update', 'location:report',
    'task:view', 'task:update', 'device:view',
  ],
};

export function hasPermission(user: { role: string }, permission: string) {
  if (!user?.role) return false;
  const perms = PERMISSIONS[user.role] || [];
  if (perms.includes(permission)) return true;
  // Wildcard match
  const [domain] = permission.split(':');
  return perms.includes(`${domain}:*`);
}

export function getPermissions(role: string) {
  return PERMISSIONS[role] || [];
}
