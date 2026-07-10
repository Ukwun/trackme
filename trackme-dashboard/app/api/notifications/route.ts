import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../src/api/db";
import { resolveSession } from "../../../src/api/authSession";
import { emitRealtimeEvent } from "../../../src/realtime/server";
import { deliverNotification } from "../../../src/api/notificationDelivery";

export async function POST(req: Request) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { message, type, delivery } = body as { message?: string; type?: string; delivery?: string[] };

  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const db = await getDb();
  const channels = (Array.isArray(delivery)
    ? delivery.filter((channel): channel is "sms" | "push" | "email" => ["sms", "push", "email"].includes(channel))
    : []) as Array<"sms" | "push" | "email">;

  const notification = {
    userId,
    message,
    type: type || "info",
    createdAt: new Date().toISOString(),
    deliveryStatus: channels.length > 0 ? "pending" : "in_app_only",
    deliveries: [],
  };

  const result = await db.collection("notifications").insertOne(notification);
  const notificationId = result.insertedId;

  emitRealtimeEvent("notification-update", { userId, message, type: type || "info", notificationId });

  const deliveryAttempts = channels.length > 0
    ? await deliverNotification({ message, type: type || "info", userId, channels })
    : [];

  const failedAttempts = deliveryAttempts.filter((attempt) => !attempt.success);
  const deliveryStatus =
    deliveryAttempts.length === 0
      ? "in_app_only"
      : failedAttempts.length === 0
        ? "delivered"
        : failedAttempts.length === deliveryAttempts.length
          ? "failed"
          : "partial";

  await db.collection("notifications").updateOne(
    { _id: new ObjectId(notificationId) },
    {
      $set: {
        deliveryStatus,
        deliveries: deliveryAttempts,
        deliveredAt: new Date().toISOString(),
      },
    }
  );

  if (failedAttempts.length > 0) {
    await db.collection("notification_dead_letters").insertMany(
      failedAttempts.map((attempt) => ({
        notificationId,
        userId,
        channel: attempt.channel,
        message,
        type: type || "info",
        attempts: attempt.attempts,
        detail: attempt.detail,
        createdAt: new Date().toISOString(),
      }))
    );
  }

  return NextResponse.json({
    success: deliveryStatus !== "failed",
    notificationId,
    deliveryStatus,
    deliveries: deliveryAttempts,
  });
}

export async function GET(req: Request) {
  const { userId } = await resolveSession(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = await getDb();
    const notifications = await db.collection("notifications").find({ userId }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ notifications, degraded: false });
  } catch (error) {
    console.error("Error loading notifications:", error);
    return NextResponse.json({ notifications: [], degraded: true, error: "Notifications temporarily unavailable" });
  }
}
