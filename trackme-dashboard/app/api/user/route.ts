import { NextRequest, NextResponse } from "next/server";
import { listUsers } from "../../../src/api/user";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";
import { transitionRole, getRoleAuditHistory, getOrganizationalStructure } from "../../../src/api/roleManagement";
import type { RoleName } from "../../../src/api/roleHierarchy";

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
  
  const { userId: targetUserId, role: nextRole, reason } = await req.json();
  
  // Use new role hierarchy-aware transition system
  const result = await transitionRole(targetUserId, nextRole as RoleName, userId, reason);
  
  if (!result.success) {
    await logActivity({
      userId,
      action: "admin:change-role:failed",
      meta: { targetUserId, role: nextRole, error: result.error }
    });
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }
  
  await logActivity({
    userId,
    action: "admin:change-role:success",
    meta: { targetUserId, role: nextRole, event: result.event }
  });
  
  return NextResponse.json({ success: true, event: result.event });
}
