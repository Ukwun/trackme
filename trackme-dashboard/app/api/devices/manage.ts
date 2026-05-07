import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDb } from "../../../src/api/db";

export async function GET() {
  const db = await getDb();
  const devices = await db.collection("devices").find({}).sort({ registeredAt: -1 }).toArray();
  return NextResponse.json({ devices });
}

  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { phone, imei } = await req.json();
  if (!phone && !imei) {
    return NextResponse.json({ error: "Phone or IMEI required" }, { status: 400 });
  }
  const db = await getDb();
  await db.collection("devices").deleteOne({ phone, imei, owner: userId });
  return NextResponse.json({ success: true });
}
