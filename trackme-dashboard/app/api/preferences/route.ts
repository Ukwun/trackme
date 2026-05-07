import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const pref = await db.collection("preferences").findOne({ userId });
  return NextResponse.json({ preferences: pref || {} });
}

export async function POST(req: Request) {
  const { userId } = auth();
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
