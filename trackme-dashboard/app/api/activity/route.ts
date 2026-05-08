import { NextResponse } from "next/server";
import { logActivity, getUserActivity } from "../../../src/api/activity";
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

export async function POST(req: Request) {
  const user = verifyToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { action, meta } = await req.json();
  await logActivity(user.userId, action, meta);
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const user = verifyToken(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await getUserActivity(user.userId);
  return NextResponse.json({ logs });
}
