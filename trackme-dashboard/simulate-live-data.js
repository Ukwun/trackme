// Simulate live data for units, incidents, geofences, and analytics
// Run this in a Node.js environment or as a script in your dev tools
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000/api/socketio");

function randomLatLng() {
  // Lagos area
  const lat = 6.4 + Math.random() * 0.3;
  const lng = 3.2 + Math.random() * 0.3;
  return { lat, lng };
}

function randomBattery() {
  return Math.floor(40 + Math.random() * 60);
}

function randomStatus() {
  return ["Active", "Idle", "En Route"][Math.floor(Math.random() * 3)];
}

function emitUnits() {
  const units = [
    { id: "UNIT_203", name: "Alex Williams", status: randomStatus(), type: "Patrol", battery: randomBattery(), ...randomLatLng() },
    { id: "UNIT_101", name: "Sarah Lee", status: randomStatus(), type: "Responder", battery: randomBattery(), ...randomLatLng() },
    { id: "UNIT_305", name: "John Doe", status: randomStatus(), type: "Patrol", battery: randomBattery(), ...randomLatLng() },
  ];
  socket.emit("unit-update", units);
}

function emitIncident() {
  const incident = {
    id: "INC_001",
    type: "Robbery",
    status: ["En Route", "Arrived", "Engaged", "Resolved"][Math.floor(Math.random() * 4)],
    assignedUnits: ["UNIT_203", "UNIT_305"],
    location: "A47 Tangenziale di Mestre",
    createdAt: new Date().toLocaleString(),
    timeline: [
      { status: "Created", time: "14:32" },
      { status: "Units Assigned", time: "14:33" },
      { status: "En Route", time: "14:34" },
    ],
  };
  socket.emit("incident-update", incident);
}

function emitGeofences() {
  const geofences = [
    { id: "GEO_001", name: "Patrol Zone A", type: "Patrol", status: "Active", coordinates: [[6.5, 3.3],[6.6,3.3],[6.6,3.4],[6.5,3.4],[6.5,3.3]] },
    { id: "GEO_002", name: "Restricted Area", type: "Restricted", status: "Inactive", coordinates: [[6.45,3.25],[6.55,3.25],[6.55,3.35],[6.45,3.35],[6.45,3.25]] },
  ];
  socket.emit("geofence-update", geofences);
}

function emitAnalytics() {
  const analytics = [
    { type: "Active Units", message: Math.floor(Math.random() * 10 + 3) + " units online", createdAt: new Date().toLocaleTimeString() },
    { type: "Incidents", message: Math.floor(Math.random() * 5) + " incidents today", createdAt: new Date().toLocaleTimeString() },
  ];
  socket.emit("analytics-update", analytics);
}

setInterval(() => {
  emitUnits();
  emitIncident();
  emitGeofences();
  emitAnalytics();
}, 4000);

console.log("Simulating live data...");
