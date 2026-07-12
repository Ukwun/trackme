# TrackMe Complete Role Hierarchy & Real-Time Relationships

## System Overview

TrackMe implements a realistic organizational hierarchy for patrol/field operations with **5 role levels**, each with distinct **authority**, **operational domain**, and **real-time capabilities**.

---

## 🏛️ Role Hierarchy Structure

```
┌─────────────────────────────────────────────────────────────┐
│ 👑 SUPER ADMIN (Level 0)                                    │
│ Highest authority - System infrastructure & policy control  │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
    ┌────▼─────────────────────────┐
    │ 🏛️ CONTROL ROOM COMMANDER │
    │    (Level 1)                │
    │ Tactical command center     │
    └────┬──────────────┬──────────┘
         │              │
    ┌────▼──────┐  ┌───▼──────────┐
    │   📡       │  │ 👷          │
    │ DISPATCHER │  │ FIELD       │
    │ (Level 2)  │  │ SUPERVISOR  │
    │            │  │ (Level 3)   │
    └────┬───────┘  └───┬─────────┘
         │              │
         └──────┬───────┘
                │
         ┌──────▼──────────────┐
         │ 🚗 PATROL OFFICER   │
         │    / FIELD AGENT    │
         │    (Level 4)        │
         │ Field responders    │
         └─────────────────────┘
```

---

## 👑 SUPER ADMIN (Level 0)

### Authority
**Absolute system authority** - No restrictions, no superiors.

### Primary Responsibilities
- System infrastructure management
- User role assignment and governance
- Device registration and distribution
- System monitoring and compliance
- Policy enforcement
- Audit trail review

### Specific Capabilities

#### Device Management ✅
- `device:register:phone` - Register new phone numbers
- `device:register:imei` - Register IMEI codes  
- `device:edit:metadata` - Edit device information (manufacturer, model, OS version)
- `device:disable` - Disable devices
- `device:transfer:ownership` - Transfer device ownership to other users
- `device:view:all` - View ALL devices system-wide (no filtering)
- `device:share:any` - Share devices with any user or entire role group

#### User Management ✅
- `user:create` - Create new user accounts
- `user:suspend` - Suspend/disable user accounts
- `user:assign:permissions` - Assign specific permissions to users
- `user:create:regions` - Create organizational regions/zones
- `user:manage:all` - Full user lifecycle management

#### Intelligence Access ✅
- `intelligence:live:tracking` - Real-time live location tracking of ALL devices
- `intelligence:playback` - Historical playback of incident timelines and unit locations
- `intelligence:export:reports` - Export comprehensive system reports

#### System Oversight ✅
- `system:*` - All system-level operations
- `role:*` - Role management, hierarchy changes
- `admin:*` - Administrative operations
- `audit:*` - Full audit log access
- `region:*` - Region management

#### Real-Time Capabilities ✅
- Live dashboard: All devices, all incidents, all users
- Real-time notifications of role changes across organization
- System health metrics (uptime, error rates, performance)
- User login/activity tracking in real-time
- Incident escalation alerts
- Device status monitoring

### Real-Time Data Visibility

```
SUPER ADMIN Dashboard Receives:
├─ Every location-update (all devices, all users)
├─ Every incident-update (creation, assignment, status changes)
├─ Every user-login (authentication events)
├─ Every role-changed (promotion/demotion of any user)
├─ Every device-registered (new devices)
├─ Every region-updated (zone/jurisdiction changes)
├─ System health metrics (CPU, memory, DB performance)
└─ Audit events (all actions by all users)

Real-Time Events SUPER ADMIN Emits:
├─ Create user → Socket broadcasts to team
├─ Disable device → All users informed
├─ Transfer device → Owner and new owner notified
├─ Change region → Regional commanders notified
├─ Create role policy → All relevant users notified
└─ System alerts → Critical broadcasts to all
```

### API Endpoints

```
POST   /api/regions                # Create region/zone
GET    /api/regions                # List all regions
PATCH  /api/regions                # Update region, assign officers
DELETE /api/regions/{id}           # Delete region

POST   /api/devices                # Register device (phone + IMEI)
GET    /api/devices                # View all devices
PATCH  /api/devices/{id}           # Edit metadata, disable, transfer

POST   /api/devices/share          # Share device with user/role
GET    /api/devices/share          # View all shares
DELETE /api/devices/share          # Revoke sharing

GET    /api/incidents/playback     # Historical incident replay
POST   /api/incidents/export       # Export incident reports

GET    /api/analytics/export       # System-wide analytics
POST   /api/analytics/export       # Generate comprehensive reports

GET    /api/user                   # List all users
PATCH  /api/user                   # Change user roles
```

