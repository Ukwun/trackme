import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { resolveSession } from "../../../src/api/authSession";
import { logActivity } from "../../../src/api/logActivity";

// Create consent. Optional `expiresInDays` to set an expiry; default = 3650 days (~10 years)
export async function POST(req: Request) {
  const { userId } = await resolveSession(req);
  const body = await req.json();
  const { deviceId, phone, imei, name, expiresInDays } = body;
  if (!deviceId && !imei && !phone) {
    return NextResponse.json({ error: "deviceId, imei, or phone required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const now = new Date();
    // Support permanent consent: either pass { permanent: true } or expiresInDays = 0
    const permanent = body.permanent === true || Number(expiresInDays) === 0;
    let expiresAt: string | null;
    if (permanent) {
      expiresAt = null;
    } else {
      const days = Number.isFinite(Number(expiresInDays)) ? Number(expiresInDays) : 3650;
      expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    }

    const doc = {
      deviceId: deviceId || null,
      imei: imei || null,
      phone: phone || null,
      name: name || null,
      granted: true,
      grantedBy: userId || "anonymous",
      grantedAt: now.toISOString(),
      expiresAt,
      permanent: permanent || false,
    };
    await db.collection("authorized_consents").insertOne(doc);
    await logActivity({ userId: userId || null, action: "consent:grant", meta: { deviceId, imei, phone } });
    return NextResponse.json({ success: true, consent: doc });
  } catch (e) {
    console.error("Consent creation failed", e);
    return NextResponse.json({ error: "Consent creation failed" }, { status: 500 });
  }
}

// GET /api/consent?deviceId=...&imei=...&phone=...  - returns a valid, unexpired consent if present
export async function GET(req: Request) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId");
  const imei = url.searchParams.get("imei");
  const phone = url.searchParams.get("phone");

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const ors: any[] = [];
    if (deviceId) ors.push({ deviceId });
    if (imei) ors.push({ imei });
    if (phone) ors.push({ phone });
    if (ors.length === 0) return NextResponse.json({ consent: null });

    // Match either permanent (expiresAt === null OR permanent flag) OR expiresAt > now
    const consent = await db.collection("authorized_consents").findOne({
      $and: [
        { granted: true },
        { $or: [ { permanent: true }, { expiresAt: null }, { expiresAt: { $gt: now } } ] },
        { $or: ors },
      ],
    });
    if (!consent) return NextResponse.json({ consent: null });
    return NextResponse.json({ consent });
  } catch (e) {
    console.error("Consent check failed", e);
    return NextResponse.json({ error: "Consent check failed" }, { status: 500 });
  }
}

// DELETE /api/consent  with JSON body { _id } or query params (deviceId/imei/phone) to revoke
export async function DELETE(req: Request) {
  const { userId, role } = await resolveSession(req);
  const url = new URL(req.url);
  const deviceId = url.searchParams.get("deviceId");
  const imei = url.searchParams.get("imei");
  const phone = url.searchParams.get("phone");

  try {
    const db = await getDb();
    let result;
    if (deviceId || imei || phone) {
      const selector: any = { $or: [] };
      if (deviceId) selector.$or.push({ deviceId });
      if (imei) selector.$or.push({ imei });
      if (phone) selector.$or.push({ phone });
      selector.$or.push({ granted: true });
      result = await db.collection("authorized_consents").updateMany(selector, { $set: { granted: false, revokedAt: new Date().toISOString(), revokedBy: userId || null } });
    } else {
      const body = await req.json().catch(() => ({}));
      if (!body || !body._id) return NextResponse.json({ error: "_id required to delete specific consent" }, { status: 400 });
      const { ObjectId } = await import("mongodb");
      result = await db.collection("authorized_consents").updateOne({ _id: new ObjectId(body._id) }, { $set: { granted: false, revokedAt: new Date().toISOString(), revokedBy: userId || null } });
    }
    await logActivity({ userId: userId || null, action: "consent:revoke", meta: { deviceId, imei, phone } });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error("Consent revoke failed", e);
    return NextResponse.json({ error: "Consent revoke failed" }, { status: 500 });
  }
}
