import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import bcrypt from "bcryptjs";
import { createAuthToken } from "../../../src/api/authSession";

type LocalUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
};

const localUsers = new Map<string, LocalUser>();

function getRegistrationRole() {
  return "field_agent";
}

async function handleWithLocalStore(
  action: string,
  email: string,
  password: string
) {
  if (action === "register") {
    const existing = localUsers.get(email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "User exists" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const user: LocalUser = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      email,
      password: hash,
      role: getRegistrationRole(),
      createdAt: new Date().toISOString(),
    };
    localUsers.set(email.toLowerCase(), user);
    return NextResponse.json({ success: true, mode: "local-dev" });
  }

  if (action === "login") {
    const user = localUsers.get(email.toLowerCase());
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createAuthToken(user.id, user.role);
    return NextResponse.json({ token, role: user.role, mode: "local-dev" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// User roles: super_admin, control_room, dispatcher, patrol_officer, analyst, field_agent

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const action = body?.action;
    const email = body?.email;
    const password = body?.password;
    if (action !== "register" && action !== "login") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const db = await getDb();

      if (action === "register") {
        const existing = await db.collection("users").findOne({ email: normalizedEmail });
        if (existing) return NextResponse.json({ error: "User exists" }, { status: 400 });
        const hash = await bcrypt.hash(password, 10);
        const user = {
          email: normalizedEmail,
          password: hash,
          role: getRegistrationRole(),
          createdAt: new Date().toISOString(),
        };
        await db.collection("users").insertOne(user);
        return NextResponse.json({ success: true, mode: "mongo" });
      }

      const user = await db.collection("users").findOne({ email: normalizedEmail });
      if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      const token = createAuthToken(String(user._id), user.role);
      return NextResponse.json({ token, role: user.role, mode: "mongo" });
    } catch (dbError) {
      const message = dbError instanceof Error ? dbError.message : String(dbError);
      const allowLocalFallback = process.env.AUTH_ALLOW_LOCAL_FALLBACK === "true";
      if (allowLocalFallback) {
        return handleWithLocalStore(action, normalizedEmail, password);
      }
      return NextResponse.json({ error: "Authentication backend unavailable", details: message }, { status: 503 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
