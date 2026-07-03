import { io } from "socket.io-client";

let socket: ReturnType<typeof io> | null = null;

export function connectSocket() {
  if (!socket) {
    // Ensure the API route has initialized the Socket.IO server before connecting.
    if (typeof window !== "undefined") {
      void fetch("/api/socketio").catch(() => undefined);
    }
    socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}


export function sendLocationUpdate(data: { deviceId: string; lat: number; lng: number; speed?: number; heading?: number; battery?: number; timestamp?: number }) {
  if (!socket) connectSocket();
  socket?.emit("location-update", data);
}

// Send location update to API for geofence event detection
export async function sendLocationUpdateWithGeofence(data: { deviceId: string; lat: number; lng: number; speed?: number; heading?: number; battery?: number; timestamp?: number }) {
  // Send to socket for real-time map
  sendLocationUpdate(data);
  // Send to API for geofence event detection
  const token = typeof window !== "undefined" ? window.localStorage.getItem("tm_auth_token") : null;
  await fetch("/api/location-update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ deviceId: data.deviceId, lat: data.lat, lng: data.lng })
  });
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
