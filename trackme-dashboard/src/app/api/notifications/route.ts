import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

let notifications: any[] = [];

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { message, type } = body;
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });
  notifications.push({ userId, message, type: type || "info", createdAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ notifications: notifications.filter(n => n.userId === userId) });
}
