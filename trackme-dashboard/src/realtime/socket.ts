import { io } from "socket.io-client";

let socket: any = null;
let pollingIntervalId: number | null = null;

function startPolling() {
  if (typeof window === "undefined") return;
  if (pollingIntervalId) return;
  const poll = async () => {
    try {
      const res = await fetch("/api/realtime/poll");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.events) {
        for (const ev of data.events) {
          window.dispatchEvent(new CustomEvent(`tm-poll-${ev.type}`, { detail: ev.payload }));
        }
      }
    } catch (e) {
      // ignore
    }
  };
  poll();
  pollingIntervalId = window.setInterval(poll, 3000);
}

function stopPolling() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

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
    // Exponential backoff on connection failures and fallback to polling
    let attempts = 0;
    const maxAttempts = 5;
    const tryConnect = () => {
      attempts++;
      socket = io({
        path: "/api/socketio",
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: false,
      });

      socket.on("connect", () => {
        stopPolling();
      });

      socket.on("connect_error", (err: any) => {
        socket?.close();
        socket = null;
        if (attempts < maxAttempts) {
          const wait = Math.min(2000 * attempts, 10000);
          setTimeout(tryConnect, wait);
        } else {
          // give up and start HTTP polling
          startPolling();
          // Install a lightweight faux-socket so callers using socket.on/off continue to work
          const listeners: Record<string, Set<any>> = {};
          socket = {
            on: (ev: string, cb: any) => {
              listeners[ev] = listeners[ev] || new Set();
              listeners[ev].add(cb);
              // listen to polled window events and forward
              const handler = (e: any) => cb(e.detail);
              // store handler to be able to remove later
              (cb as any).__pollHandler = handler;
              window.addEventListener(`tm-poll-${ev}`, handler);
            },
            off: (ev: string, cb: any) => {
              if (!listeners[ev]) return;
              listeners[ev].delete(cb);
              const handler = (cb as any).__pollHandler;
              if (handler) window.removeEventListener(`tm-poll-${ev}`, handler);
            },
            emit: (ev: string, payload: any) => {
              // no-op for polled mode, but dispatch local window event for in-page listeners
              window.dispatchEvent(new CustomEvent(`tm-poll-${ev}`, { detail: payload }));
            },
            close: () => {
              stopPolling();
              socket = null;
            },
          };
        }
      });
    };

    tryConnect();
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
