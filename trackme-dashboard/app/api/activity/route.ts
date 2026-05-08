import { NextRequest, NextResponse } from "next/server";
import { logActivity, getUserActivity } from "../../../src/api/activity";
import { auth } from "@clerk/nextjs/server";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  if (!userId || !sessionClaims?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role: sessionClaims.role }, "analytics:create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":activity:post")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const { action, meta } = await req.json();
  await logActivity({ userId, action, meta });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { userId, sessionClaims } = auth();
  if (!userId || !sessionClaims?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role: sessionClaims.role }, "analytics:view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":activity:get")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const logs = await getUserActivity(userId);
  return NextResponse.json({ logs });
}
