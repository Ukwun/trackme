import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

let devices: any[] = [];

export async function GET() {
  return NextResponse.json({ devices });
}

export async function DELETE(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { phone, imei } = await req.json();
  if (!phone && !imei) {
    return NextResponse.json({ error: "Phone or IMEI required" }, { status: 400 });
  }
  // Only allow users to remove their own devices
  devices = devices.filter(
    (d) => !(d.phone === phone && d.imei === imei && d.owner === userId)
  );
  return NextResponse.json({ success: true });
}
