# TrackMe Complete Role Hierarchy System

## 🏛️ ORGANIZATIONAL HIERARCHY STRUCTURE

```
                          👑 SUPER ADMIN
                          (Authority: 0)
                    System-wide Oversight
                                ↓
                   🏛️ CONTROL ROOM COMMANDER
                         (Authority: 1)
                    Tactical Command & Control
                                ↓
                         📡 DISPATCHER
                         (Authority: 2)
                    Dispatch Operations
                                ↓
                      👷 FIELD SUPERVISOR
                         (Authority: 3)
                    Field Team Leadership
                                ↓
                    🚗 PATROL OFFICER / 🔷 FIELD AGENT
                         (Authority: 4)
                    Field Response & Task Execution
```

---

## 📊 ROLE HIERARCHY RELATIONSHIPS

### 1️⃣ SUPER ADMIN 👑
**Authority Level:** 0 (Highest)

**Description:** Highest authority in the system. Manages entire infrastructure.

**What They Control:**
- ✅ All users (create, suspend, modify)
- ✅ All devices (register, disable, transfer)
- ✅ All incidents (view, assign, close)
- ✅ All zones and geofences
- ✅ System configuration
- ✅ All analytics and reports
- ✅ Audit logs and compliance

**Can Manage:**
- Control Room Commander
- Dispatcher
- Field Supervisor
- Patrol Officer
- Field Agent

**Managed By:** 
- No one (highest authority)

**Real-Time Capabilities:**
- `system:monitor` - Monitor entire system
- `user:create` - Create new users
- `user:delete` - Delete users
- `role:assign` - Assign any role
- `role:revoke` - Revoke any role
- `device:register` - Register devices
- `device:disable` - Disable devices
- `incident:view:all` - View all incidents
- `analytics:access:all` - Full analytics access
- `audit:view:all` - View all audit logs
- `system:config` - Configure system settings

**Operational Domain:** System-wide oversight and infrastructure management

**Real-Time Sync:** 
- Receives all system events
- Can broadcast system-wide announcements
- Real-time access to all metrics

---

### 2️⃣ CONTROL ROOM COMMANDER 🏛️
**Authority Level:** 1

**Description:** Tactical command center. Oversees incident management and unit coordination.

**What They Control:**
- ✅ Regional incident management
- ✅ Unit coordination and status
- ✅ Geofence creation and management
- ✅ Communications broadcast
- ✅ Device access for region
- ✅ Team assignments
- ✅ Delegation to subordinates

**Can Manage:**
- Dispatcher
- Field Supervisor
- Patrol Officer

**Managed By:**
- Super Admin

**Real-Time Capabilities:**
- `incident:create` - Create incidents
- `incident:assign` - Assign incidents
- `incident:update:status` - Update incident status
- `incident:close` - Close incidents
- `geofence:create` - Create geofences
- `geofence:edit` - Edit geofences
- `unit:coordinate` - Coordinate units
- `communications:broadcast` - Send broadcasts
- `device:view:region` - View regional devices
- `analytics:view:regional` - Regional analytics
- `role:delegate` - Delegate tasks to subordinates

**Operational Domain:** Regional/Tactical incident command

**Real-Time Sync:**
- Real-time incident feed (assigned region)
- Unit status updates
- Subordinate status alerts
- Escalation notifications

**Relationships:**
- Oversees Dispatchers and Field Supervisors
- Receives alerts from subordinates
- Reports to Super Admin
- Cannot be overridden except by Super Admin

---

### 3️⃣ DISPATCHER 📡
**Authority Level:** 2

**Description:** Dispatch operations. Manages unit assignments and communication relay.

**What They Control:**
- ✅ Unit assignments
- ✅ Incident status updates
- ✅ Queue management
- ✅ Task creation
- ✅ Communications relay
- ✅ Device tracking

**Can Manage:**
- Field Supervisor
- Patrol Officer

**Managed By:**
- Super Admin
- Control Room Commander

