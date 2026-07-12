"use client";

import { useEffect, useRef, useState } from "react";
import { FaCheckCircle, FaLocationArrow, FaLock, FaShieldAlt, FaStopCircle } from "react-icons/fa";

type TrackingState = "review" | "requesting" | "live" | "stopped" | "error";

export default function ConsentPage() {
  const [deviceId, setDeviceId] = useState("");
  const [imei, setImei] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<TrackingState>("review");
  const [status, setStatus] = useState("Review the request before sharing your location.");
  const [lastFix, setLastFix] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDeviceId(params.get("track") || "");
    setImei(params.get("imei") || "");
    setPhone(params.get("phone") || "");
    return () => {
      if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
    };
  }, []);

  async function publish(position: GeolocationPosition) {
    const payload = {
      deviceId,
      imei: imei || deviceId,
      phone: phone || null,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      speed: position.coords.speed,
      heading: position.coords.heading,
      accuracy: position.coords.accuracy,
      timestamp: Math.floor(position.timestamp / 1000),
    };
    const response = await fetch("/api/location-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Location update was rejected");
    setState("live");
    setAccuracy(Math.round(position.coords.accuracy));
    setLastFix(new Date().toLocaleTimeString());
    setStatus("Live sharing is active. Keep this page open for continuous updates.");
  }

  async function accept() {
    if (!deviceId && !imei && !phone) {
      setState("error");
      setStatus("This invite is missing a device identity. Ask the sender for a new link.");
      return;
    }
    if (!navigator.geolocation) {
      setState("error");
      setStatus("Location services are not available in this browser.");
      return;
    }

    setState("requesting");
    setStatus("Recording consent and requesting precise location permission...");
    try {
      const consent = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, imei, phone, permanent: true }),
      });
      if (!consent.ok) {
        const body = await consent.json().catch(() => ({}));
        throw new Error(body.error || "Unable to record consent");
      }

      watchRef.current = navigator.geolocation.watchPosition(
        (position) => void publish(position).catch((error: Error) => {
          setState("error");
          setStatus(error.message);
        }),
        (error) => {
          setState("error");
          setStatus(error.code === error.PERMISSION_DENIED ? "Location permission was denied. Nothing is being shared." : error.message);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
      );
      setStatus("Consent recorded. Waiting for the first GPS fix...");
    } catch (error) {
      setState("error");
      setStatus(error instanceof Error ? error.message : "Unable to start location sharing");
    }
  }

  async function stop() {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    await fetch(`/api/consent?deviceId=${encodeURIComponent(deviceId)}&imei=${encodeURIComponent(imei)}&phone=${encodeURIComponent(phone)}`, { method: "DELETE" }).catch(() => undefined);
    setState("stopped");
    setStatus("Sharing stopped and consent revoked. No further updates will be accepted.");
  }

  const identity = deviceId || imei || phone || "Unknown device";
  const active = state === "requesting" || state === "live";

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-10 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,.22),transparent_32%),radial-gradient(circle_at_90%_85%,rgba(14,165,233,.16),transparent_30%)]" />
      <section className="relative mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-xl text-emerald-300"><FaShieldAlt /></div>
          <div><p className="text-xs font-bold uppercase tracking-[.24em] text-emerald-300">TrackMe consent</p><h1 className="mt-1 text-2xl font-black">Live location request</h1></div>
        </div>

        <p className="text-sm leading-6 text-slate-300">You control this session. Accepting records consent, asks this browser for GPS permission, and sends changing coordinates to the authorized dashboard while this page remains open.</p>

        <div className="my-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Device identity</div>
          <div className="mt-2 break-all font-mono text-sm text-white">{identity}</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400"><span className="flex items-center gap-2"><FaLock /> Encrypted transport</span><span className="flex items-center gap-2"><FaLocationArrow /> Precise GPS</span></div>
        </div>

        <div aria-live="polite" className={`mb-5 rounded-2xl border p-4 text-sm transition-all duration-300 ${state === "live" ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-100" : state === "error" ? "border-rose-400/35 bg-rose-400/10 text-rose-100" : "border-sky-400/25 bg-sky-400/10 text-sky-100"}`}>
          <div className="flex items-center gap-2 font-semibold">{state === "live" ? <FaCheckCircle className="animate-pulse" /> : <FaLocationArrow />} {status}</div>
          {lastFix && <div className="mt-2 text-xs opacity-75">Last fix {lastFix}{accuracy != null ? ` · accuracy ${accuracy}m` : ""}</div>}
        </div>

        {!active && state !== "stopped" ? <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={accept} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0"><FaLocationArrow /> Accept and share</button><a href="/" className="rounded-xl border border-white/15 px-4 py-3 text-center font-semibold transition hover:bg-white/5">Decline</a></div> : null}
        {active ? <button type="button" onClick={stop} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/35 bg-rose-500/15 px-4 py-3 font-bold text-rose-100 transition hover:bg-rose-500/25"><FaStopCircle /> Stop and revoke consent</button> : null}
      </section>
    </main>
  );
}
