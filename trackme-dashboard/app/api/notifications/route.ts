import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";
import { Server } from "socket.io";

// Stub functions for external delivery
async function sendSMS(message, userId) {
  // Integrate with SMS provider here
  return true;
}
async function sendPush(message, userId) {
  // Integrate with push notification service here
  return true;
}
async function sendEmail(message, userId) {
  // Integrate with email provider here
  return true;
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { message, type, delivery } = body;
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });
  const db = await getDb();
  await db.collection("notifications").insertOne({ userId, message, type: type || "info", createdAt: new Date().toISOString() });
  // Emit real-time event
  try {
    if ((global as any).io) {
      (global as any).io.emit('notification-update', { userId });
    }
  } catch {}
  // External delivery
  if (delivery?.includes("sms")) await sendSMS(message, userId);
  if (delivery?.includes("push")) await sendPush(message, userId);
  if (delivery?.includes("email")) await sendEmail(message, userId);
  return NextResponse.json({ success: true });
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const notifications = await db.collection("notifications").find({ userId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ notifications });
}
