import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// User roles: super_admin, control_room, dispatcher, patrol_officer, analyst, field_agent

export async function POST(req: Request) {
  const { action, email, password, role } = await req.json();
  const db = await getDb();

  if (action === "register") {
    const existing = await db.collection("users").findOne({ email });
    if (existing) return NextResponse.json({ error: "User exists" }, { status: 400 });
    const hash = await bcrypt.hash(password, 10);
    const user = { email, password: hash, role: role || "field_agent", createdAt: new Date().toISOString() };
    await db.collection("users").insertOne(user);
    return NextResponse.json({ success: true });
  }

  if (action === "login") {
    const user = await db.collection("users").findOne({ email });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    return NextResponse.json({ token, role: user.role });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
