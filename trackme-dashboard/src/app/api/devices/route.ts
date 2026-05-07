import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

let devices: any[] = [];

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { phone, imei, name } = body;
  if (!phone || !imei) {
    return NextResponse.json({ error: "Phone and IMEI required" }, { status: 400 });
  }
  // Simulate device registration with ownership
  const device = { phone, imei, name: name || "", owner: userId, registeredAt: new Date().toISOString() };
  devices.push(device);
  return NextResponse.json({ success: true, device });
}

export async function GET() {
  return NextResponse.json({ devices });
}
