import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  if (!userId || !sessionClaims?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role: sessionClaims.role }, "geofence:create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":geofences:post")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const body = await req.json();
  const { name, center, radius } = body;
  if (!name || !center || !radius) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const db = await getDb();
  await db.collection("geofences").insertOne({ userId, name, center, radius, createdAt: new Date().toISOString() });
  await logActivity({ userId, action: "geofence:create", meta: { name, center, radius } });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  if (!userId || !sessionClaims?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role: sessionClaims.role }, "geofence:view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":geofences:get")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const db = await getDb();
  const geofences = await db.collection("geofences").find({ userId }).sort({ createdAt: -1 }).toArray();
  await logActivity({ userId, action: "geofence:list", meta: {} });
  return NextResponse.json({ geofences });
}
