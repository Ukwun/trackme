/**
 * Role Hierarchy API Route
 * 
 * Handles:
 * - Organizational structure retrieval
 * - Role audit history
 * - Real-time hierarchy queries
 * - Role statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "../../../src/api/authSession";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { logActivity } from "../../../src/api/logActivity";
import {
  getOrganizationalStructure,
  getRoleAuditHistory,
  getRoleStatistics,
} from "../../../src/api/roleManagement";
import { canManageRole, getSuperiors, getSubordinates } from "../../../src/api/roleHierarchy";
import type { RoleName } from "../../../src/api/roleHierarchy";

/**
 * GET /api/hierarchy
 * Retrieve organizational structure and role information
 */
export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const query = url.searchParams.get("query");

  try {
    if (query === "structure") {
      // Get full organizational structure
      if (!hasPermission({ role }, "admin:view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!rateLimit(userId + ":hierarchy:structure")) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      const structure = await getOrganizationalStructure();
      await logActivity({ userId, action: "hierarchy:view:structure", meta: {} });
      return NextResponse.json({ structure });
    }

    if (query === "statistics") {
      // Get role statistics
      if (!hasPermission({ role }, "analytics:view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!rateLimit(userId + ":hierarchy:stats")) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      const stats = await getRoleStatistics();
      await logActivity({ userId, action: "hierarchy:view:stats", meta: {} });
      return NextResponse.json({ statistics: stats });
    }

    if (query === "audit") {
      // Get role audit history
      if (!hasPermission({ role }, "admin:view")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!rateLimit(userId + ":hierarchy:audit")) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      }

      const targetUserId = url.searchParams.get("userId");
      const history = await getRoleAuditHistory(targetUserId || userId);
      await logActivity({
        userId,
        action: "hierarchy:view:audit",
        meta: { targetUserId: targetUserId || userId },
      });
      return NextResponse.json({ history });
    }

    if (query === "superiors") {
      // Get superior roles in hierarchy
      const userRole = role as RoleName;
      const superiors = getSuperiors(userRole);
      return NextResponse.json({ superiors });
    }

    if (query === "subordinates") {
      // Get subordinate roles
      const userRole = role as RoleName;
      const subordinates = getSubordinates(userRole);
      return NextResponse.json({ subordinates });
    }

    return NextResponse.json({ error: "Unknown query" }, { status: 400 });
  } catch (error) {
    console.error("Hierarchy API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hierarchy
 * Perform hierarchy operations (role transitions, assignments, etc.)
 */
export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission({ role }, "admin:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!rateLimit(userId + ":hierarchy:write")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { action, data } = body;

    if (action === "validate-transition") {
      // Validate if a role transition is allowed
      const { targetRole, newRole } = data;
      const userRole = role as RoleName;

      const canManage = canManageRole(userRole, newRole);
      return NextResponse.json({
        allowed: canManage,
        reason: canManage
          ? "Transition allowed"
          : `Cannot assign ${newRole} - insufficient authority`,
      });
    }

    if (action === "check-relationships") {
      // Check role relationships
      const { targetRole } = data;
      const userRole = role as RoleName;

      return NextResponse.json({
        canManage: canManageRole(userRole, targetRole as RoleName),
        superiors: getSuperiors(userRole),
        subordinates: getSubordinates(userRole),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Hierarchy POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
