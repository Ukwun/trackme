import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";

// POST: Share a device with another user
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { phone, imei, targetUserId } = body;
  if (!phone || !imei || !targetUserId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const db = await getDb();
  await db.collection("device_shares").insertOne({ phone, imei, owner: userId, targetUserId, sharedAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

// GET: List devices shared with the current user
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = await getDb();
  const shares = await db.collection("device_shares").find({ targetUserId: userId }).sort({ sharedAt: -1 }).toArray();
  return NextResponse.json({ shares });
}
