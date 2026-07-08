
import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";
import { resolveSession } from "../../../src/api/authSession";

export async function POST(req: Request) {
  const { userId } = await resolveSession(req);
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
