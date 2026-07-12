import { NextResponse } from "next/server";
import { getRuntimeLocations } from "../../../../src/api/runtimeStore";

export async function GET(req: Request) {
  try {
    const locations = await getRuntimeLocations();
    const events = locations.map((loc) => ({ type: "location-update", payload: loc }));
    return NextResponse.json({ events });
  } catch (e) {
    console.error("Realtime poll failed", e);
    return NextResponse.json({ events: [] });
  }
}