**Real-Time Capabilities:**
- `incident:assign` - Assign incidents
- `incident:update:status` - Update status
- `unit:assign` - Assign units
- `communications:send` - Send communications
- `device:view:assigned` - View assigned devices
- `queue:manage` - Manage dispatch queue
- `task:create` - Create tasks
- `status:monitor` - Monitor status

**Operational Domain:** Dispatch queue and unit assignment

**Real-Time Sync:**
- Real-time incident queue
- Unit assignment updates
- Field team status
- Communication relay

**Relationships:**
- Receives orders from Control Room
- Supervises Field Teams
- Coordinates with other Dispatchers
- Cannot override Control Room decisions

---

### 4️⃣ FIELD SUPERVISOR 👷
**Authority Level:** 3

**Description:** Field operations leadership. Coordinates patrol officers and manages field incidents.

**What They Control:**
- ✅ Local team coordination
- ✅ Field incident status
- ✅ Local task assignments
- ✅ Team location monitoring
- ✅ Local communications

**Can Manage:**
- Patrol Officer
- Field Agent

**Managed By:**
- Super Admin
- Control Room Commander
- Dispatcher

**Real-Time Capabilities:**
- `incident:view:assigned` - View assigned incidents
- `incident:update:status` - Update incident status
- `unit:monitor` - Monitor team
- `communications:local` - Local communications
- `device:view:team` - View team devices
- `task:assign:local` - Assign local tasks
- `location:monitor:team` - Monitor team locations
- `status:report` - Report team status

**Operational Domain:** Field team operations and coordination

**Real-Time Sync:**
- Real-time team location
- Team member status
- Incident assignments
- Task coordination

**Relationships:**
- Receives assignments from Dispatcher
- Coordinates with Patrol Officers
- Escalates critical incidents
- Provides real-time field updates

---

### 5️⃣ PATROL OFFICER 🚗
**Authority Level:** 4 (Lowest)

**Description:** Field responder. Executes assigned tasks and reports location/status.

**What They Control:**
- ✅ Own location reporting
- ✅ Own status updates
- ✅ Assigned incident updates
- ✅ Task completion

**Can Manage:**
- (None - field responder)

**Managed By:**
- Super Admin
- Control Room Commander
- Dispatcher
- Field Supervisor

**Real-Time Capabilities:**
- `incident:view:assigned` - View assigned incidents
- `incident:update:status` - Update status
- `location:report` - Report location
- `status:update` - Update status
- `communications:receive` - Receive communications
- `task:view` - View tasks
- `device:view:self` - View own device

**Operational Domain:** Field response operations

**Real-Time Sync:**
- Real-time location tracking
- Incident assignments
- Task notifications
- Status updates
- Communications from control room

**Relationships:**
- Receives assignments from supervisor
- Provides real-time field updates
- Escalates incidents as needed
- Follows supervisor instructions

---

### 6️⃣ FIELD AGENT 🔷
**Authority Level:** 4 (Same as Patrol Officer)

**Description:** Field operative. Simple task executor with basic location reporting.

**What They Control:**
- ✅ Own location reporting
- ✅ Own status updates
- ✅ Task completion

**Can Manage:**
- (None - simple field operative)

**Managed By:**
- Super Admin
- Control Room Commander
- Dispatcher
- Field Supervisor
- Patrol Officer

**Real-Time Capabilities:**
- `task:view` - View tasks
- `location:report` - Report location
- `status:update` - Update status
- `communications:receive` - Receive communications
- `device:view:self` - View own device

**Operational Domain:** Field task execution

**Real-Time Sync:**
- Task notifications
- Location reporting
- Status updates
- Communications

---

## 🔗 ROLE RELATIONSHIP MATRIX

