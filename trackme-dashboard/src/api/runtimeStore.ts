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

const deviceStore = new Map<string, RuntimeDevice>();
const locationStore = new Map<string, RuntimeLocation>();

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

export function upsertRuntimeLocation(location: RuntimeLocation) {
  if (!location?.deviceId) return location;
  const key = String(location.deviceId);
  const normalized = { ...location, timestamp: Number(location.timestamp ?? Date.now() / 1000) };
  locationStore.set(key, normalized);
  return normalized;
}

export function getRuntimeLocations(deviceIds?: string[], limit = 50) {
  const values = Array.from(locationStore.values()).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  const filtered = deviceIds && deviceIds.length > 0
    ? values.filter((row) => deviceIds.includes(String(row.deviceId)))
    : values;
  return filtered.slice(0, limit);
}