---

## 🏛️ CONTROL ROOM COMMANDER (Level 1)

### Authority
**Tactical command center** - Oversees incident management and unit coordination across region/sector.

### Primary Responsibilities
- Incident triage and command
- Unit deployment coordination
- Geofence management
- Real-time tactical decisions
- Escalation authority

### Specific Capabilities

#### Incident Management ✅
- `incident:create` - Create new incidents
- `incident:assign` - Assign units to incidents
- `incident:update:status` - Update incident status (open → assigned → en-route → on-scene → closed)
- `incident:close` - Mark incidents as closed/resolved
- `incident:escalate` - Escalate to SUPER_ADMIN if needed

#### Geofence Management ✅
- `geofence:create` - Create new zones/geofences
- `geofence:edit` - Modify existing geofences
- `geofence:view` - View all geofences

#### Unit Coordination ✅
- `unit:coordinate` - Coordinate multiple units to incidents
- `unit:view` - View all units in region
- `communications:broadcast` - Send region-wide broadcasts

#### Real-Time Capabilities ✅
- Live map showing all units in region
- Incident queue (filtered by region/priority)
- Unit status board (available/busy/offline)
- Geofence trigger alerts (when units enter/exit zones)
- Incident status sync (all viewers see same state)
- Dispatcher communication relay

### Real-Time Data Flow

```
CONTROL ROOM COMMANDER Dashboard:
├─ Incident Queue (sorted by priority, time)
│  └─ Create incident → Immediately broadcast to all viewers
│  └─ Assign unit → Unit receives alert, map updates
│  └─ Update status → Timeline updates in real-time
├─ Live Map
│  └─ Unit positions update every 30 seconds
│  └─ Trails show recent movements
│  └─ Color coding: Available/Busy/Offline/Engaged
├─ Geofence Zones
│  └─ Trigger alerts when units cross boundaries
│  └─ Entry/exit events logged
└─ Activity Feed
   └─ Real-time log of all actions

Commands Emit Real-Time Events:
├─ Create incident → Dispatchers, Field Supervisors notified
├─ Assign unit → Target unit receives push notification
├─ Create geofence → All units in zone notified
└─ Broadcast message → All units receive SMS/radio alert
```

### Hierarchy Relationships

**Can Manage:** Dispatcher, Field Supervisor, Patrol Officer, Field Agent  
**Managed By:** SUPER_ADMIN  
**Delegates To:** Dispatcher (for tactical assignments)  

---

## 📡 DISPATCHER (Level 2)

### Authority
**Dispatch operations** - Manages queue, assigns units, routes responses, relays communications.

### Primary Responsibilities
- Incident queue management
- Unit assignment optimization
- Resource allocation
- Communication relay
- Response coordination

### Specific Capabilities

#### Device Management ✅
- `device:create` - Register new devices
- `device:view:assigned` - View devices assigned to their sector

#### Incident Management ✅
- `incident:create` - Create incidents (report new situations)
- `incident:assign` - Assign units to incidents
- `incident:update:status` - Update incident status during response
- `incident:view` - View all incidents in queue

#### Unit Management ✅
- `unit:assign` - Assign available units to calls
- `unit:view` - View available/busy units
- `unit:status` - Monitor unit status in real-time
- `task:create` - Create dispatch tasks
- `queue:manage` - Manage incident queue, prioritize calls

#### Communications ✅
- `communications:send` - Send SMS/radio to units in field

### Real-Time Data Flow

```
DISPATCHER Dashboard (Queue-Focused):
├─ Incident Queue (PRIMARY)
│  └─ New incidents appear instantly
│  └─ Color-coded by severity
│  └─ Sorted by time, priority
├─ Available Units Grid
│  └─ Real-time status (available/busy/offline)
│  └─ Last known location
│  └─ Estimated response time to incidents
├─ Assignments
│  └─ View pending assignments
│  └─ Receive unit acceptance/rejection in real-time
├─ Communication Log
│  └─ SMS/radio history
│  └─ Delivery status
└─ Response Tracking
   └─ Watch unit movement to incident
   └─ Confirm arrival

Queue Actions → Real-Time Updates:
├─ Assign unit → Unit device receives notification + unit confirmation sent back
├─ Send message → Delivery confirmation in real-time
├─ Unit arrives → Auto-close queue item, archive incident
└─ New incident → Instant queue notification
```

### Hierarchy Relationships

