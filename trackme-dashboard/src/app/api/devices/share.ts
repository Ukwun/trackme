import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

let shares: any[] = [];

// POST: Share a device with another user
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { phone, imei, targetUserId } = body;
  if (!phone || !imei || !targetUserId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  // Simulate sharing
  shares.push({ phone, imei, owner: userId, targetUserId, sharedAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

// GET: List devices shared with the current user
export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sharedWithMe = shares.filter((s) => s.targetUserId === userId);
  return NextResponse.json({ shares: sharedWithMe });
}
