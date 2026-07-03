import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../src/api/db";
import { resolveSession } from "../../../../src/api/authSession";
import { hasPermission } from "../../../../src/api/permissions";
import { rateLimit } from "../../../../src/api/rateLimit";

export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canManageDevices = hasPermission({ role }, "device:create") || hasPermission({ role }, "device:*");
  if (!canManageDevices) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(`${userId}:devices:manage:get`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const db = await getDb();
  const devices = await db.collection("devices").find({ owner: userId }).sort({ registeredAt: -1 }).toArray();
  return NextResponse.json({ devices });
}

export async function DELETE(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canManageDevices = hasPermission({ role }, "device:create") || hasPermission({ role }, "device:*");
  if (!canManageDevices) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(`${userId}:devices:manage:delete`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { phone, imei } = await req.json();
  if (!phone && !imei) {
    return NextResponse.json({ error: "Phone or IMEI required" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("devices").deleteOne({ phone, imei, owner: userId });
  if (!result.deletedCount) {
    return NextResponse.json({ error: "Device not found or not owned by user" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