**Can Manage:** Field Supervisor, Patrol Officer, Field Agent  
**Managed By:** SUPER_ADMIN, CONTROL_ROOM_COMMANDER  
**Reports To:** Control Room Commander  
**Coordinates With:** Field Supervisors (tactical ground leaders)

---

## 👷 FIELD SUPERVISOR (Level 3)

### Authority
**Field operations leadership** - On-the-ground coordinator for patrol teams.

### Primary Responsibilities
- Team coordination
- Field incident response
- Unit status reporting
- Local team communications
- Performance tracking

### Specific Capabilities

#### Incident Management ✅
- `incident:view:assigned` - View incidents assigned to team
- `incident:update:status` - Update status based on field conditions

#### Unit Management ✅
- `unit:view` - View team members
- `unit:monitor` - Monitor team member locations
- `device:view:team` - View team device status

#### Communications ✅
- `communications:local` - Send messages to team members
- `task:assign:local` - Assign tasks within team

#### Monitoring ✅
- `location:monitor:team` - View real-time location of team members
- `status:report` - Report team status to dispatch

### Real-Time Data Flow

```
FIELD SUPERVISOR Dashboard:
├─ Team Member Locations (Map)
│  └─ Real-time positions of assigned officers
│  └─ Last activity indicator
│  └─ Signal strength, battery status
├─ Assigned Incidents
│  └─ Current response tasks
│  └─ Status: En-route, On-scene, Engaged, Complete
├─ Team Status
│  └─ Officer availability
│  └─ Equipment status
│  └─ Communication status
└─ Activity Log
   └─ Officer actions and events

Team Coordination Events:
├─ Officer location updates → Sent to dispatcher
├─ Task completion → Status updates propagate up chain
├─ Emergency alert → Escalates to dispatcher
└─ Team member status change → Real-time notification
```

### Hierarchy Relationships

**Can Manage:** Patrol Officer, Field Agent  
**Managed By:** SUPER_ADMIN, CONTROL_ROOM_COMMANDER, DISPATCHER  
**Reports To:** Dispatcher  
**Supervises:** Patrol Officers in assigned area

---

## 🚗 PATROL OFFICER / FIELD AGENT (Level 4)

### Authority
**Field responder** - Executes assigned tasks, reports location/status.

### Primary Responsibilities
- Task execution
- Location reporting
- Status updates
- Incident response
- Activity logging

### Specific Capabilities

#### Incident Response ✅
- `incident:create` - Report new incidents
- `incident:view:assigned` - View assigned incidents
- `incident:update:status` - Update status while responding

#### Location Reporting ✅
- `location:report` - Send GPS position (every 30 seconds when active)
- `status:update` - Update availability status

#### Device Management ✅
- `device:view:self` - View own device info and health

#### Communications ✅
- `communications:receive` - Receive assignments from dispatcher
- `task:view` - View assigned tasks

### Real-Time Data Flow

```
PATROL OFFICER Mobile App:
├─ Assigned Incident Alert
│  └─ Real-time notification of new assignment
│  └─ Auto-navigation to location
│  └─ Priority and incident details
├─ Current Status
│  └─ Available / On Task / Break / Offline
│  └─ Can change status at any time
├─ Location Sharing
│  └─ GPS enabled by default
│  └─ Sends location every 30 seconds
│  └─ Battery/signal status shown
├─ Messages from Dispatcher
│  └─ SMS alerts
│  └─ Task updates
└─ Device Health
   └─ Battery %
   └─ GPS signal strength
   └─ Connectivity status

Officer Actions → Real-Time Propagation:
├─ Accept incident → Dispatcher notified, Supervisor notified, map updates
├─ En-route → Supervisor and dispatcher see movement
├─ On-scene → Incident marked as arrived
├─ Complete → Incident closed, unit available again
└─ Emergency alert → Escalates to all superiors
```

### Hierarchy Relationships

**Can Manage:** None (field responder)  
**Managed By:** SUPER_ADMIN, CONTROL_ROOM_COMMANDER, DISPATCHER, FIELD_SUPERVISOR  
**Reports To:** Field Supervisor (if assigned)  
**Receives From:** Dispatcher (assignments)

---

## 🔄 Real-Time Synchronization Matrix

### Event Propagation Rules

When a user at **Role A** takes **Action X**, the system broadcasts as follows:

