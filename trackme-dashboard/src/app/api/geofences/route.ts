import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

let geofences: any[] = [];

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, center, radius } = body;
  if (!name || !center || !radius) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  geofences.push({ userId, name, center, radius, createdAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ geofences: geofences.filter(g => g.userId === userId) });
}
