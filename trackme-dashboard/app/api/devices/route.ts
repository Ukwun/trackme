import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  if (!userId || !sessionClaims?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role: sessionClaims.role }, "device:create")) {
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
  const device = { phone, imei, name: name || "", owner: userId, registeredAt: new Date().toISOString() };
  await db.collection("devices").insertOne(device);
  await logActivity({ userId, action: "device:register", meta: { phone, imei, name } });
  return NextResponse.json({ success: true, device });
}

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  if (!userId || !sessionClaims?.role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role: sessionClaims.role }, "device:view")) {
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
