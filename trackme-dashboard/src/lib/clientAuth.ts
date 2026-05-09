export type ClientSession = {
  token: string | null;
  role: string | null;
  userId: string | null;
};

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  if (typeof window === "undefined") return "";
  try {
    return window.atob(padded);
  } catch {
    return "";
  }
}

export function getClientSession(): ClientSession {
  if (typeof window === "undefined") {
    return { token: null, role: null, userId: null };
  }

  const token = window.localStorage.getItem("tm_auth_token");
  const role = window.localStorage.getItem("tm_auth_role");
  if (!token) {
    return { token: null, role, userId: null };
  }

  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return { token, role, userId: null };
    }
    const payloadRaw = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadRaw) as { userId?: string; role?: string };
    return {
      token,
      role: role || payload.role || null,
      userId: payload.userId || null,
    };
  } catch {
    return { token, role, userId: null };
  }
}
