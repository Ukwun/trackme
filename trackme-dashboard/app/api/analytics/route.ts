

import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";
import { emitRealtimeEvent } from "../../../src/realtime/server";

export async function POST(req: Request) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "analytics:create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":analytics:post")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const body = await req.json();
  const db = await getDb();
  const analyticsRecord = { userId, ...body, createdAt: new Date().toISOString() };
  await db.collection("analytics").insertOne(analyticsRecord);
  await logActivity({ userId, action: "analytics:create", meta: body });
  emitRealtimeEvent("analytics-update", { userId, analytics: analyticsRecord });
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "analytics:view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":analytics:get")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const db = await getDb();
  const url = req?.url || "";
  const params = new URL(url, 'http://localhost').searchParams;
  const mode = params.get('mode');

  if (mode === 'trends') {
    const pipeline = [
      { $match: { userId } },
      { $addFields: { day: { $substr: ["$createdAt", 0, 10] } } },
      { $group: { _id: "$day", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ];
    const trends = await db.collection("analytics").aggregate(pipeline).toArray();
    await logActivity({ userId, action: "analytics:trends", meta: {} });
    return NextResponse.json({ trends });
  }

  if (mode === 'anomalies') {
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
    await logActivity({ userId, action: "analytics:anomalies", meta: {} });
    return NextResponse.json({ anomalies, avg });
  }

  // Default: return all analytics
  const analytics = await db.collection("analytics").find({ userId }).sort({ createdAt: -1 }).toArray();
  await logActivity({ userId, action: "analytics:list", meta: {} });
  return NextResponse.json({ analytics });
}