| Relationship | Super Admin | Control Room | Dispatcher | Field Supervisor | Patrol Officer | Field Agent |
|---|---|---|---|---|---|---|
| **Manages** | Everyone | Dispatcher+ | Field Team | Patrol Officer | - | - |
| **Managed By** | - | Super Admin | Super Admin+ | Super Admin+ | Supervisor+ | Supervisor+ |
| **Can View** | All | Regional | Assigned | Team | Own+Assigned | Own+Assigned |
| **Can Escalate** | N/A | To Super Admin | To Control Room | To Dispatcher | To Supervisor | To Supervisor |
| **Real-Time Access** | System-wide | Regional | Queue+Units | Team+Incidents | Assigned Tasks | Tasks |
| **Communication** | Broadcast | Regional | Unit Queue | Team Radio | Dispatcher | Team Radio |

---

## ⚡ REAL-TIME SYNCHRONIZATION SYSTEM

### Event Broadcasting

The system broadcasts role changes in real-time via Socket.IO:

```typescript
// When a user's role changes:
1. Role change validated against hierarchy
2. User record updated in database
3. Real-time event broadcast to:
   - User (new permissions applied)
   - Old role team (member left)
   - New role team (member joined)
   - Superiors in chain (hierarchy alert)
   - Audit log (recorded for compliance)
```

### Real-Time Events

#### `roleChange`
```typescript
{
  userId: string;
  newRole: RoleName;
  previousRole: RoleName;
  changedAt: Date;
}
```

#### `roleUpdated` (to user)
```typescript
{
  newRole: RoleName;
  permissions: string[];
  timestamp: Date;
}
```

#### `hierarchy:alert` (to superiors)
```typescript
{
  type: 'roleChange' | 'incidentEscalation' | 'authorityOverride';
  userId: string;
  newRole?: RoleName;
  message: string;
  timestamp: Date;
}
```

### Permission Synchronization

When a user's role changes:

1. **Immediate:** User's Socket.IO connection receives `permissionsUpdated` event
2. **Automatic:** Client app reloads permissions from server
3. **Real-time:** UI updates to show only available actions
4. **Secure:** All API calls validate new permissions

---

## 🔐 ROLE TRANSITION RULES

### Realistic Promotion Rules

Only certain transitions are allowed:

```
field_agent → patrol_officer (supervisor approval)
patrol_officer → field_supervisor (control room approval)
field_supervisor → dispatcher (control room approval)
dispatcher → control_room_commander (super admin only)
control_room_commander → super_admin (super admin only)
```

### Demotion Rules

- Can only be performed by superior
- Cannot demote yourself
- Creates audit entry for compliance
- Triggers real-time notifications

### Authority Rules

- Cannot promote someone above your authority level
- Super Admin can perform any transition
- Transitions respect organizational hierarchy
- All transitions validated and audited

---

## 🎯 REAL-TIME HIERARCHY CAPABILITIES

### 1. Real-Time Team Coordination

```typescript
// Field Supervisor coordinates team in real-time
hierarchy:teamStatus → Updates all supervisors
hierarchy:memberStatus → Broadcasts team member status
hierarchy:locationUpdate → Real-time location sync
```

### 2. Escalation Chain

```typescript
Patrol Officer reports incident
  → Field Supervisor receives notification
    → Dispatcher alerted if needed
      → Control Room escalates if needed
        → Super Admin receives system alert
```

### 3. Authority Override

```typescript
Control Room Commander can override Dispatcher decision
  → Dispatcher notified in real-time
  → Audit logged for compliance
  → New decision broadcast to field
```

### 4. Delegation System

```typescript
Control Room delegates task to Dispatcher
  → Dispatcher receives delegated task
  → Can further delegate to Field Supervisor
  → Field Supervisor assigns to Patrol Officer
```

---

## 📋 AUDIT & COMPLIANCE

### Role Change Audit

Every role transition is logged with:
- Who changed it (userId + role)
- What changed (old role → new role)
- When it happened (timestamp)
- Why it happened (reason/comment)
- Status (approved/rejected/pending)

### Access Patterns

Real-time logging captures:
- Authority overrides
- Cross-hierarchy communications
- Escalations
- Permission usage

### Compliance Reports

