import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { resolveSession } from "../../../src/api/authSession";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";

const CASE_ROLES = new Set(["super_admin", "control_room", "control_room_commander"]);

export async function GET(req: Request) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CASE_ROLES.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = await getDb();
  const cases = await db.collection("authorized_cases")
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json({ cases });
}

export async function POST(req: Request) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!CASE_ROLES.has(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const caseNumber = String(body.caseNumber || "").trim();
  const warrantNumber = String(body.warrantNumber || "").trim();
  const subjectType = body.subjectType === "imei" ? "imei" : "phone";
  const subjectIdentifier = String(body.subjectIdentifier || "").trim();
  const purpose = String(body.purpose || "").trim();
  const expiresAt = new Date(body.expiresAt);

  if (!caseNumber || !warrantNumber || !subjectIdentifier || purpose.length < 12 || Number.isNaN(expiresAt.getTime())) {
    return NextResponse.json({ error: "Complete all authorization fields" }, { status: 400 });
  }
  if (expiresAt <= new Date()) return NextResponse.json({ error: "Expiry must be in the future" }, { status: 400 });

  const db = await getDb();
  const duplicate = await db.collection("authorized_cases").findOne({ $or: [{ caseNumber }, { warrantNumber }] });
  if (duplicate) return NextResponse.json({ error: "Case or warrant number already exists" }, { status: 409 });

  const record = {
    caseNumber,
    warrantNumber,
    subjectType,
    subjectIdentifier,
    purpose,
    status: "pending_approval",
    requestedBy: userId,
    approvedBy: null,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    retentionUntil: new Date(expiresAt.getTime() + 90 * 86400000).toISOString(),
  };
  const result = await db.collection("authorized_cases").insertOne(record);
  await logActivity({ userId, action: "case:authorization-requested", meta: { caseId: String(result.insertedId), caseNumber, warrantNumber } });
  return NextResponse.json({ case: { _id: result.insertedId, ...record } }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { userId, role } = await resolveSession(req);
  if (!userId || role !== "super_admin") return NextResponse.json({ error: "Super-admin approval required" }, { status: 403 });
  const { caseId, decision } = await req.json();
  if (!ObjectId.isValid(caseId) || !["approved", "rejected", "revoked"].includes(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }

  const db = await getDb();
  const record = await db.collection("authorized_cases").findOne({ _id: new ObjectId(caseId) });
  if (!record) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  if (decision === "approved" && record.requestedBy === userId) {
    return NextResponse.json({ error: "Two-person control requires a different approver" }, { status: 409 });
  }

  await db.collection("authorized_cases").updateOne(
    { _id: record._id },
    { $set: { status: decision, approvedBy: userId, decisionAt: new Date().toISOString() } }
  );
  await logActivity({ userId, action: `case:${decision}`, meta: { caseId, caseNumber: record.caseNumber } });
  return NextResponse.json({ success: true });
}
