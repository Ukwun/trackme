import { Server } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import type { NextApiResponse } from "next";

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
      socket.on("location-update", (data) => {
        io.emit("location-update", data);
      });
    });
    (server as any).io = io;
  }
  return (server as any).io;
}
