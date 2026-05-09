# TrackMe Role Functions & Real-Time Capabilities

## Role Functions Overview

Each role performs **specific, distinctive functions** with real-time data synchronization via Socket.IO.

---

## 🔵 **Super Admin**
### Primary Functions
- **User Management**: Create, edit, disable, assign roles to all users
- **System Oversight**: Monitor all devices, incidents, geofences across entire platform
- **Access Control**: Grant/revoke permissions, set role boundaries
- **Device Management**: Register, share, remove any device in system
- **Analytics Access**: View system-wide trends, usage patterns, user activity

### Real-Time Capabilities
- Live device status feed (all devices in system)
- Incident monitoring dashboard (all incidents globally)
- User login/activity tracking (audit trail)
- System health metrics (uptime, error rates)
- Real-time user notifications

### Data Visualization
- Complete device list (no filtering)
- All incidents (open/closed/archived)
- User management grid
- System analytics panel
- Full platform analytics

### Critical Actions
1. **Approve/Deny** user registrations
2. **Lock/Unlock** user accounts
3. **Reset** user passwords
4. **Delete** devices or users
5. **Export** system reports
6. **Monitor** all real-time activity

---

## 🟣 **Control Room**
### Primary Functions
- **Incident Command**: Create, assign, escalate, close incidents
- **Unit Coordination**: Monitor all units, dispatch to incidents
- **Geofence Management**: Create zones, set triggers, monitor entries/exits
- **Real-Time Tracking**: Monitor all active units on map
- **Communication Hub**: Relay information between field and command

### Real-Time Capabilities
- Live incident feed (scroll, filter by severity)
- Real-time unit locations on map (socket-driven)
- Geofence trigger alerts (when units enter/exit zones)
- Incident status updates (sync across all viewers)
- Unit availability status (online/offline/engaged)

### Data Visualization
- **Live Map**: All tracked units with trails
- **Incident Queue**: Sorted by priority/time
- **Unit Status Board**: Online/busy/offline
- **Geofence Zones**: Mapped with trigger history
- **Activity Feed**: Real-time incident log

### Critical Actions
1. **Create Incident** → Assign units → Track response
2. **Update Status** → Incident state persists in DB
3. **Create Geofence** → Set radius/name/triggers
4. **Assign Units** → Route to incident
5. **Close Incident** → End tracking, log details

---

## 🟢 **Dispatcher**
### Primary Functions
- **Queue Management**: View incident queue, prioritize assignments
- **Unit Assignment**: Assign available units to incidents
- **Resource Allocation**: Track unit availability, schedule relief
- **Communication**: Send updates to field units (SMS/radio/call)
- **Response Coordination**: Optimize dispatch routes

### Real-Time Capabilities
- **Live Incident Queue**: New incidents appear in queue instantly
- **Unit Availability**: Real-time status of available/busy units
- **Assignment Confirmation**: Units accept/reject assignments in real-time
- **Route Optimization**: Calculate optimal dispatch routes
- **Communication Logs**: Track all sent messages

### Data Visualization
- **Incident Queue** (primary, sorted by priority)
- **Available Units Grid** (status, location, capability)
- **Assignment History** (recent dispatch actions)
- **Communication Panel** (SMS/radio draft)

### Critical Actions
1. **View Queue** → Filter by priority/type
2. **Assign Unit** → To specific incident
3. **Send Communication** → SMS/radio/direct call
4. **Track Response** → See unit movement to incident
5. **Log Handoff** → Transition unit between assignments

---

## 🟠 **Patrol Officer**
### Primary Functions
- **Self-Location Reporting**: Continuously report position to control
- **Task Execution**: Receive, execute, report on assigned tasks
- **Incident Response**: Respond to assigned incidents, provide updates
- **Activity Logging**: Record actions, observations, status changes
- **Real-Time Communication**: Receive orders from dispatcher

### Real-Time Capabilities
- **GPS Tracking**: Auto-report location every 30 seconds (configurable)
- **Incident Alerts**: Receive new assignments in real-time
- **Status Updates**: Push status changes to control room
- **Geofence Notifications**: Get alerts when entering/exiting zones
- **Message Reception**: Receive SMS/radio alerts from dispatcher

