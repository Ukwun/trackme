import { getUserById } from "./user";

type DeliveryChannel = "sms" | "push" | "email";

type DeliveryAttempt = {
  channel: DeliveryChannel;
  success: boolean;
  attempts: number;
  detail: string;
};

async function sleep(delayMs: number) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function withRetry<T>(operation: () => Promise<T>, retries = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const result = await operation();
      return { result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(250 * attempt);
      }
    }
  }

  throw lastError;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

async function sendTwilioSMS(message: string, to: string) {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const from = requireEnv("TWILIO_FROM_NUMBER");

  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: message,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Twilio SMS failed: ${detail || response.statusText}`);
  }
}

async function sendResendEmail(message: string, to: string, type: string) {
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("NOTIFICATION_EMAIL_FROM");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `TrackMe ${type.toUpperCase()} notification`,
      text: message,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email failed: ${detail || response.statusText}`);
  }
}

async function sendOneSignalPush(message: string, userId: string) {
  const appId = requireEnv("ONESIGNAL_APP_ID");
  const apiKey = requireEnv("ONESIGNAL_API_KEY");

  const response = await fetch("https://api.onesignal.com/notifications?c=push", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      include_aliases: {
        external_id: [userId],
      },
      target_channel: "push",
      contents: {
        en: message,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OneSignal push failed: ${detail || response.statusText}`);
  }
}

export async function deliverNotification({
  message,
  type,
  userId,
  channels,
}: {
  message: string;
  type: string;
  userId: string;
  channels: DeliveryChannel[];
}) {
  const user = await getUserById(userId).catch(() => null);
  const attempts: DeliveryAttempt[] = [];

  for (const channel of channels) {
    try {
      const attempt = await withRetry(async () => {
        if (channel === "sms") {
          const recipient = user?.phone || process.env.NOTIFICATION_SMS_TO;
          if (!recipient) {
            throw new Error("No SMS recipient configured for user");
          }
          await sendTwilioSMS(message, recipient);
        }

        if (channel === "email") {
          const recipient = user?.email || process.env.NOTIFICATION_EMAIL_TO;
          if (!recipient) {
            throw new Error("No email recipient configured for user");
          }
          await sendResendEmail(message, recipient, type);
        }

        if (channel === "push") {
          await sendOneSignalPush(message, userId);
        }
      });

      attempts.push({
        channel,
        success: true,
        attempts: attempt.attempts,
        detail: "Delivered",
      });
    } catch (error) {
      attempts.push({
        channel,
        success: false,
        attempts: 3,
        detail: error instanceof Error ? error.message : "Unknown delivery failure",
      });
    }
  }

  return attempts;
}