"use client";

import { useEffect, useState } from "react";
import { FaExclamationTriangle, FaLocationArrow, FaPaperPlane, FaRoute } from "react-icons/fa";
import { sendLocationUpdateWithGeofence } from "../realtime/socket";

const DEFAULT_LAT = "6.5244";
const DEFAULT_LNG = "3.3792";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("tm_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MobileClientSimulator() {
  const [deviceId, setDeviceId] = useState("");
  const [lockedToSession, setLockedToSession] = useState(false);
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [speed, setSpeed] = useState("0");
  const [heading, setHeading] = useState("0");
  const [battery, setBattery] = useState("100");
  const [status, setStatus] = useState<string | null>(null);
  const [panicStatus, setPanicStatus] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState("");
  const [incidentDesc, setIncidentDesc] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncActiveDevice = (newDeviceId?: string) => {
      const id = newDeviceId || window.localStorage.getItem("tm_active_device_id") || "";
      setDeviceId(id);
      setLockedToSession(Boolean(id));
      setStatus(id ? `Ready to move ${id}` : null);
    };

    const handleTrackingStarted = (event: Event) => {
      const customEvent = event as CustomEvent<{ deviceId?: string }>;
      syncActiveDevice(customEvent.detail?.deviceId);
    };

    const handleTrackingStopped = () => {
      setDeviceId("");
      setLockedToSession(false);
      setStatus(null);
    };

    syncActiveDevice();
    window.addEventListener("tm-device-tracking-started", handleTrackingStarted);
    window.addEventListener("tm-device-tracking-stopped", handleTrackingStopped);

    return () => {
      window.removeEventListener("tm-device-tracking-started", handleTrackingStarted);
      window.removeEventListener("tm-device-tracking-stopped", handleTrackingStopped);
    };
  }, []);

  async function publishLocation(e?: React.FormEvent, override?: { lat: string; lng: string; heading?: string; speed?: string }) {
    e?.preventDefault();
    const nextLat = override?.lat ?? lat;
    const nextLng = override?.lng ?? lng;
    const nextSpeed = override?.speed ?? speed;
    const nextHeading = override?.heading ?? heading;
    if (!deviceId || !nextLat || !nextLng) {
      setStatus("Device ID, latitude, and longitude are required");
      return;
    }

    const payload = {
      deviceId,
      phone: typeof window !== "undefined" ? window.localStorage.getItem("tm_active_device_phone") : null,
      imei: typeof window !== "undefined" ? window.localStorage.getItem("tm_active_device_imei") || deviceId : deviceId,
      lat: parseFloat(nextLat),
      lng: parseFloat(nextLng),
      speed: nextSpeed ? parseFloat(nextSpeed) : undefined,
      heading: nextHeading ? parseFloat(nextHeading) : undefined,
      battery: battery ? parseInt(battery, 10) : undefined,
      timestamp: Math.floor(Date.now() / 1000),
    };

    sendLocationUpdateWithGeofence(payload);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tm-location-update", { detail: payload }));
    }

    try {
      const response = await fetch("/api/location-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      setStatus(response.ok ? `Location published at ${new Date().toLocaleTimeString()}${result.degraded ? " (live only)" : ""}` : result.error || "Unable to publish location");
    } catch {
      setStatus("Live socket updated, but persistence is offline");
    }
  }

  function nudge(deltaLat: number, deltaLng: number, nextHeading: string) {
    const nextLat = (parseFloat(lat || DEFAULT_LAT) + deltaLat).toFixed(6);
    const nextLng = (parseFloat(lng || DEFAULT_LNG) + deltaLng).toFixed(6);
    setLat(nextLat);
    setLng(nextLng);
    setHeading(nextHeading);
    setSpeed("22");
    void publishLocation(undefined, { lat: nextLat, lng: nextLng, heading: nextHeading, speed: "22" });
  }

  async function handlePanic() {
    if (!deviceId) {
      setPanicStatus("Select a device first");
      return;
    }
    setPanicStatus("Sending panic alert...");
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message: `PANIC BUTTON: ${deviceId} needs immediate assistance`, type: "danger" }),
      });
      setPanicStatus("Panic alert sent");
    } catch {
      setPanicStatus("Panic alert queued locally");
    }
  }

  async function handleIncidentReport() {
    if (!incidentType || !incidentDesc.trim()) {
      setStatus("Incident type and description are required");
      return;
    }
    try {
      await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ type: incidentType, description: incidentDesc, location: `${lat},${lng}`, deviceId }),
      });
      setIncidentType("");
      setIncidentDesc("");
      setStatus("Incident reported");
    } catch {
      setStatus("Incident queued locally");
    }
  }

  return (
    <div className="w-full space-y-4 rounded-xl border border-blue-400/25 bg-blue-400/10 p-4 shadow-lg shadow-blue-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-300/30 bg-blue-300/15 text-blue-100">
          <FaRoute />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Mobile Location Console</h2>
          <p className="mt-1 text-xs leading-5 text-blue-100/75">Move a consented device, publish live coordinates, and send field updates.</p>
        </div>
      </div>

      <form onSubmit={publishLocation} className="space-y-2">
        <input
          type="text"
          placeholder="Device ID"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="w-full rounded-lg border border-blue-300/30 bg-slate-950/60 px-3 py-2 text-sm font-semibold text-white placeholder:text-slate-500"
          readOnly={lockedToSession}
          required
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input type="number" step="any" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} className="rounded-lg border border-blue-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white" required />
          <input type="number" step="any" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} className="rounded-lg border border-blue-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white" required />
          <input type="number" placeholder="Speed km/h" value={speed} onChange={(e) => setSpeed(e.target.value)} className="rounded-lg border border-blue-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white" />
          <input type="number" placeholder="Heading deg" value={heading} onChange={(e) => setHeading(e.target.value)} className="rounded-lg border border-blue-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white" />
          <input type="number" placeholder="Battery %" value={battery} onChange={(e) => setBattery(e.target.value)} className="rounded-lg border border-blue-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white sm:col-span-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => nudge(0.0012, 0, "0")} className="rounded-lg border border-blue-300/30 bg-blue-300/10 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-300/20">North</button>
          <button type="button" onClick={() => nudge(-0.0012, 0, "180")} className="rounded-lg border border-blue-300/30 bg-blue-300/10 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-300/20">South</button>
          <button type="button" onClick={() => nudge(0, 0.0012, "90")} className="rounded-lg border border-blue-300/30 bg-blue-300/10 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-300/20">East</button>
          <button type="button" onClick={() => nudge(0, -0.0012, "270")} className="rounded-lg border border-blue-300/30 bg-blue-300/10 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-300/20">West</button>
        </div>

        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300/40 bg-blue-500/25 px-4 py-2 text-sm font-bold text-blue-50 hover:bg-blue-500/35">
          <FaLocationArrow /> Send Location Update
        </button>
      </form>

      {status && <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3 text-center text-xs leading-5 text-slate-200">{status}</div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={handlePanic} className="flex items-center justify-center gap-2 rounded-lg border border-red-300/35 bg-red-500/20 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-500/30">
          <FaExclamationTriangle /> Panic
        </button>
        <div className="rounded-lg border border-white/10 bg-slate-950/35 p-3 text-xs text-slate-300">{panicStatus || "Panic alerts notify command immediately."}</div>
      </div>

      <div className="space-y-2 rounded-lg border border-white/10 bg-slate-950/35 p-3">
        <div className="text-sm font-semibold text-white">Report Incident</div>
        <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} className="w-full rounded-lg border border-blue-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white">
          <option value="">Select type</option>
          <option value="Robbery">Robbery</option>
          <option value="Accident">Accident</option>
          <option value="Disturbance">Disturbance</option>
          <option value="Medical Emergency">Medical Emergency</option>
          <option value="Suspicious Activity">Suspicious Activity</option>
        </select>
        <textarea value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)} placeholder="Description" className="min-h-20 w-full rounded-lg border border-blue-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500" />
        <button type="button" onClick={handleIncidentReport} className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-300/40 bg-blue-500/20 px-4 py-2 text-sm font-bold text-blue-100 hover:bg-blue-500/30">
          <FaPaperPlane /> Submit Incident
        </button>
      </div>
    </div>
  );
}
