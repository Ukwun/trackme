import { Server } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { NextApiResponse } from "next";
import { getDb } from "../../src/api/db";

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

  const io = getIO(res.socket.server);
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
          // Accepts: { deviceId, lat, lng, speed, heading, battery, timestamp }
          await db.collection("location_history").insertOne({ ...data, receivedAt: new Date().toISOString() });
        } catch (e) {
          // Optionally log error
        }
        io.emit("location-update", data);
      });
      socket.on("analytics-update", (data) => {
        io.emit("analytics-update", data);
      });
      socket.on("notification-update", (data) => {
        io.emit("notification-update", data);
      });
    });
    (server as any).io = io;
  }
  return (server as any).io;
}
