import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../src/api/db";
import { resolveSession } from "../../../../src/api/authSession";
import { hasPermission } from "../../../../src/api/permissions";
import { rateLimit } from "../../../../src/api/rateLimit";
import { logActivity } from "../../../../src/api/logActivity";
import { emitRealtimeEvent } from "../../../../src/realtime/server";

/**
 * Device Sharing API
 * Allows device owners and SUPER_ADMIN to share devices with other users/roles
 */

export async function POST(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`${userId}:devices:share:post`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { deviceId, shareWithUserId, shareWithRole, accessLevel } = await req.json();

  if (!deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  if (!shareWithUserId && !shareWithRole) {
    return NextResponse.json(
      { error: "Either shareWithUserId or shareWithRole required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const selector = ObjectId.isValid(deviceId)
    ? { _id: new ObjectId(deviceId) }
    : { id: String(deviceId) };

  const device = await db.collection("devices").findOne(selector);
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  // Authorization: owner can share own device, super_admin can share any device
  const isOwner = device.owner === userId;
  const isSuperAdmin = hasPermission({ role }, "device:share:any");

  if (!isOwner && !isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let shareList = device.sharedWith || [];

  if (shareWithUserId) {
    // Verify user exists
    const targetUser = await db.collection("users").findOne({
      $or: [{ _id: new ObjectId(shareWithUserId) }, { email: shareWithUserId }],
    });
    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const shareEntry = {
      userId: String(targetUser._id),
      email: targetUser.email,
      role: targetUser.role,
      sharedAt: new Date().toISOString(),
      accessLevel: accessLevel || "view",
      sharedBy: userId,
    };

    // Check if already shared
    const alreadyShared = shareList.some((s: any) => s.userId === shareEntry.userId);
    if (!alreadyShared) {
      shareList.push(shareEntry);
    }

    await logActivity({
      userId,
      action: "device:share:user",
      meta: { deviceId, sharedWithUser: targetUser._id, accessLevel },
    });
  }

  if (shareWithRole) {
    // Super admin can share with entire roles
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Only Super Admin can share with roles" },
        { status: 403 }
      );
    }

    // Find all users with this role
    const roleUsers = await db
      .collection("users")
      .find({ role: shareWithRole })
      .toArray();

    roleUsers.forEach((user) => {
      const shareEntry = {
        userId: String(user._id),
        email: user.email,
        role: shareWithRole,
        sharedAt: new Date().toISOString(),
        accessLevel: accessLevel || "view",
        sharedBy: userId,
      };

      // Check if already shared
      const alreadyShared = shareList.some((s: any) => s.userId === shareEntry.userId);
      if (!alreadyShared) {
        shareList.push(shareEntry);
      }
    });

    await logActivity({
      userId,
      action: "device:share:role",
      meta: {
        deviceId,
        shareWithRole,
        accessLevel,
        count: roleUsers.length,
      },
    });
  }

  const result = await db.collection("devices").updateOne(selector, {
    $set: {
      sharedWith: shareList,
      updatedAt: new Date().toISOString(),
    },
  });

  if (!result.modifiedCount) {
    return NextResponse.json({ error: "Failed to share device" }, { status: 400 });
  }

  const updated = await db.collection("devices").findOne(selector);
  emitRealtimeEvent("device-shared", { deviceId, sharedWith: shareList });

  return NextResponse.json({ success: true, device: updated });
}

export async function GET(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`${userId}:devices:share:get`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const db = await getDb();

  let shares;
  if (hasPermission({ role }, "device:share:any")) {
    // Super admin sees all shares
    shares = await db
      .collection("devices")
      .find({ sharedWith: { $exists: true, $ne: [] } })
      .project({ sharedWith: 1, phone: 1, imei: 1, name: 1, owner: 1 })
      .sort({ updatedAt: -1 })
      .toArray();
  } else {
    // Regular users see shares of their own devices and devices shared with them
    shares = await db
      .collection("devices")
      .find({
        $or: [
          { owner: userId, sharedWith: { $exists: true, $ne: [] } },
          { "sharedWith.userId": userId },
        ],
      })
      .project({ sharedWith: 1, phone: 1, imei: 1, name: 1, owner: 1 })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  await logActivity({
    userId,
    action: "device:shares:list",
    meta: { count: shares.length },
  });

  return NextResponse.json({ shares });
}

// DELETE: Revoke device sharing
export async function DELETE(req: NextRequest) {
  const { userId, role } = await resolveSession(req);
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(`${userId}:devices:share:delete`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await req.json();
  const { deviceId, revokeFromUserId } = body;

  if (!deviceId || !revokeFromUserId) {
    return NextResponse.json(
      { error: "deviceId and revokeFromUserId required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const selector = ObjectId.isValid(deviceId)
    ? { _id: new ObjectId(deviceId) }
    : { id: String(deviceId) };

  const device = await db.collection("devices").findOne(selector);
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  // Authorization: owner can revoke, super_admin can revoke any
  const isOwner = device.owner === userId;
  const isSuperAdmin = hasPermission({ role }, "device:share:any");

  if (!isOwner && !isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedSharedWith = (device.sharedWith || []).filter(
    (s: any) => s.userId !== revokeFromUserId
  );

  const result = await db.collection("devices").updateOne(selector, {
    $set: {
      sharedWith: updatedSharedWith,
      updatedAt: new Date().toISOString(),
    },
  });

  if (!result.modifiedCount) {
    return NextResponse.json({ error: "Failed to revoke sharing" }, { status: 400 });
  }

  await logActivity({
    userId,
    action: "device:share:revoke",
    meta: { deviceId, revokedFromUser: revokeFromUserId },
  });

  emitRealtimeEvent("device-share-revoked", {
    deviceId,
    revokedFrom: revokeFromUserId,
  });

  return NextResponse.json({ success: true });
}
