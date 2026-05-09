import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { buildUserSelector, resolveSession } from "../../../src/api/authSession";

export async function GET(req: NextRequest) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const profile = await db.collection("users").findOne(buildUserSelector(userId));
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const { name, email } = await req.json();
  await db.collection("users").updateOne(buildUserSelector(userId), { $set: { name, email } }, { upsert: false });
  return NextResponse.json({ success: true });
}