Super Admin can generate:
- Role audit history (per user)
- Organizational structure reports
- Authority usage patterns
- Escalation timelines

---

## 🚀 API ENDPOINTS

### User Management (`/api/user`)

**PATCH** - Update user role with hierarchy validation
```typescript
POST /api/user
{
  userId: string;
  role: RoleName;
  reason?: string;
}
```

### Hierarchy Operations (`/api/hierarchy`)

**GET** - Query hierarchy information
```typescript
GET /api/hierarchy?query=structure
GET /api/hierarchy?query=statistics
GET /api/hierarchy?query=audit&userId=xxx
GET /api/hierarchy?query=superiors
GET /api/hierarchy?query=subordinates
```

**POST** - Validate transitions and check relationships
```typescript
POST /api/hierarchy
{
  action: 'validate-transition' | 'check-relationships';
  data: {...}
}
```

---

## 💻 CLIENT INTEGRATION

### Real-Time Socket.IO Events

```typescript
// Subscribe to role updates
socket.on('roleUpdated', (event) => {
  // Update permissions in client
  updateUserPermissions(event.permissions);
});

// Listen for organizational changes
socket.on('hierarchy:memberJoined', (event) => {
  // Update team display
});

// Receive alerts
socket.on('hierarchy:alert', (alert) => {
  // Show alert to user
});
```

### Permission-Based UI Rendering

```typescript
// Only show actions user can perform
if (hasPermission(role, 'incident:assign')) {
  renderAssignButton();
}

// Real-time updates apply immediately
onPermissionsUpdated(() => {
  reRenderUI();
});
```

---

## 🔄 WORKFLOW EXAMPLES

### Example 1: New Officer Hire

```
1. Super Admin creates new user (patrol_officer role)
2. System broadcasts hierarchy:memberJoined event
3. Field Supervisor notified in real-time
4. Officer sees patrol_officer dashboard
5. Permissions sync automatically
```

### Example 2: Promotion to Supervisor

```
1. Control Room Commander initiates role change
2. Hierarchy system validates (officer→supervisor allowed)
3. Database updates role
4. Real-time events broadcast:
   - Officer receives permissionsUpdated
   - Old team notified officer left
   - New team notified supervisor joined
   - Superiors alerted to change
5. Officer's dashboard refreshes to supervisor view
```

### Example 3: Incident Escalation

```
1. Patrol Officer updates incident status
2. Field Supervisor receives update in real-time
3. If critical, Supervisor escalates to Dispatcher
4. Dispatcher receives hierarchy:incidentEscalated event
5. Option to escalate further to Control Room
6. Control Room receives system alert
7. All stakeholders updated in real-time
```

---

## ✅ IMPLEMENTATION STATUS

- ✅ Role hierarchy definitions
- ✅ Permission inheritance system
- ✅ Real-time Socket.IO synchronization
- ✅ Role transition validation
- ✅ Audit logging
- ✅ API endpoints for hierarchy operations
- ✅ Organizational structure queries
- ✅ Role change broadcasting
- ✅ Authority override logging
- ✅ Delegation system
- ✅ UI visualization component
- ✅ Real-time team status tracking

---

## 🎯 REALISTIC USER EXPERIENCE

This system creates a **realistic, hierarchical organization** where:

1. **Clear Authority:** Everyone knows who reports to whom
2. **Real-time Coordination:** Changes propagate instantly across the system
3. **Realistic Workflows:** Escalation, delegation, oversight all work as in real organizations
4. **Audit Trail:** Complete compliance and accountability
5. **Dynamic Teams:** Team composition updates in real-time
6. **Natural Progression:** Career advancement through hierarchy (field agent → patrol officer → supervisor → dispatcher → commander → admin)

This is **NOT just a permissions system** — it's a **complete organizational management platform** that reflects how real emergency services operate.

---

**Created:** May 9, 2026  
**Status:** Production-Ready  
**Real-Time:** Socket.IO Broadcasting Active
