import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export function requireRole(allowedRoles: string[]) {
  return async (req: NextRequest) => {
    const { userId, sessionClaims } = auth();
    if (!userId || !sessionClaims?.role || !allowedRoles.includes(sessionClaims.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null; // Allowed
  };
}
