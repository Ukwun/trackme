import { NextRequest, NextResponse } from "next/server";
import { logActivity, getUserActivity } from "../../../src/api/activity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";

export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "analytics:create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":activity:post")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const { action, meta } = await req.json();
  await logActivity(userId, action, meta);
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "analytics:view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":activity:get")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const logs = await getUserActivity(userId);
  return NextResponse.json({ logs });
}