### Data Visualization
- **Personal Device History**: Own location trail (last 24 hours)
- **Assigned Incident Details**: Task description, location, priority
- **Battery/Signal Status**: Device health metrics
- **Current Location**: Live GPS coordinates
- **Task Queue**: Assigned incidents/tasks

### Critical Actions
1. **Share Location** → Enable continuous GPS sync
2. **Accept Incident** → Confirm assignment, start navigation
3. **Update Status** → Report progress (en route, on scene, complete)
4. **Log Issue** → Create new incident/hazard report
5. **Send Update** → Text/voice message to dispatcher

---

## 🌹 **Analyst**
### Primary Functions
- **Data Analysis**: Trends, patterns, anomalies in incident/device data
- **Reporting**: Generate summaries, export data, create dashboards
- **Performance Metrics**: Calculate response times, utilization rates
- **Forecasting**: Predict incident patterns, resource needs
- **Quality Assurance**: Review operations for improvement

### Real-Time Capabilities
- **Live Analytics Feed**: Real-time stats (incidents/hour, avg response time)
- **Trend Visualization**: Charts updating as data comes in
- **Export Triggers**: Generate reports on-demand or scheduled
- **Anomaly Detection**: Alert if patterns deviate from baseline
- **Performance Alerts**: Highlight KPIs going out of range

### Data Visualization
- **Analytics Dashboard** (primary): Charts, graphs, metrics
- **Report Templates**: Pre-built exports (PDF, CSV)
- **Date Range Filters**: Drill down by time period
- **Comparison Views**: Compare periods, roles, regions
- **Export Options**: Incidents, devices, users, activity

### Critical Actions
1. **View Analytics** → Real-time dashboard
2. **Filter Data** → By date, incident type, role, region
3. **Generate Report** → PDF/CSV export with selected metrics
4. **Schedule Report** → Auto-send reports daily/weekly
5. **Share Findings** → Distribute analysis to stakeholders

---

## 🔷 **Field Agent**
### Primary Functions
- **Task Tracking**: View assigned tasks, track completion
- **Location Sync**: Auto-update position for tracking
- **Activity Logging**: Log actions, time on task, observations
- **Equipment Status**: Report device health, battery, signal
- **Communication**: Receive updates from dispatcher

### Real-Time Capabilities
- **Auto-Location**: GPS updates every 60 seconds (configurable)
- **Task Notifications**: Receive new tasks in real-time
- **Activity Feed**: Log completed actions
- **Status Reporting**: Push battery/signal/location status
- **Message Reception**: Receive dispatcher instructions

### Data Visualization
- **Activity History**: Personal action log (last 24 hours)
- **Device Status**: Battery, GPS signal, last update time
- **Current Location**: Live GPS on map
- **Task Details**: Description, priority, location
- **Status Options**: Available, on task, break, offline

### Critical Actions
1. **Mark Complete** → Task completion with timestamp
2. **Share Location** → Enable GPS sync
3. **Log Activity** → Record action/observation
4. **Update Status** → Change availability state
5. **Send Update** → Message to dispatcher

---

## Real-Time Sync Architecture

### Socket.IO Events (All Roles)

```
OUTGOING (Server → Client):
├─ location-update       (Device location, speed, battery)
├─ incident-update       (Incident created/assigned/status changed)
├─ geofence-update       (Geofence triggered, entry/exit)
├─ unit-status-change    (Unit online/offline/engaged)
└─ notification          (Alert to role-specific users)

INCOMING (Client → Server):
├─ location-report       (Patrol officer shares location)
├─ task-complete         (Field agent marks task done)
├─ status-change         (User changes availability)
└─ incident-comment      (Add notes to incident)
```

### Database Persistence

```
Users Collection:
├─ role: String (determines permissions)
├─ lastLocation: GeoJSON (latest GPS)
├─ lastActivity: Timestamp (for audit)
└─ status: String (online/offline/engaged)

Incidents Collection:
├─ status: String (open/assigned/en-route/on-scene/closed)
├─ assignedUnits: Array (unit IDs)
├─ timeline: Array (audit trail)
└─ updatedAt: Timestamp (persistence trigger)

Devices Collection:
├─ ownerId: String (super_admin or owner)
├─ sharedWith: Array (control_room, analysts, etc.)
├─ lastLocation: GeoJSON
└─ trail: Array (location history)

Geofences Collection:
├─ createdBy: String (control_room role)
├─ center: GeoJSON
├─ radius: Number (meters)
└─ eventLog: Array (entry/exit events)
```

