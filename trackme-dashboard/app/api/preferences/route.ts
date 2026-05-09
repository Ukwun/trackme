import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { resolveSession } from "../../../src/api/authSession";

export async function GET(req: Request) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const pref = await db.collection("preferences").findOne({ userId });
  return NextResponse.json({ preferences: pref || {} });
}

export async function POST(req: Request) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = await getDb();
  await db.collection("preferences").updateOne(
    { userId },
    { $set: body },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}
