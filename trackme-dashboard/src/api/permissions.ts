// Advanced permissions utility for fine-grained access control
// Usage: hasPermission(user, 'incident:assign')

const PERMISSIONS = {
  'super_admin': [
    'incident:*', 'user:*', 'analytics:*', 'device:*', 'geofence:*', 'admin:*'
  ],
  'admin': [
    'incident:view', 'incident:assign', 'user:view', 'analytics:view', 'device:view', 'geofence:view', 'admin:view'
  ],
  'user': [
    'incident:view', 'analytics:view', 'device:view', 'geofence:view'
  ]
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
