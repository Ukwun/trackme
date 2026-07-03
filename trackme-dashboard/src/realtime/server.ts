import type { Server } from "socket.io";

type RealtimeEvent =
  | "location-update"
  | "incident-update"
  | "geofence-update"
  | "unit-update"
  | "analytics-update"
  | "notification-update"
  | "device-registered"
  | "device-updated"
  | "device-shared"
  | "device-share-revoked"
  | "region-created"
  | "region-updated"
  | "region-deleted"
  | "roleChanged"
  | "yourRoleUpdated"
  | "roleChanged"
  | "permissionsUpdated"
  | "region-assigned"
  | "region-updated"
  | "teamCreated"
  | "addedToTeam"
  | "incidentEscalated"
  | "authorityDelegated"
  | "userStatusChanged"
  | "systemEvent";

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