```
SUPER_ADMIN takes action
  → Broadcast to: ALL users in system
  → Event type: HIGH_PRIORITY
  → Notification: Immediate

CONTROL_ROOM_COMMANDER takes action
  → Broadcast to: Dispatchers, Field Supervisors, affected units
  → Event type: NORMAL
  → Notification: Real-time

DISPATCHER takes action
  → Broadcast to: Assigned units, Field Supervisors
  → Event type: NORMAL
  → Notification: Real-time

FIELD_SUPERVISOR takes action
  → Broadcast to: Assigned units, Dispatcher
  → Event type: LOW_PRIORITY
  → Notification: Batch (every 30 seconds)

PATROL_OFFICER takes action
  → Broadcast to: Field Supervisor, Dispatcher
  → Event type: LOW_PRIORITY
  → Notification: Batch (every 60 seconds)
```

### Database Persistence & Real-Time Sync

```
Action Taken                    DB Collection Updated        Real-Time Event
─────────────────────────────── ──────────────────────────── ──────────────────
Device registered               devices                       device-registered
Device disabled                 devices                       device-updated
Device shared with user/role    devices.sharedWith            device-shared
Device ownership transferred    devices.owner                 device-updated

Incident created                incidents                     incident-update
Incident assigned to unit       incidents.assignedUnits       incident-update
Incident status changed         incidents.timeline            incident-update
Incident closed                 incidents.status              incident-update

User role changed               users.role                    roleChanged
User suspended                  users.suspended               userStatusChanged
User region assigned            users.region                  regionAssigned

Location reported               locations                     location-update
Geofence triggered              geofences.eventLog            geofence-update

Region created                  regions                       region-created
Region officer assigned         regions.officers              region-updated
```

---

## 🔐 Permission Hierarchy Rules

### Authorization Chain

```
Super Admin (0)
    └─ Can revoke/grant → Control Room (1)
        └─ Can revoke/grant → Dispatcher (2)
            └─ Can revoke/grant → Field Supervisor (3)
                └─ Can revoke/grant → Patrol Officer (4)
```

Any role can only manage roles **lower in hierarchy** than themselves.

**Example:**
- SUPER_ADMIN can promote/demote anyone
- CONTROL_ROOM_COMMANDER can only manage Dispatcher, Field Supervisor, Patrol Officer (NOT SUPER_ADMIN)
- DISPATCHER can only manage Field Supervisor and Patrol Officer
- FIELD_SUPERVISOR can only manage Patrol Officer
- PATROL_OFFICER cannot manage anyone

---

## 📊 Real-Time Dashboard Components

### SUPER_ADMIN Dashboard

```
┌─────────────────────────────────────────────┐
│ SYSTEM OVERVIEW (Real-time)                 │
├─────────────────────────────────────────────┤
│ Active Devices: 247        Incidents: 12    │
│ Online Users: 34           Offline: 8       │
│ System Health: ████████░░ 87%              │
├─────────────────────────────────────────────┤
│ DEVICE MAP (All devices)                    │
│ [Live map with all units]                   │
├─────────────────────────────────────────────┤
│ INCIDENT QUEUE (All regions)                │
│ • Critical Incident (Area 3) - 2m ago      │
│ • Unit Dispatch - 5m ago                   │
├─────────────────────────────────────────────┤
│ SYSTEM ACTIVITY FEED                        │
│ • Admin User123 disabled Device456 - 1m    │
│ • User XYZ promoted to Dispatcher - 3m     │
│ • Region North created - 10m               │
├─────────────────────────────────────────────┤
│ ANALYTICS PANEL                             │
│ Incidents (24h): 247  | Avg Response: 4m   │
│ Users by Role: [Chart showing distribution] │
│ Device Utilization: 89%                    │
└─────────────────────────────────────────────┘
```

### CONTROL_ROOM_COMMANDER Dashboard

```
┌─────────────────────────────────────────────┐
│ TACTICAL COMMAND CENTER                     │
├─────────────────────────────────────────────┤
│ Active Incidents: 8  | Units Deployed: 24  │
├─────────────────────────────────────────────┤
│ INCIDENT QUEUE (Region/Priority sorted)    │
│ [Scrollable list, creation form]            │
├─────────────────────────────────────────────┤
│ LIVE MAP                                    │
│ [Map showing region, units, geofences]      │
│ Legend: Available ⚪ | Busy 🟡 | Offline ⚫ │
├─────────────────────────────────────────────┤
│ UNIT STATUS BOARD                           │
│ [Grid showing each unit, status, location]  │
├─────────────────────────────────────────────┤
│ GEOFENCE ZONES                              │
│ [Map view, creation/edit forms]             │
├─────────────────────────────────────────────┤
│ ACTIVITY LOG (Commands & events)            │
│ • Incident created - 2m                    │
│ • Unit 5 assigned - 1m                     │
│ • Geofence triggered - 30s                 │
└─────────────────────────────────────────────┘
```

### DISPATCHER Dashboard

