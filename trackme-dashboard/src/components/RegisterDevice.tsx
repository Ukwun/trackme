"use client";
import { useEffect, useState } from "react";
import { UnauthorizedState } from "./ui/OperationalState";
import { getClientSession } from "../lib/clientAuth";
import { sendLocationUpdateWithGeofence } from "../realtime/socket";

const ALLOWED_ROLES = ["super_admin", "control_room", "dispatcher", "field_agent", "patrol_officer", "field_supervisor", "analyst"];

// Default starting location (Lagos, Nigeria)
const DEFAULT_LAT = 6.5244;
const DEFAULT_LNG = 3.3792;

export default function RegisterDevice() {
  const [phone, setPhone] = useState("");
  const [imei, setImei] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [session, setSession] = useState(() => getClientSession());
  const [tracking, setTracking] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setSession(getClientSession());
    sync();
    window.addEventListener("tm-auth-changed", sync);
    return () => window.removeEventListener("tm-auth-changed", sync);
  }, []);

  const role = String(session.role || "");

  if (!ALLOWED_ROLES.includes(role)) {
    return <UnauthorizedState detail="Device registration is limited to command-and-control roles." />;
  }

  async function handleStartTracking(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setIsLoading(true);

    if (!session.token) {
      setStatus("Authentication required");
      setIsLoading(false);
      return;
    }

    if (!phone || !imei) {
      setStatus("Phone number and IMEI are required");
      setIsLoading(false);
      return;
    }

    try {
      // Immediately start tracking with the device ID
      const deviceId = name || `UNIT_${Math.floor(Math.random() * 999)}`;

      // Send initial location to map immediately (don't wait for DB)
      sendLocationUpdateWithGeofence({
        deviceId,
        lat: DEFAULT_LAT,
        lng: DEFAULT_LNG,
        speed: 0,
        heading: 0,
        battery: 100,
        timestamp: Math.floor(Date.now() / 1000),
      });

      // Store active tracking device in localStorage for simulator to read
      localStorage.setItem("tm_active_device_id", deviceId);
      localStorage.setItem("tm_active_device_phone", phone);

      // Dispatch event so simulator updates
      window.dispatchEvent(new CustomEvent("tm-device-tracking-started", { detail: { deviceId } }));

      setTracking(deviceId);
      setStatus(`✅ Tracking active for ${deviceId} | Use the simulator below to move the device`);
      setPhone("");
      setImei("");
      setName("");

      // Try to persist to database in the background (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ phone, imei, name }),
        signal: controller.signal,
      }).catch(() => {
        // Silently ignore DB persistence errors
      }).finally(() => clearTimeout(timeoutId));

    } catch (err: any) {
      setStatus("Error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleStopTracking() {
    localStorage.removeItem("tm_active_device_id");
    localStorage.removeItem("tm_active_device_phone");
    window.dispatchEvent(new CustomEvent("tm-device-tracking-stopped"));
    setTracking(null);
    setStatus(null);
  }

  return (
    <form onSubmit={handleStartTracking} className="max-w-md w-full p-4 bg-gradient-to-br from-green-500/10 to-emerald-600/5 dark:bg-zinc-800 rounded-lg shadow-lg border border-green-500/30 dark:border-green-500/20 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">🚀 Quick Track</h2>
      <input
        type="text"
        placeholder="Phone Number (e.g., +234 802 900 1234)"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
        disabled={tracking !== null}
        required
      />
      <input
        type="text"
        placeholder="IMEI (e.g., 352656092036904)"
        value={imei}
        onChange={e => setImei(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
        disabled={tracking !== null}
        required
      />
      <input
        type="text"
        placeholder="Device Name (optional, e.g., UNIT_203)"
        value={name}
        onChange={e => setName(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
        disabled={tracking !== null}
      />
      {!tracking ? (
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
        >
          {isLoading ? "Starting..." : "🗺️ Start Tracking"}
        </button>
      ) : (
        <button 
          type="button" 
          onClick={handleStopTracking}
          className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white py-2 rounded-lg font-semibold hover:from-red-700 hover:to-rose-700"
        >
          ⏹️ Stop Tracking
        </button>
      )}
      
      {tracking && (
        <div className="mt-3 p-3 rounded-lg bg-green-500/20 border border-green-500/50">
          <div className="text-sm font-semibold text-green-700 dark:text-green-400">✅ TRACKING LIVE</div>
          <div className="text-xs text-green-600 dark:text-green-300 mt-1">Device: {tracking}</div>
          <div className="text-xs text-green-600 dark:text-green-300">Location: {DEFAULT_LAT.toFixed(4)}, {DEFAULT_LNG.toFixed(4)}</div>
        </div>
      )}
      
      {status && (
        <div className={`mt-2 text-sm p-2 rounded text-center ${
          tracking 
            ? "bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/50"
            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white"
        }`}>
          {status}
        </div>
      )}
    </form>
  );
}
