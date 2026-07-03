import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../src/api/db";
import { logActivity } from "../../../src/api/logActivity";
import { hasPermission, canManageUser } from "../../../src/api/permissions";
import { rateLimit } from "../../../src/api/rateLimit";
import { resolveSession } from "../../../src/api/authSession";
import { emitRealtimeEvent } from "../../../src/realtime/server";

// POST: Register a new device (phone + IMEI)
export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission({ role }, "device:register:phone") && !hasPermission({ role }, "device:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":devices:post")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const body = await req.json();
  const { phone, imei, name } = body;
  if (!phone || !imei) {
    return NextResponse.json({ error: "Phone and IMEI required" }, { status: 400 });
  }
  
  try {
    const db = await getDb();
  
    // Ensure phone and IMEI are unique
    const exists = await db.collection("devices").findOne({ $or: [ { phone }, { imei } ] });
    if (exists) {
      return NextResponse.json({ error: "Device with this phone or IMEI already exists" }, { status: 400 });
    }
    
    const device = {
      phone,
      imei,
      name: name || "",
      owner: userId,
      registeredAt: new Date().toISOString(),
      disabled: false,
      sharedWith: [],
      metadata: {
        manufacturer: body.manufacturer || null,
        model: body.model || null,
        osVersion: body.osVersion || null,
        appVersion: body.appVersion || null,
      },
    };
    
    const result = await db.collection("devices").insertOne(device);
    const createdDevice = { ...device, _id: result.insertedId };
    
    await logActivity({ userId, action: "device:register", meta: { phone, imei, name } });
    emitRealtimeEvent("device-registered", createdDevice);
    
    return NextResponse.json({ success: true, device: createdDevice });
  } catch (error) {
    console.error("Error registering device:", error);
    return NextResponse.json({ success: false, degraded: true, error: "Unable to register device right now" }, { status: 503 });
  }
}

// GET: List devices (super_admin sees all, others see own/shared)
export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const canViewAll = hasPermission({ role }, "device:view:all");
  const canViewAssigned = hasPermission({ role }, "device:view:assigned");
  const canViewTeam = hasPermission({ role }, "device:view:team");
  const canViewSelf = hasPermission({ role }, "device:view:self");
  const canViewGeneric = hasPermission({ role }, "device:view");

  if (!canViewAll && !canViewAssigned && !canViewTeam && !canViewSelf && !canViewGeneric) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!rateLimit(userId+":devices:get")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const db = await getDb();

    // Super admin sees ALL devices, others see own + shared
    let devices;
    if (role === "super_admin" || canViewAll) {
      devices = await db.collection("devices").find({}).sort({ registeredAt: -1 }).toArray();
    } else {
      devices = await db.collection("devices").find({
        $or: [
          { owner: userId },
          { sharedWith: userId },
          { "sharedWith.userId": userId }
        ]
      }).sort({ registeredAt: -1 }).toArray();
    }

    await logActivity({ userId, action: "device:list", meta: { count: devices.length } });
    return NextResponse.json({ devices, degraded: false });
  } catch (error) {
    console.error("Error listing devices:", error);
    // Return empty list with degraded flag - still 200 so UI loads gracefully
    return NextResponse.json({ devices: [], degraded: true, error: "Device data temporarily unavailable" });
  }
}

// PATCH: Update device (metadata, disable, transfer ownership)
export async function PATCH(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(userId+":devices:patch")) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  
  const body = await req.json();
  const { deviceId, action, newOwner, metadata, disabled } = body;
  
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }
  
  try {
    const db = await getDb();
    const selector = ObjectId.isValid(deviceId) 
      ? { _id: new ObjectId(deviceId) }
      : { id: String(deviceId) };
    
    const device = await db.collection("devices").findOne(selector);
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    
    // Permission check: owner can modify own device, super_admin can modify any
    if (device.owner !== userId && !hasPermission({ role }, "device:*")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: userId };
    
    // Update device metadata
    if (metadata) {
      if (!hasPermission({ role }, "device:edit:metadata")) {
        return NextResponse.json({ error: "Cannot edit device metadata" }, { status: 403 });
      }
      update.metadata = { ...device.metadata, ...metadata };
      await logActivity({ userId, action: "device:edit:metadata", meta: { deviceId, metadata } });
    }
    
    // Disable device
    if (disabled !== undefined) {
      if (!hasPermission({ role }, "device:disable")) {
        return NextResponse.json({ error: "Cannot disable devices" }, { status: 403 });
      }
      update.disabled = Boolean(disabled);
      await logActivity({ userId, action: `device:${disabled ? 'disable' : 'enable'}`, meta: { deviceId } });
    }
    
    // Transfer ownership
    if (newOwner) {
      if (!hasPermission({ role }, "device:transfer:ownership")) {
        return NextResponse.json({ error: "Cannot transfer device ownership" }, { status: 403 });
      }
      
      // Verify new owner exists
      const newOwnerUser = await db.collection("users").findOne({ 
        $or: [{ _id: new ObjectId(newOwner) }, { email: newOwner }]
      });
      if (!newOwnerUser) {
        return NextResponse.json({ error: "New owner not found" }, { status: 404 });
      }
      
      update.owner = String(newOwnerUser._id);
      await logActivity({ 
        userId, 
        action: "device:transfer:ownership", 
        meta: { deviceId, fromUser: device.owner, toUser: newOwnerUser._id } 
      });
    }
    
    const result = await db.collection("devices").updateOne(selector, { $set: update });
    if (!result.modifiedCount) {
      return NextResponse.json({ error: "Failed to update device" }, { status: 400 });
    }
    
    const updated = await db.collection("devices").findOne(selector);
    emitRealtimeEvent("device-updated", updated);
    
    return NextResponse.json({ success: true, device: updated });
  } catch (error) {
    console.error("Error updating device:", error);
    return NextResponse.json({ success: false, degraded: true, error: "Unable to update device right now" }, { status: 503 });
  }
}
