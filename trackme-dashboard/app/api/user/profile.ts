import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const profile = await db.collection("users").findOne({ userId });
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const { name, email } = await req.json();
  await db.collection("users").updateOne({ userId }, { $set: { name, email } }, { upsert: true });
  return NextResponse.json({ success: true });
}
