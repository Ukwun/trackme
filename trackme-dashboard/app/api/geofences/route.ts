import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";
import { emitRealtimeEvent } from "../../../src/realtime/server";

export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "geofence:create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":geofences:post")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const body = await req.json();
  const { name, center, radius } = body;
  if (!name || !center || !radius) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = await getDb();
  await db.collection("geofences").insertOne({ userId, name, center, radius, createdAt: new Date().toISOString() });
  await logActivity({ userId, action: "geofence:create", meta: { name, center, radius } });
  const geofences = await db.collection("geofences").find({ userId }).sort({ createdAt: -1 }).toArray();
  emitRealtimeEvent("geofence-update", geofences);
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "geofence:view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":geofences:get")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const db = await getDb();
  const geofences = await db.collection("geofences").find({ userId }).sort({ createdAt: -1 }).toArray();
  await logActivity({ userId, action: "geofence:list", meta: {} });
  return NextResponse.json({ geofences });
}

export async function PATCH(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "geofence:update")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":geofences:patch")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const { geofenceId, name, center, radius } = await req.json();
  if (!geofenceId) return NextResponse.json({ error: "geofenceId is required" }, { status: 400 });

  const selector = ObjectId.isValid(geofenceId)
    ? { _id: new ObjectId(geofenceId), userId }
    : { id: String(geofenceId), userId };

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name !== undefined) update.name = name;
  if (center !== undefined) update.center = center;
  if (radius !== undefined) update.radius = radius;

  const db = await getDb();
  const result = await db.collection("geofences").updateOne(selector, { $set: update });
  if (!result.matchedCount) return NextResponse.json({ error: "Geofence not found" }, { status: 404 });

  await logActivity({ userId, action: "geofence:update", meta: { geofenceId, name, center, radius } });
  const geofence = await db.collection("geofences").findOne(selector);
  const geofences = await db.collection("geofences").find({ userId }).sort({ createdAt: -1 }).toArray();
  emitRealtimeEvent("geofence-update", geofences);
  return NextResponse.json({ success: true, geofence });
}
