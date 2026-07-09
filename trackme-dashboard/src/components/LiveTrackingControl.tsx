"use client";

import { useEffect, useRef, useState } from "react";
import { getClientSession } from "../lib/clientAuth";
import { sendLocationUpdate } from "../realtime/socket";

type Device = {
  _id?: string;
  id?: string;
  phone?: string;
  imei?: string;
  name?: string;
};

function deviceIdFrom(device: Device): string {
  if (device.imei) return String(device.imei);
  if (device.id) return String(device.id);
  return String(device._id || "");
}

export default function LiveTrackingControl({
  defaultDeviceId,
  compact = false,
  allowDeviceSelection = true,
}: {
  defaultDeviceId?: string;
  compact?: boolean;
  allowDeviceSelection?: boolean;
}) {
  const [session, setSession] = useState(() => getClientSession());
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(defaultDeviceId || "");
  const [tracking, setTracking] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [lastFix, setLastFix] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setSession(getClientSession());
    sync();
    window.addEventListener("tm-auth-changed", sync);
    return () => window.removeEventListener("tm-auth-changed", sync);
  }, []);

  useEffect(() => {
    if (defaultDeviceId) {
      setSelectedDeviceId(defaultDeviceId);
    }
  }, [defaultDeviceId]);

  useEffect(() => {
    async function loadDevices() {
      if (!session.token) {
        setDevices([]);
        return;
      }
      try {
        const res = await fetch("/api/devices", {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus(data.error || "Unable to load devices");
          return;
        }
        const list: Device[] = Array.isArray(data.devices) ? data.devices : [];
        setDevices(list);

        if (!selectedDeviceId && list.length > 0) {
          const matched = list.find((d) => deviceIdFrom(d) === defaultDeviceId);
          setSelectedDeviceId(deviceIdFrom(matched || list[0]));
        }
      } catch {
        setStatus("Unable to load devices");
      }
    }

    void loadDevices();
  }, [session.token, defaultDeviceId, selectedDeviceId]);

  useEffect(() => {
    return () => {
      if (watchRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  async function publishFix(position: GeolocationPosition) {
    const device = devices.find((d) => deviceIdFrom(d) === selectedDeviceId);
    const coords = position.coords;

    const payload = {
      deviceId: selectedDeviceId,
      phone: device?.phone || null,
      imei: device?.imei || selectedDeviceId,
      lat: coords.latitude,
      lng: coords.longitude,
      speed: Number.isFinite(coords.speed) ? Number(coords.speed) : undefined,
      heading: Number.isFinite(coords.heading) ? Number(coords.heading) : undefined,
      battery: undefined,
      timestamp: Date.now(),
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tm-location-update", { detail: payload }));
    }

    sendLocationUpdate(payload);

    await fetch("/api/location-update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    setLastFix(new Date().toLocaleTimeString());
    setStatus("Live tracking active");
  }

  function startTracking() {
    if (tracking) return;
    if (!selectedDeviceId) {
      setStatus("Select a registered device first");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("Geolocation is not available on this device");
      return;
    }

    setStatus("Requesting GPS permission...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        void publishFix(position);
      },
      (error) => {
        setStatus(error.message || "Unable to obtain GPS position");
        setTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    watchRef.current = watchId;
    setTracking(true);
    setStatus("Tracking started");
  }

  function stopTracking() {
    if (watchRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
    setStatus("Tracking stopped");
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div>
        <label className="block text-xs uppercase tracking-wider text-cyan-300 font-semibold mb-2">
          Tracking Device (Phone + IMEI)
        </label>
        {allowDeviceSelection ? (
          <select
            value={selectedDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            className="w-full rounded-lg border border-cyan-500/40 bg-slate-900/70 px-3 py-2 text-sm text-cyan-100"
          >
            {devices.length === 0 && <option value="">No devices available</option>}
            {devices.map((device) => {
              const id = deviceIdFrom(device);
              return (
                <option key={id} value={id}>
                  {device.name || "Unnamed"} - {device.phone || "No phone"} - {device.imei || id}
                </option>
              );
            })}
          </select>
        ) : (
          <div className="rounded-lg border border-cyan-500/40 bg-slate-900/70 px-3 py-2 text-sm text-cyan-100">
            {(() => {
              const device = devices.find((d) => deviceIdFrom(d) === selectedDeviceId);
              if (!device) return "Assigned device only";
              const id = deviceIdFrom(device);
              return `${device.name || "Assigned device"} - ${device.phone || "No phone"} - ${device.imei || id}`;
            })()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={startTracking}
          disabled={tracking || !selectedDeviceId}
          className="rounded-lg border border-green-500/50 bg-green-600/20 px-3 py-2 text-sm font-semibold text-green-100 disabled:opacity-50"
        >
          Start Live Tracking
        </button>
        <button
          type="button"
          onClick={stopTracking}
          disabled={!tracking}
          className="rounded-lg border border-red-500/50 bg-red-600/20 px-3 py-2 text-sm font-semibold text-red-100 disabled:opacity-50"
        >
          Stop Tracking
        </button>
      </div>

      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-2 text-xs text-cyan-100">
        Status: <span className="font-semibold">{status}</span>
        {lastFix ? <span> • Last GPS fix: {lastFix}</span> : null}
      </div>
    </div>
  );
}
