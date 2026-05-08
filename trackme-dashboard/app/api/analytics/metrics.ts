import { NextResponse } from "next/server";
import { getDb } from "../../../src/api/db";

export async function GET() {
  const db = await getDb();
  // Active units (last 5 min)
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const activeUnits = await db.collection("location_history").distinct("deviceId", { timestamp: { $gte: fiveMinAgo } });
  // Avg response time (incident timeline)
  const incidents = await db.collection("incidents").find({}).toArray();
  let totalResponse = 0, count = 0;
  for (const inc of incidents) {
    const reported = inc.timeline?.find((t: any) => t.status === "Reported");
    const arrived = inc.timeline?.find((t: any) => t.status === "Arrived");
    if (reported && arrived) {
      const t1 = new Date(reported.time).getTime();
      const t2 = new Date(arrived.time).getTime();
      if (!isNaN(t1) && !isNaN(t2)) {
        totalResponse += (t2 - t1);
        count++;
      }
    }
  }
  const avgResponseTime = count ? Math.round(totalResponse / count / 1000) : 0;
  // Patrol coverage (unique units in last 24h)
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const patrolUnits = await db.collection("location_history").distinct("deviceId", { timestamp: { $gte: dayAgo } });
  const patrolCoverage = Math.round((patrolUnits.length / (activeUnits.length || 1)) * 100);
  // Route efficiency (dummy value)
  const routeEfficiency = 90;
  // Incident density (last 24h)
  const incidentDensity = await db.collection("incidents").countDocuments({ createdAt: { $gte: new Date(dayAgo).toISOString() } });
  // Heatmap data (dummy)
  const heatmapData = { labels: ["Zone 1", "Zone 2"], datasets: [{ data: [10, 20] }] };
  // Timeline data (dummy)
  const timelineData = { labels: ["08:00", "12:00", "16:00"], datasets: [{ label: "Incidents", data: [2, 5, 3] }] };
  // Zone stats (dummy)
  const zoneStats = { labels: ["Safe", "Restricted", "High-Risk"], datasets: [{ label: "Events", data: [12, 7, 15] }] };
  return NextResponse.json({ activeUnits: activeUnits.length, avgResponseTime, patrolCoverage, routeEfficiency, incidentDensity, heatmapData, timelineData, zoneStats });
}
