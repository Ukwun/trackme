import { NextRequest, NextResponse } from "next/server";
import { listUsers, updateUserRole } from "../../../src/api/user";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";

export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "admin:view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":admin:get")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const users = await listUsers();
  await logActivity({ userId, action: "admin:list-users", meta: {} });
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission({ role }, "admin:edit")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!rateLimit(userId+":admin:patch")) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  const { userId: targetUserId, role: nextRole } = await req.json();
  await updateUserRole(targetUserId, nextRole);
  await logActivity({ userId, action: "admin:change-role", meta: { targetUserId, role: nextRole } });
  return NextResponse.json({ success: true });
}
