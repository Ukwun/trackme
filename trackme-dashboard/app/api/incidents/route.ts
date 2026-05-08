import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { requireRole } from "../../../src/middleware/requireRole";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";

// GET: List all incidents (admin or super_admin only)
export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  if (!userId || !sessionClaims?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role: sessionClaims.role }, "incident:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":incidents:get")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const db = await getDb();
  const incidents = await db.collection("incidents").find({}).sort({ createdAt: -1 }).toArray();
  await logActivity({ userId, action: "incident:list", meta: {} });
  return NextResponse.json({ incidents });
}

// POST: Report a new incident (user, admin, super_admin)
export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  if (!userId || !sessionClaims?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role: sessionClaims.role }, "incident:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":incidents:post")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const data = await req.json();
  if (!data.title || !data.location) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const db = await getDb();
  const incident = {
    ...data,
    status: "Reported",
    assignedUnits: [],
    timeline: [{ status: "Reported", time: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };
  const result = await db.collection("incidents").insertOne(incident);
  await logActivity({ userId, action: "incident:report", meta: { incidentId: result.insertedId, ...data } });
  return NextResponse.json({ incident: { ...incident, _id: result.insertedId } });
}
