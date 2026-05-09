import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "../api/authSession";

export function requireRole(allowedRoles: string[]) {
  return async (req: NextRequest) => {
    const { userId, role } = await resolveSession(req);
    if (!userId || !role || !allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null; // Allowed
  };
}
