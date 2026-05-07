import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";

  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { phone, imei, name } = body;
  if (!phone || !imei) {
    return NextResponse.json({ error: "Phone and IMEI required" }, { status: 400 });
  }
  const db = await getDb();
  const device = { phone, imei, name: name || "", owner: userId, registeredAt: new Date().toISOString() };
  await db.collection("devices").insertOne(device);
  return NextResponse.json({ success: true, device });
}

export async function GET() {
  const db = await getDb();
  const devices = await db.collection("devices").find({}).sort({ registeredAt: -1 }).toArray();
  return NextResponse.json({ devices });
}
