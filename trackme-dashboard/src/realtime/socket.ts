import { io } from "socket.io-client";

let socket: ReturnType<typeof io> | null = null;

export type LocationUpdatePayload = {
  deviceId: string;
  phone?: string | null;
  imei?: string | null;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  battery?: number;
  accuracy?: number;
  timestamp?: number;
};

export function connectSocket() {
  if (!socket) {
    const isNetlify = typeof window !== "undefined" && window.location.hostname.endsWith(".netlify.app");
    // Ensure the API route has initialized the Socket.IO server before connecting.
    if (typeof window !== "undefined" && !isNetlify) {
      void fetch("/api/socketio").catch(() => undefined);
    }
    socket = io({
      path: "/api/socketio",
      transports: ["websocket", "polling"],
      autoConnect: !isNetlify,
      reconnection: !isNetlify,
    });
  }
  return socket;
}


export function sendLocationUpdate(data: LocationUpdatePayload) {
  if (!socket) connectSocket();
  socket?.emit("location-update", data);
}

// Send location update to API for geofence event detection
export async function sendLocationUpdateWithGeofence(data: LocationUpdatePayload) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tm-location-update", { detail: data }));
  }
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
    body: JSON.stringify(data)
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
