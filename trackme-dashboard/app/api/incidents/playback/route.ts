import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../src/api/db";
import { logActivity } from "../../../../src/api/logActivity";
import { hasPermission } from "../../../../src/api/permissions";
import { rateLimit } from "../../../../src/api/rateLimit";
import { resolveSession } from "../../../../src/api/authSession";

/**
 * Incident Playback & Export API
 * Allows viewing historical incident data, location trails, and status timelines
 * Supports export of incident reports in multiple formats
 */

// GET: Retrieve incident playback data (historical timeline and location data)
export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permissions
  const canViewPlayback =
    hasPermission({ role }, "intelligence:playback") ||
    hasPermission({ role }, "incident:view");

  if (!canViewPlayback) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!rateLimit(userId + ":incidents:playback:get")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { incidentId, format = "json" } = Object.fromEntries(
    new URL(req.url).searchParams
  );

  if (!incidentId) {
    return NextResponse.json({ error: "incidentId required" }, { status: 400 });
  }

  const db = await getDb();
  const selector = ObjectId.isValid(incidentId)
    ? { _id: new ObjectId(incidentId) }
    : { id: String(incidentId) };

  const incident = await db.collection("incidents").findOne(selector);
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  // Permission check: super_admin sees all, others see only assigned/created
  if (
    role !== "super_admin" &&
    incident.createdBy !== userId &&
    !incident.assignedUnits?.includes(userId)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Compile playback data
  const playbackData: any = {
    incident: {
      id: incident._id,
      type: incident.type,
      title: incident.title,
      status: incident.status,
      location: incident.location,
      createdAt: incident.createdAt,
      createdBy: incident.createdBy,
      updatedAt: incident.updatedAt,
    },
    timeline: incident.timeline || [],
    assignedUnits: incident.assignedUnits || [],
    locations: [], // Will be populated from location history
    unitTrails: {}, // Trails for each assigned unit
  };

  // Get location history for incident duration
  const startTime = new Date(incident.createdAt);
  const endTime = new Date(incident.updatedAt || incident.createdAt);
  endTime.setHours(endTime.getHours() + 1); // Extend 1 hour past update

  const locationHistory = await db
    .collection("locations")
    .find({
      userId: { $in: incident.assignedUnits || [] },
      timestamp: { $gte: startTime, $lte: endTime },
    })
    .sort({ timestamp: 1 })
    .toArray();

  playbackData.locations = locationHistory;

  // Organize by unit
  incident.assignedUnits?.forEach((unitId: string) => {
    playbackData.unitTrails[unitId] = locationHistory.filter(
      (loc: any) => loc.userId === unitId
    );
  });

  await logActivity({
    userId,
    action: "incident:playback:view",
    meta: { incidentId, format },
  });

  // Format response based on request
  if (format === "csv") {
    return exportIncidentAsCSV(playbackData);
  }

  if (format === "pdf") {
    return NextResponse.json(
      { error: "PDF export not yet implemented" },
      { status: 501 }
    );
  }

  return NextResponse.json({ playback: playbackData });
}

// POST: Export incident report
export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission({ role }, "intelligence:export:reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!rateLimit(userId + ":incidents:export:post")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const {
    incidentId,
    format = "json",
    includeMedia = false,
    includeNotes = true,
  } = body;

  if (!incidentId) {
    return NextResponse.json({ error: "incidentId required" }, { status: 400 });
  }

  const db = await getDb();
  const selector = ObjectId.isValid(incidentId)
    ? { _id: new ObjectId(incidentId) }
    : { id: String(incidentId) };

  const incident = await db.collection("incidents").findOne(selector);
  if (!incident) {
    return NextResponse.json({ error: "Incident not found" }, { status: 404 });
  }

  // Compile export data
  const exportData = {
    reportGeneratedAt: new Date().toISOString(),
    generatedBy: userId,
    incident: {
      id: incident._id,
      type: incident.type,
      title: incident.title,
      description: incident.description,
      status: incident.status,
      location: incident.location,
      severity: incident.severity,
      createdAt: incident.createdAt,
      createdBy: incident.createdBy,
      updatedAt: incident.updatedAt,
      closedAt: incident.closedAt,
    },
    timeline: incident.timeline || [],
    assignedUnits: incident.assignedUnits || [],
    ...(includeNotes && { notes: incident.notes || [] }),
    ...(includeMedia && { mediaAttachments: incident.media || [] }),
  };

  await logActivity({
    userId,
    action: "incident:export",
    meta: { incidentId, format, includeMedia },
  });

  // Format based on request
  if (format === "csv") {
    return exportIncidentAsCSV(exportData);
  }

  if (format === "json") {
    return NextResponse.json(
      { success: true, data: exportData },
      {
        headers: {
          "Content-Disposition": `attachment; filename="incident-${incidentId}-${Date.now()}.json"`,
          "Content-Type": "application/json",
        },
      }
    );
  }

  return NextResponse.json(
    { error: "Unsupported format" },
    { status: 400 }
  );
}

/**
 * Helper: Export incident as CSV
 */
function exportIncidentAsCSV(data: any) {
  let csv = "Incident Report\n\n";

  // Incident details
  csv += "INCIDENT DETAILS\n";
  csv += `ID,${data.incident?.id || data.incident.id}\n`;
  csv += `Type,${data.incident?.type || data.incident.type}\n`;
  csv += `Title,${data.incident?.title || data.incident.title}\n`;
  csv += `Status,${data.incident?.status || data.incident.status}\n`;
  csv += `Created At,${data.incident?.createdAt || data.incident.createdAt}\n`;
  csv += `Updated At,${data.incident?.updatedAt || data.incident.updatedAt}\n\n`;

  // Timeline
  csv += "TIMELINE\n";
  csv += "Timestamp,Status,Notes\n";
  (data.timeline || []).forEach((entry: any) => {
    csv += `"${entry.time}","${entry.status}","${entry.notes || ''}"\n`;
  });

  csv += "\n";

  // Locations (if available)
  if (data.locations && data.locations.length > 0) {
    csv += "UNIT LOCATIONS\n";
    csv += "Unit ID,Latitude,Longitude,Timestamp,Speed,Accuracy\n";
    data.locations.forEach((loc: any) => {
      csv += `${loc.userId},${loc.coordinates?.lat || ""},${loc.coordinates?.lng || ""},${loc.timestamp},${loc.speed || ""},${loc.accuracy || ""}\n`;
    });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="incident-${data.incident?.id}-${Date.now()}.csv"`,
    },
  });
}
