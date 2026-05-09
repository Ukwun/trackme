import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../src/api/db";
import { resolveSession } from "../../../../src/api/authSession";
import { hasPermission } from "../../../../src/api/permissions";
import { rateLimit } from "../../../../src/api/rateLimit";

export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "device:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(`${userId}:devices:share:post`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { phone, imei, targetUserId } = await req.json();
  if (!phone || !imei || !targetUserId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = await getDb();
  const ownedDevice = await db.collection("devices").findOne({ phone, imei, owner: userId });
  if (!ownedDevice) {
    return NextResponse.json({ error: "Device not found or not owned by user" }, { status: 404 });
  }

  await db.collection("device_shares").updateOne(
    { phone, imei, owner: userId, targetUserId },
    { $set: { sharedAt: new Date().toISOString() } },
    { upsert: true }
  );

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "device:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(`${userId}:devices:share:get`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const db = await getDb();
  const shares = await db.collection("device_shares").find({ targetUserId: userId }).sort({ sharedAt: -1 }).toArray();
  return NextResponse.json({ shares });
}
