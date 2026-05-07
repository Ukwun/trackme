import { io } from "socket.io-client";

let socket: ReturnType<typeof io> | null = null;

export function connectSocket() {
  if (!socket) {
    socket = io("/api/socketio");
  }
  return socket;
}


export function sendLocationUpdate(data: { phone: string; imei: string; lat: number; lng: number }) {
  if (!socket) connectSocket();
  socket?.emit("location-update", data);
}

export function onLocationUpdate(callback: (data: any) => void) {
  if (!socket) connectSocket();
  socket?.on("location-update", callback);
}

// New: Emit and listen for unit, incident, geofence, and analytics updates
export function emitUnitUpdate(units: any[]) {
  if (!socket) connectSocket();
  socket?.emit("unit-update", units);
}
export function emitIncidentUpdate(incident: any) {
  if (!socket) connectSocket();
  socket?.emit("incident-update", incident);
}
export function emitGeofenceUpdate(geofences: any[]) {
  if (!socket) connectSocket();
  socket?.emit("geofence-update", geofences);
}
export function emitAnalyticsUpdate(analytics: any[]) {
  if (!socket) connectSocket();
  socket?.emit("analytics-update", analytics);
}
