import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";

export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "device:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":devices:post")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const body = await req.json();
  const { phone, imei, name } = body;
  if (!phone || !imei) {
    return NextResponse.json({ error: "Phone and IMEI required" }, { status: 400 });
  }
  const db = await getDb();
  // Ensure phone and IMEI are unique
  const exists = await db.collection("devices").findOne({ $or: [ { phone }, { imei } ] });
  if (exists) {
    return NextResponse.json({ error: "Device with this phone or IMEI already exists" }, { status: 400 });
  }
  const device = { phone, imei, name: name || "", owner: userId, registeredAt: new Date().toISOString() };
  await db.collection("devices").insertOne(device);
  await logActivity({ userId, action: "device:register", meta: { phone, imei, name } });
  return NextResponse.json({ success: true, device });
}

export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "device:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":devices:get")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const db = await getDb();
  const devices = await db.collection("devices").find({ owner: userId }).sort({ registeredAt: -1 }).toArray();
  await logActivity({ userId, action: "device:list", meta: {} });
  return NextResponse.json({ devices });
}
