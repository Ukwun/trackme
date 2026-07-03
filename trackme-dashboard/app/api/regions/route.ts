import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";
import { emitRealtimeEvent } from "../../../src/realtime/server";

/**
 * Region/Zone Management API
 * Allows SUPER_ADMIN to create organizational regions and manage jurisdictions
 */

// POST: Create new region (SUPER_ADMIN only)
export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "region:*") && !hasPermission({ role }, "user:create:regions")) {
    return NextResponse.json({ error: "Forbidden - Super Admin only" }, { status: 403 });
  }
  if (!rateLimit(userId+":regions:post")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const { name, description, center, boundaries, jurisdiction } = body;

  if (!name || !center) {
    return NextResponse.json(
      { error: "Region name and center coordinates required" },
      { status: 400 }
    );
  }

  const db = await getDb();

  // Check for duplicate region name
  const exists = await db.collection("regions").findOne({ name });
  if (exists) {
    return NextResponse.json({ error: "Region with this name already exists" }, { status: 400 });
  }

  const region = {
    name,
    description: description || "",
    center, // { lat, lng }
    boundaries: boundaries || [], // Array of coordinate points forming polygon
    jurisdiction: jurisdiction || "general",
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    officers: [], // Array of officer IDs assigned to this region
    status: "active",
  };

  const result = await db.collection("regions").insertOne(region);
  const created = { ...region, _id: result.insertedId };

  await logActivity({
    userId,
    action: "region:create",
    meta: { regionId: result.insertedId, name, jurisdiction },
  });

  emitRealtimeEvent("region-created", created);

  return NextResponse.json({ success: true, region: created });
}

// GET: List all regions
export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "region:*") && !hasPermission({ role }, "user:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":regions:get")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const db = await getDb();
  const regions = await db.collection("regions")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  await logActivity({
    userId,
    action: "region:list",
    meta: { count: regions.length },
  });

  return NextResponse.json({ regions });
}

// PATCH: Update region (assign officers, edit details)
export async function PATCH(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "region:*")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":regions:patch")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const { regionId, name, description, boundaries, addOfficer, removeOfficer, status } = body;

  if (!regionId) {
    return NextResponse.json({ error: "regionId required" }, { status: 400 });
  }

  const db = await getDb();
  const selector = ObjectId.isValid(regionId)
    ? { _id: new ObjectId(regionId) }
    : { id: String(regionId) };

  const region = await db.collection("regions").findOne(selector);
  if (!region) {
    return NextResponse.json({ error: "Region not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };

  if (name) update.name = name;
  if (description !== undefined) update.description = description;
  if (boundaries) update.boundaries = boundaries;
  if (status) update.status = status;

  // Handle officer assignments
  let officers = region.officers || [];
  if (addOfficer) {
    if (!officers.includes(addOfficer)) {
      officers.push(addOfficer);
    }
    await logActivity({
      userId,
      action: "region:assign:officer",
      meta: { regionId, officerId: addOfficer },
    });
  }

  if (removeOfficer) {
    officers = officers.filter((o: string) => o !== removeOfficer);
    await logActivity({
      userId,
      action: "region:remove:officer",
      meta: { regionId, officerId: removeOfficer },
    });
  }

  if (addOfficer || removeOfficer) {
    update.officers = officers;
  }

  const result = await db.collection("regions").updateOne(selector, { $set: update });
  if (!result.modifiedCount) {
    return NextResponse.json({ error: "Failed to update region" }, { status: 400 });
  }

  const updated = await db.collection("regions").findOne(selector);

  await logActivity({
    userId,
    action: "region:update",
    meta: { regionId, changes: Object.keys(update) },
  });

  emitRealtimeEvent("region-updated", updated);

  return NextResponse.json({ success: true, region: updated });
}

// DELETE: Remove region
export async function DELETE(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "region:*")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":regions:delete")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const { regionId } = body;

  if (!regionId) {
    return NextResponse.json({ error: "regionId required" }, { status: 400 });
  }

  const db = await getDb();
  const selector = ObjectId.isValid(regionId)
    ? { _id: new ObjectId(regionId) }
    : { id: String(regionId) };

  const region = await db.collection("regions").findOne(selector);
  if (!region) {
    return NextResponse.json({ error: "Region not found" }, { status: 404 });
  }

  const result = await db.collection("regions").deleteOne(selector);
  if (!result.deletedCount) {
    return NextResponse.json({ error: "Failed to delete region" }, { status: 400 });
  }

  await logActivity({
    userId,
    action: "region:delete",
    meta: { regionId, regionName: region.name },
  });

  emitRealtimeEvent("region-deleted", { regionId });

  return NextResponse.json({ success: true, message: "Region deleted" });
}
