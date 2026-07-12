import fs from "fs/promises";
import os from "os";
import path from "path";

type RuntimeDevice = Record<string, unknown> & { _id?: unknown; id?: unknown; phone?: string; imei?: string; name?: string };

type RuntimeLocation = Record<string, unknown> & {
  deviceId: string;
  phone?: string | null;
  imei?: string | null;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  battery?: number;
  accuracy?: number;
  timestamp?: number;
};

type RuntimeConsent = {
  _id: string;
  deviceId: string | null;
  imei: string | null;
  phone: string | null;
  name: string | null;
  granted: boolean;
  grantedBy: string | null;
  grantedAt: string;
  expiresAt: string | null;
  permanent: boolean;
  revokedAt?: string;
};

const deviceStore = new Map<string, RuntimeDevice>();
const locationStore = new Map<string, RuntimeLocation>();
const consentStore = new Map<string, RuntimeConsent>();
const fallbackDir = process.env.RUNTIME_STORE_DIR || path.join(os.tmpdir(), "trackme-runtime-store");
const consentFile = path.join(fallbackDir, "consents.json");
const locationFile = path.join(fallbackDir, "locations.json");

async function ensureFallbackDir() {
  await fs.mkdir(fallbackDir, { recursive: true });
}

async function readConsentFile(): Promise<RuntimeConsent[]> {
  try {
    const text = await fs.readFile(consentFile, "utf8");
    return JSON.parse(text) as RuntimeConsent[];
  } catch (e: any) {
    if (e?.code === "ENOENT") return [];
    console.error("Failed to read consent fallback file", e);
    return [];
  }
}

async function writeConsentFile(records: RuntimeConsent[]) {
  await ensureFallbackDir();
  await fs.writeFile(consentFile, JSON.stringify(records, null, 2), "utf8");
}

async function readLocationFile(): Promise<RuntimeLocation[]> {
  try {
    const text = await fs.readFile(locationFile, "utf8");
    return JSON.parse(text) as RuntimeLocation[];
  } catch (e: any) {
    if (e?.code === "ENOENT") return [];
    console.error("Failed to read location fallback file", e);
    return [];
  }
}

async function writeLocationFile(records: RuntimeLocation[]) {
  await ensureFallbackDir();
  await fs.writeFile(locationFile, JSON.stringify(records, null, 2), "utf8");
}

export function upsertRuntimeDevice(device: RuntimeDevice) {
  const id = String(device.imei || device.phone || device._id || device.id || "");
  if (!id) return device;
  const normalized = { ...device, _id: device._id ?? id, id: device.id ?? id };
  deviceStore.set(id, normalized);
  return normalized;
}

export function getRuntimeDevices() {
  return Array.from(deviceStore.values());
}

export async function upsertRuntimeLocation(location: RuntimeLocation) {
  if (!location?.deviceId) return location;
  const key = String(location.deviceId);
  const normalized = { ...location, timestamp: Number(location.timestamp ?? Date.now() / 1000) };
  locationStore.set(key, normalized);
  const existing = await readLocationFile();
  const idx = existing.findIndex((item) => item.deviceId === key);
  if (idx >= 0) {
    existing[idx] = normalized;
  } else {
    existing.push(normalized);
  }
  await writeLocationFile(existing);
  return normalized;
}

export async function upsertRuntimeConsent(consent: { deviceId?: string | null; imei?: string | null; phone?: string | null; name?: string | null; granted?: boolean; grantedBy?: string | null; grantedAt?: string; expiresAt?: string | null; permanent?: boolean }) {
  const id = String(consent.deviceId || consent.imei || consent.phone || `consent-${Date.now()}`);
  const record: RuntimeConsent = {
    _id: id,
    deviceId: consent.deviceId ?? null,
    imei: consent.imei ?? null,
    phone: consent.phone ?? null,
    name: consent.name ?? null,
    granted: consent.granted ?? true,
    grantedBy: consent.grantedBy ?? null,
    grantedAt: consent.grantedAt ?? new Date().toISOString(),
    expiresAt: consent.expiresAt ?? null,
    permanent: consent.permanent ?? false,
  };
  consentStore.set(id, record);
  const existing = await readConsentFile();
  const idx = existing.findIndex((item) => item._id === id);
  if (idx >= 0) {
    existing[idx] = record;
  } else {
    existing.push(record);
  }
  await writeConsentFile(existing);
  return record;
}

export async function getRuntimeConsent({ deviceId, imei, phone }: { deviceId?: string | null; imei?: string | null; phone?: string | null }) {
  const now = new Date().toISOString();
  const records = await readConsentFile();
  for (const rec of records) {
    if (!rec.granted) continue;
    if (rec.permanent || rec.expiresAt === null || (rec.expiresAt && rec.expiresAt > now)) {
      if ((deviceId && rec.deviceId === deviceId) || (imei && rec.imei === imei) || (phone && rec.phone === phone)) {
        return rec;
      }
    }
  }
  return null;
}

export async function revokeRuntimeConsent({ deviceId, imei, phone }: { deviceId?: string | null; imei?: string | null; phone?: string | null }) {
  const now = new Date().toISOString();
  const records = await readConsentFile();
  let count = 0;
  for (const rec of records) {
    if ((deviceId && rec.deviceId === deviceId) || (imei && rec.imei === imei) || (phone && rec.phone === phone)) {
      rec.granted = false;
      rec.revokedAt = now;
      count++;
    }
  }
  if (count > 0) await writeConsentFile(records);
  return { modifiedCount: count };
}

export async function getRuntimeLocations(deviceIds?: string[], limit = 50) {
  const values = await readLocationFile();
  const filtered = deviceIds && deviceIds.length > 0
    ? values.filter((row) => deviceIds.includes(String(row.deviceId)))
    : values;
  return filtered.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, limit);
}

export async function listRuntimeConsents() {
  return await readConsentFile();
}
