import { Server } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { NextApiResponse } from "next";
import { getDb } from "../../src/api/db";
import { registerRealtimeServer } from "../../src/realtime/server";
import { registerRoleSyncHandlers } from "../../src/realtime/roleSyncHandlers";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket) {
    res.status(500).end();
    return;
  }

  const io = getIO((res.socket as any).server);
  res.end();
}

function getIO(server: HTTPServer) {
  if (!(server as any).io) {
    const io = new Server(server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });
    io.on("connection", (socket) => {
      socket.on("location-update", async (data) => {
        // Store location update in MongoDB
        try {
          const db = await getDb();
          // Accepts: { deviceId, phone, imei, lat, lng, speed, heading, battery, timestamp }
          const normalized = {
            deviceId: data?.deviceId,
            phone: data?.phone || null,
            imei: data?.imei || null,
            lat: Number(data?.lat),
            lng: Number(data?.lng),
            speed: Number.isFinite(Number(data?.speed)) ? Number(data.speed) : undefined,
            heading: Number.isFinite(Number(data?.heading)) ? Number(data.heading) : undefined,
            battery: Number.isFinite(Number(data?.battery)) ? Number(data.battery) : undefined,
            timestamp: Number.isFinite(Number(data?.timestamp)) ? Number(data.timestamp) : Date.now(),
            receivedAt: new Date().toISOString(),
          };
          if (normalized.deviceId && Number.isFinite(normalized.lat) && Number.isFinite(normalized.lng)) {
            await db.collection("location_history").insertOne(normalized);
          }
        } catch (e) {
          // Optionally log error
        }
        io.emit("location-update", data);
      });
      socket.on("analytics-update", (data) => {
        io.emit("analytics-update", data);
      });
      socket.on("incident-update", (data) => {
        io.emit("incident-update", data);
      });
      socket.on("geofence-update", (data) => {
        io.emit("geofence-update", data);
      });
      socket.on("unit-update", (data) => {
        io.emit("unit-update", data);
      });
      socket.on("notification-update", (data) => {
        io.emit("notification-update", data);
      });
    });

    // Register hierarchy-aware, role-scoped realtime channels.
    registerRoleSyncHandlers(io);

    (server as any).io = io;
    registerRealtimeServer(io);
  }
  return (server as any).io;
}
