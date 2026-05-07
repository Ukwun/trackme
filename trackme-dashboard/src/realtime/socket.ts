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
