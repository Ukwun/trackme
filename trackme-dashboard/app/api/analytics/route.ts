

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";
import { Server } from "socket.io";

  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = await getDb();
  await db.collection("analytics").insertOne({ userId, ...body, createdAt: new Date().toISOString() });
  // Emit real-time event
  try {
    if ((global as any).io) {
      (global as any).io.emit('analytics-update', { userId });
    }
  } catch {}
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const url = req?.url || "";
  const params = new URL(url, 'http://localhost').searchParams;
  const mode = params.get('mode');

  if (mode === 'trends') {
    // Example: Count actions per day for the last 7 days
    const pipeline = [
      { $match: { userId } },
      { $addFields: { day: { $substr: ["$createdAt", 0, 10] } } },
      { $group: { _id: "$day", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ];
    const trends = await db.collection("analytics").aggregate(pipeline).toArray();
    return NextResponse.json({ trends });
  }

  if (mode === 'anomalies') {
    // Example: Find days with more than 2x the average activity
    const pipeline = [
      { $match: { userId } },
      { $addFields: { day: { $substr: ["$createdAt", 0, 10] } } },
      { $group: { _id: "$day", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ];
    const days = await db.collection("analytics").aggregate(pipeline).toArray();
    const avg = days.reduce((sum, d) => sum + d.count, 0) / (days.length || 1);
    const anomalies = days.filter(d => d.count > 2 * avg);
    return NextResponse.json({ anomalies, avg });
  }

  // Default: return all analytics
  const analytics = await db.collection("analytics").find({ userId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ analytics });
}