```
┌─────────────────────────────────────────────┐
│ DISPATCH QUEUE (PRIMARY)                    │
├─────────────────────────────────────────────┤
│ CRITICAL [2]  HIGH [5]  NORMAL [3]          │
├─────────────────────────────────────────────┤
│ [Incident cards in queue, sortable]         │
│ [Each card: Type, Location, Priority]       │
│ [Quick assign buttons]                      │
├─────────────────────────────────────────────┤
│ AVAILABLE UNITS                             │
│ [Grid showing units, ETA to incidents]      │
├─────────────────────────────────────────────┤
│ COMMUNICATION PANEL                         │
│ [Compose SMS/radio, delivery status]        │
├─────────────────────────────────────────────┤
│ RESPONSE TRACKER                            │
│ [Watch selected unit move to incident]      │
└─────────────────────────────────────────────┘
```

---

## 🔄 Real-Time Workflow Example: Incident Response

```
Timeline                  Action                    Real-Time Events
═════════════════════════════════════════════════════════════════════════

T+0s    USER (Field) creates incident
        └─ Incident recorded in DB
        └─ incident-update broadcast to:
           • DISPATCHER
           • CONTROL_ROOM_COMMANDER
           • SUPER_ADMIN
        └─ Incident appears in queue instantly

T+5s    DISPATCHER assigns Unit-5
        └─ Assignment recorded
        └─ Real-time update sent to:
           • Unit-5 (receives alert on device)
           • CONTROL_ROOM_COMMANDER
           • FIELD_SUPERVISOR
        └─ Queue item marked as assigned
        └─ Unit-5 map shows navigation

T+15s   Unit-5 accepts, en-route
        └─ Status changed in DB
        └─ Broadcast to: Dispatcher, Control Room, all viewers
        └─ Map shows unit moving (GPS every 30s)

T+40s   Unit-5 on-scene
        └─ Status update sent
        └─ Notification: Control Room, Dispatcher
        └─ Incident timeline: "Unit arrived"

T+180s  Unit-5 complete
        └─ Incident marked closed
        └─ Final status broadcast
        └─ Unit available for next assignment
        └─ Queue cleaned up
```

---

## 📱 API Error Handling & Role Validation

```javascript
// Request Flow for Permission-Protected Endpoint

GET /api/incidents/playback?incidentId=123

Step 1: Resolve JWT Token
  ├─ Extract token from Authorization header
  ├─ Validate JWT signature
  └─ Extract userId, role

Step 2: Check Permission
  ├─ Does this role have "intelligence:playback"?
  ├─ If YES → Continue
  └─ If NO → Return 403 Forbidden

Step 3: Verify Record Access
  ├─ Is user SUPER_ADMIN? → Allow
  ├─ Did user CREATE incident? → Allow
  ├─ Is user in assignedUnits? → Allow
  └─ Otherwise → Return 403 Forbidden

Step 4: Rate Limit
  ├─ Check userId + endpoint rate limit
  ├─ If exceeded → Return 429 Rate Limit Exceeded
  └─ If OK → Continue

Step 5: Execute Request & Log Activity
  ├─ Fetch data
  ├─ Log action: "incident:playback:view"
  ├─ Emit real-time event (for audit)
  └─ Return 200 OK with data
```

---

## 🚀 Deployment & Production Considerations

### Real-Time Infrastructure

- **Socket.IO Server** running on separate process (not blocking HTTP)
- **Redis** for real-time event distribution (if scaling to multiple server instances)
- **Database Indexes** on commonly queried fields (userId, role, timestamp, status)
- **Message Queue** for audit events (in case real-time broadcast fails)

### Security Considerations

- All role changes require SUPER_ADMIN or delegated authority
- Device transfers logged and auditable
- Location data encrypted in transit
- JWT tokens expire after 7 days
- Rate limiting per user per endpoint (adjustable)
- All actions logged with timestamp, userId, action, metadata

### Monitoring & Alerts

- Real-time dashboard for system health
- Alerts when role changes occur
- Alerts when devices disabled
- Performance monitoring of Socket.IO connections
- Audit trail queryable by admin

---

## Summary: Realistic & Operational

This hierarchy is designed to mirror **actual patrol/police dispatch operations**:

- ✅ Clear chain of command from field to administration
- ✅ Each role has specific, realistic responsibilities
- ✅ Real-time communication maintains operational continuity
- ✅ Audit trail ensures accountability
- ✅ Device/user management enables resource control
- ✅ Escalation pathways for critical situations
- ✅ Regional organization for multi-zone operations

**Result:** A platform that FEELS authentic and operates like real-world field operations organizations.