---

## Data Flow Per Role

### Super Admin
```
Dashboard Load
    ↓
Fetch [All Users] + [All Devices] + [All Incidents] + [Analytics]
    ↓
Socket connects
    ↓
Receive updates: ANY location-update, incident-update, user-activity
    ↓
Update dashboard in real-time (no filtering)
```

### Control Room
```
Dashboard Load
    ↓
Fetch [All Devices] + [Open Incidents] + [Geofences]
    ↓
Socket connects
    ↓
Receive updates: location-update, incident-update, geofence-update
    ↓
Update map with unit locations + incident list
    ↓
Can CREATE incident → DB persist + socket broadcast
    ↓
Can ASSIGN unit → DB persist + socket to patrol officer
```

### Dispatcher
```
Dashboard Load
    ↓
Fetch [Incident Queue] + [Unit Status] + [Available Units]
    ↓
Socket connects
    ↓
Receive updates: incident-update (new incidents in queue), unit-status-change
    ↓
Display queue, filtered for assignments
    ↓
Can ASSIGN unit → DB persist + socket to patrol officer
    ↓
Can SEND COMMUNICATION → External API (SMS/radio)
```

### Patrol Officer
```
Dashboard Load
    ↓
Fetch [Own Device History] + [Assigned Incident] + [Device Status]
    ↓
Socket connects + START location reporting (every 30s)
    ↓
Send: location-report → Server broadcasts to control_room/dispatcher
    ↓
Receive updates: incident-update (new assignment), message (dispatcher)
    ↓
Can MARK COMPLETE → DB persist + socket broadcast
```

### Analyst
```
Dashboard Load
    ↓
Fetch [Incidents] + [Devices] + [Activity Log]
    ↓
Socket connects (optional, for live metrics)
    ↓
Receive updates: incident-update (for live dashboard)
    ↓
Can FILTER/EXPORT → Generate report on-demand
    ↓
Can SCHEDULE EXPORT → Stored in DB, sent via email
```

### Field Agent
```
Dashboard Load
    ↓
Fetch [Own Activity History] + [Device Status]
    ↓
Socket connects + START location reporting (every 60s)
    ↓
Send: location-report (less frequent than patrol officer)
    ↓
Receive: task-notification (assigned work)
    ↓
Can MARK COMPLETE → DB persist + socket to dispatcher
    ↓
Can UPDATE STATUS → Available/on-task/break/offline
```

---

## Key Differences (Why Roles Are Distinctive)

| Capability | Super Admin | Control Room | Dispatcher | Patrol Officer | Analyst | Field Agent |
|-----------|---|---|---|---|---|---|
| **View All Data** | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Create Incident** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Assign Unit** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create Geofence** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Share Device** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Auto GPS Report** | ❌ | ❌ | ❌ | ✅ (30s) | ❌ | ✅ (60s) |
| **Receive Tasks** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Export Reports** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Manage Users** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **View Analytics** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## Real-Time Performance Requirements

### Location Update Frequency
```
Control Room (viewer):  All locations every 2-3 seconds
Patrol Officer:         Report every 30 seconds
Field Agent:            Report every 60 seconds
Dispatcher:             Unit status updates every 5 seconds
```

### Incident Update Latency
```
Create → Broadcast: <100ms
Assign → Notify: <200ms
Status Change → Persist: <500ms
```

### Dashboard Refresh
```
New incident in queue:  <1 second
Unit location update:   <2 seconds (socket)
Incident assignment:    <500ms (socket)
Geofence trigger:       <1 second
```

---

## Summary: Why Each Role is Needed

1. **Super Admin** - System authority, user management, full visibility, system health
2. **Control Room** - Tactical decision maker, incident command, unit coordination, real-time strategy
3. **Dispatcher** - Queue manager, unit assigner, communication relay, resource optimizer
4. **Patrol Officer** - Field responder, auto-reports location, executes tasks, provides updates
5. **Analyst** - Data explorer, report generator, trend identifier, performance measurer
6. **Field Agent** - Simple task executor, basic location reporting, minimal dependencies

Each role has **distinct data access**, **different update frequencies**, and **specific actions** only they can perform.
