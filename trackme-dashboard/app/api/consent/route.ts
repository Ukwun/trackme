import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { resolveSession } from "../../../src/api/authSession";
import { logActivity } from "../../../src/api/logActivity";
import { upsertRuntimeConsent, getRuntimeConsent, revokeRuntimeConsent } from "../../../src/api/runtimeStore";

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
    // DB unavailable — fall back to runtime consent store so local workflows continue
    console.error("Consent creation DB failed, falling back to runtime store", e);
    try {
      const runtimeDoc = await upsertRuntimeConsent({ deviceId, imei, phone, name, granted: true, grantedBy: userId || null, grantedAt: new Date().toISOString(), expiresAt: null, permanent: true });
      await logActivity({ userId: userId || null, action: "consent:grant:runtime", meta: { deviceId, imei, phone } }).catch(() => undefined);
      return NextResponse.json({ success: true, consent: runtimeDoc, runtime: true });
    } catch (re) {
      console.error("Runtime consent creation also failed", re);
      return NextResponse.json({ error: "Consent creation failed" }, { status: 500 });
    }
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
    if (consent) return NextResponse.json({ consent });
    // fallback to runtime store
    const runtime = await getRuntimeConsent({ deviceId, imei, phone });
    if (runtime) return NextResponse.json({ consent: runtime, runtime: true });
    return NextResponse.json({ consent: null });
  } catch (e) {
    // DB error: try runtime store
    console.error("Consent check DB failed, trying runtime store", e);
    try {
      const runtime = await getRuntimeConsent({ deviceId, imei, phone });
      if (runtime) return NextResponse.json({ consent: runtime, runtime: true });
      return NextResponse.json({ consent: null });
    } catch (re) {
      console.error("Consent check failed (db+runtime)", re);
      return NextResponse.json({ error: "Consent check failed" }, { status: 500 });
    }
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
      const identities: Array<Record<string, string>> = [];
      if (deviceId) identities.push({ deviceId });
      if (imei) identities.push({ imei });
      if (phone) identities.push({ phone });
      const selector = { granted: true, $or: identities };
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
    console.error("Consent revoke DB failed, falling back to runtime", e);
    try {
      const runtimeRes = await revokeRuntimeConsent({ deviceId, imei, phone });
      await logActivity({ userId: userId || null, action: "consent:revoke:runtime", meta: { deviceId, imei, phone } }).catch(() => undefined);
      return NextResponse.json({ success: true, result: runtimeRes, runtime: true });
    } catch (re) {
      console.error("Consent revoke failed (db+runtime)", re);
      return NextResponse.json({ error: "Consent revoke failed" }, { status: 500 });
    }
  }
}
