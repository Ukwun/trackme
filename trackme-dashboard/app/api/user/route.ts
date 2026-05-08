import { NextResponse } from "next/server";
import { getUserById, getUserByEmail, updateUserRole, listUsers } from "../../../src/api/user";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function verifyToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  try {
    return jwt.verify(auth.replace("Bearer ", ""), JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = verifyToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Only super_admin can list all users
  if (user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  const user = verifyToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { userId, role } = await req.json();
  await updateUserRole(userId, role);
  return NextResponse.json({ success: true });
}
