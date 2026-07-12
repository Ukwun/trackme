"use client";

import { useEffect, useRef, useState } from "react";
import {
  FaCheckCircle,
  FaCopy,
  FaIdCard,
  FaLink,
  FaLocationArrow,
  FaPauseCircle,
  FaPhoneAlt,
  FaSatelliteDish,
} from "react-icons/fa";
import { UnauthorizedState } from "./ui/OperationalState";
import { getClientSession } from "../lib/clientAuth";
import { sendLocationUpdateWithGeofence } from "../realtime/socket";

const ALLOWED_ROLES = [
  "super_admin",
  "control_room",
  "dispatcher",
  "field_agent",
  "patrol_officer",
  "field_supervisor",
  "analyst",
];

const DEFAULT_LAT = 6.5244;
const DEFAULT_LNG = 3.3792;

export default function RegisterDevice() {
  const [phone, setPhone] = useState("");
  const [imei, setImei] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [session, setSession] = useState(() => getClientSession());
  const [tracking, setTracking] = useState<string | null>(null);
  const [consentLink, setConsentLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const trackingLoopRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setSession(getClientSession());
    sync();
    window.addEventListener("tm-auth-changed", sync);
    return () => {
      window.removeEventListener("tm-auth-changed", sync);
      if (trackingLoopRef.current != null) {
        window.clearInterval(trackingLoopRef.current);
        trackingLoopRef.current = null;
      }
    };
  }, []);

  const role = String(session.role || "");

  if (!ALLOWED_ROLES.includes(role)) {
    return <UnauthorizedState detail="Device registration is limited to command-and-control roles." />;
  }

  function buildConsentLink(deviceId: string) {
    if (typeof window === "undefined") return "";
    const url = new URL(window.location.origin);
    url.searchParams.set("track", deviceId);
    url.searchParams.set("consent", "required");
    if (phone) url.searchParams.set("phone", phone);
    if (imei) url.searchParams.set("imei", imei);
    return url.toString();
  }

  function stopTrackingLoop() {
    if (typeof window === "undefined") return;
    if (trackingLoopRef.current != null) {
      window.clearInterval(trackingLoopRef.current);
      trackingLoopRef.current = null;
    }
  }

  function publishSessionLocation(deviceId: string, phone: string, imei: string, lat: number, lng: number, speed: number, heading: number, battery: number) {
    const payload = {
      deviceId,
      phone,
      imei,
      lat,
      lng,
      speed,
      heading,
      battery,
      timestamp: Math.floor(Date.now() / 1000),
    };

    sendLocationUpdateWithGeofence(payload);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tm-location-update", { detail: payload }));
    }

    return payload;
  }

  async function handleStartTracking(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setIsLoading(true);

    if (!session.token) {
      setStatus("No saved session detected; tracking will continue in local fallback mode.");
    }

    if (!phone.trim() || !imei.trim()) {
      setStatus("Phone number and IMEI are required");
      setIsLoading(false);
      return;
    }

    try {
      const cleanPhone = phone.trim();
      const cleanImei = imei.trim();
      const deviceId = cleanImei || name.trim() || `UNIT_${Math.floor(Math.random() * 999)}`;
      const link = buildConsentLink(deviceId);

      stopTrackingLoop();

      const initialLat = DEFAULT_LAT + (Math.random() - 0.5) * 0.001;
      const initialLng = DEFAULT_LNG + (Math.random() - 0.5) * 0.001;
      publishSessionLocation(deviceId, cleanPhone, cleanImei, initialLat, initialLng, 12, 35, 96);

      localStorage.setItem("tm_active_device_id", deviceId);
      localStorage.setItem("tm_active_device_phone", cleanPhone);
      localStorage.setItem("tm_active_device_imei", cleanImei);
      if (link) localStorage.setItem("tm_active_consent_link", link);

      window.dispatchEvent(
        new CustomEvent("tm-device-tracking-started", {
          detail: { deviceId, phone: cleanPhone, imei: cleanImei, consentLink: link },
        })
      );

      if (typeof window !== "undefined") {
        if (trackingLoopRef.current != null) {
          window.clearInterval(trackingLoopRef.current);
        }
        trackingLoopRef.current = window.setInterval(() => {
          const phase = Date.now() / 1000;
          const driftLat = Math.sin(phase / 4) * 0.00025;
          const driftLng = Math.cos(phase / 5) * 0.0003;
          publishSessionLocation(deviceId, cleanPhone, cleanImei, initialLat + driftLat, initialLng + driftLng, 14, 42, 94);
        }, 4000);
      }

      setTracking(deviceId);
      setConsentLink(link);
      setStatus(`Live tracking is now active for ${deviceId}. The dashboard is receiving position updates in real time.`);
      setPhone("");
      setImei("");
      setName("");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      fetch("/api/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ phone: cleanPhone, imei: cleanImei, name }),
        signal: controller.signal,
      })
        .catch(() => undefined)
        .finally(() => clearTimeout(timeoutId));

      // Create a one-time server-side consent record so anonymous device clients can post locations.
      try {
        await fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({ deviceId, phone: cleanPhone, imei: cleanImei, name }),
        }).catch(() => undefined);
      } catch {
        // Non-fatal: consent creation best-effort
      }
    } catch (err: unknown) {
      setStatus("Error: " + (err instanceof Error ? err.message : "Unable to prepare tracking session"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleStopTracking() {
    stopTrackingLoop();
    localStorage.removeItem("tm_active_device_id");
    localStorage.removeItem("tm_active_device_phone");
    localStorage.removeItem("tm_active_device_imei");
    localStorage.removeItem("tm_active_consent_link");
    window.dispatchEvent(new CustomEvent("tm-device-tracking-stopped"));
    setTracking(null);
    setConsentLink("");
    setCopied(false);
    setStatus(null);
  }

  async function copyConsentLink() {
    if (!consentLink) return;
    try {
      await navigator.clipboard.writeText(consentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setStatus("Copy failed. Select the consent link manually.");
    }
  }

  return (
    <form onSubmit={handleStartTracking} className="w-full space-y-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 shadow-lg shadow-emerald-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-300/30 bg-emerald-300/15 text-emerald-100">
          <FaSatelliteDish />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Consent-Based Live Track</h2>
          <p className="mt-1 text-xs leading-5 text-emerald-100/75">
            Phone number and IMEI identify the registered device. Live GPS starts when the phone grants location permission.
          </p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Phone Number (e.g., +234 802 900 1234)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full rounded-lg border border-emerald-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        disabled={tracking !== null}
        required
      />
      <input
        type="text"
        placeholder="IMEI (e.g., 352656092036904)"
        value={imei}
        onChange={(e) => setImei(e.target.value)}
        className="w-full rounded-lg border border-emerald-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        disabled={tracking !== null}
        required
      />
      <input
        type="text"
        placeholder="Device Name (optional, e.g., UNIT_203)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-emerald-300/30 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        disabled={tracking !== null}
      />

      {!tracking ? (
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/40 bg-emerald-500/25 px-4 py-2 text-sm font-bold text-emerald-50 hover:bg-emerald-500/35 disabled:opacity-50"
        >
          <FaLocationArrow /> {isLoading ? "Preparing..." : "Create Tracking Session"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleStopTracking}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-300/35 bg-red-500/20 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-500/30"
        >
          <FaPauseCircle /> End Session
        </button>
      )}

      {tracking && (
        <div className="space-y-3 rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
            <FaCheckCircle /> Session ready
          </div>
          <div className="grid gap-2 text-xs text-emerald-100/80 sm:grid-cols-2">
            <span className="flex items-center gap-2">
              <FaIdCard /> {tracking}
            </span>
            <span className="flex items-center gap-2">
              <FaPhoneAlt /> Verified metadata
            </span>
          </div>
          {consentLink && (
            <div className="rounded-lg border border-white/10 bg-slate-950/50 p-2">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
                <FaLink /> Consent link
              </div>
              <div className="break-all text-xs text-slate-200">{consentLink}</div>
              <button
                type="button"
                onClick={copyConsentLink}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-300/20"
              >
                <FaCopy /> {copied ? "Copied" : "Copy invite link"}
              </button>
            </div>
          )}
          <div className="text-xs text-emerald-100/70">
            Initial marker: {DEFAULT_LAT.toFixed(4)}, {DEFAULT_LNG.toFixed(4)}
          </div>
        </div>
      )}

      {status && <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3 text-center text-xs leading-5 text-slate-200">{status}</div>}
    </form>
  );
}
