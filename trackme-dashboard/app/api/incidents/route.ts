import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";
import { emitRealtimeEvent } from "../../../src/realtime/server";

// GET: List all incidents (admin or super_admin only)
export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "incident:view")) {
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
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "incident:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":incidents:post")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const data = await req.json();
  const incidentType = data.type || data.title;
  if (!incidentType || !data.location) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const db = await getDb();
  const incident = {
    ...data,
    type: incidentType,
    title: data.title || incidentType,
    status: "Reported",
    assignedUnits: [],
    timeline: [{ status: "Reported", time: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };
  const result = await db.collection("incidents").insertOne(incident);
  const createdIncident = { ...incident, _id: result.insertedId };
  await logActivity({ userId, action: "incident:report", meta: { incidentId: result.insertedId, ...data } });
  emitRealtimeEvent("incident-update", createdIncident);
  return NextResponse.json({ incident: createdIncident });
}

export async function PATCH(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "incident:update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":incidents:patch")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { incidentId, assignUnitId, status } = await req.json();
  if (!incidentId) {
    return NextResponse.json({ error: "incidentId is required" }, { status: 400 });
  }

  const db = await getDb();
  const now = new Date().toISOString();

  const selector = ObjectId.isValid(incidentId)
    ? { _id: new ObjectId(incidentId) }
    : { id: String(incidentId) };

  const existing = await db.collection("incidents").findOne(selector);
  if (!existing) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  const nextAssigned = Array.isArray(existing.assignedUnits)
    ? [...existing.assignedUnits]
    : [];
  const nextTimeline = Array.isArray(existing.timeline)
    ? [...existing.timeline]
    : [];
  let nextStatus = existing.status || "Reported";

  if (assignUnitId) {
    if (!hasPermission({ role }, "incident:assign")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!nextAssigned.includes(assignUnitId)) {
      nextAssigned.push(assignUnitId);
      nextTimeline.push({ status: `Unit ${assignUnitId} assigned`, time: now });
    }
  }

  if (status) {
    nextStatus = String(status);
    nextTimeline.push({ status: nextStatus, time: now });
  }

  await db.collection("incidents").updateOne(
    selector,
    {
      $set: {
        assignedUnits: nextAssigned,
        status: nextStatus,
        timeline: nextTimeline,
        updatedAt: now,
      },
    }
  );

  await logActivity({ userId, action: "incident:update", meta: { incidentId, assignUnitId, status } });
  const updated = await db.collection("incidents").findOne(selector);
  emitRealtimeEvent("incident-update", updated);
  return NextResponse.json({ success: true, incident: updated });
}
