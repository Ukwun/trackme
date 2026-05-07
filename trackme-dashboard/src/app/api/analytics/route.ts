import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

let analytics: any[] = [];

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  analytics.push({ userId, ...body, createdAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ analytics: analytics.filter(a => a.userId === userId) });
}
