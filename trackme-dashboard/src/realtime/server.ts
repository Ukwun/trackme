import type { Server } from "socket.io";

type RealtimeEvent =
  | "location-update"
  | "incident-update"
  | "geofence-update"
  | "unit-update"
  | "analytics-update"
  | "notification-update";

type RealtimeServerGlobal = typeof globalThis & {
  __trackmeIo?: Server;
};

function getRealtimeGlobal() {
  return globalThis as RealtimeServerGlobal;
}

export function registerRealtimeServer(io: Server) {
  getRealtimeGlobal().__trackmeIo = io;
}

export function getRealtimeServer() {
  return getRealtimeGlobal().__trackmeIo ?? null;
}

export function emitRealtimeEvent(event: RealtimeEvent, payload: unknown) {
  getRealtimeServer()?.emit(event, payload);
}