"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Map from "./Map";
import type { MapLocation } from "./MapClient";

const ABUJA_ROUTE: Array<[number, number]> = [
  [9.0579, 7.4951], [9.0617, 7.4898], [9.0672, 7.4861], [9.0734, 7.4815],
  [9.0787, 7.4757], [9.0820, 7.4678], [9.0835, 7.4584], [9.0802, 7.4492],
  [9.0731, 7.4427], [9.0647, 7.4439], [9.0568, 7.4504], [9.0501, 7.4587],
  [9.0457, 7.4682], [9.0469, 7.4784], [9.0511, 7.4880], [9.0579, 7.4951],
];

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, "");
const hashIdentifier = (value: string) => Array.from(value).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 2166136261);

export default function AbujaTrackingSimulation() {
  const [identifierType, setIdentifierType] = useState<"phone" | "imei">("phone");
  const [identifier, setIdentifier] = useState("");
  const [activeIdentifier, setActiveIdentifier] = useState("");
  const [index, setIndex] = useState(0);
  const [trail, setTrail] = useState<Array<[number, number]>>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef<Date | null>(null);
  const offset = useMemo(() => activeIdentifier ? hashIdentifier(activeIdentifier) % ABUJA_ROUTE.length : 0, [activeIdentifier]);
  const point = ABUJA_ROUTE[(index + offset) % ABUJA_ROUTE.length];
  const location: MapLocation | null = activeIdentifier ? {
    deviceId: `SIM-${activeIdentifier.slice(-6)}`, lat: point[0], lng: point[1],
    speed: 24 + ((index * 7) % 31), heading: (index * 27) % 360,
    battery: Math.max(38, 96 - index), timestamp: Math.floor(Date.now() / 1000),
  } : null;

  useEffect(() => {
    if (!running || !activeIdentifier) return;
    const timer = window.setInterval(() => setIndex((current) => current + 1), 1400);
    return () => window.clearInterval(timer);
  }, [activeIdentifier, running]);

  useEffect(() => {
    if (!activeIdentifier) return;
    const nextPoint: [number, number] = [point[1], point[0]];
    setTrail((current) => [...current, nextPoint].slice(-30));
  }, [index, activeIdentifier]);

  function start(event: FormEvent) {
    event.preventDefault();
    const normalized = digitsOnly(identifier);
    const valid = identifierType === "imei" ? normalized.length === 15 : normalized.length >= 10 && normalized.length <= 15;
    if (!valid) {
      setError(identifierType === "imei" ? "Enter a 15-digit IMEI for the simulation." : "Enter a valid 10–15 digit phone number.");
      return;
    }
    setError(""); setActiveIdentifier(normalized); setIndex(0); setTrail([]); setRunning(true);
    startedAt.current = new Date();
  }

  function reset() {
    setRunning(false); setActiveIdentifier(""); setIdentifier(""); setIndex(0); setTrail([]); setError("");
    startedAt.current = null;
  }

  return (
    <section className="tm-card overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-slate-950/45" aria-labelledby="simulation-title">
      <div className="grid xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-b border-white/10 p-4 sm:p-5 xl:border-b-0 xl:border-r">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-100">
            <span className={`h-2 w-2 rounded-full ${running ? "animate-pulse bg-emerald-300" : "bg-fuchsia-300"}`} /> Synthetic demonstration
          </div>
          <h2 id="simulation-title" className="mt-4 text-2xl font-black text-white">FCT Abuja live movement</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Enter a sample identifier to generate a deterministic training route. Coordinates are synthetic and are not obtained from any phone or carrier.</p>
          <form onSubmit={start} className="mt-5 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="simulation-type">Identifier type</label>
            <select id="simulation-type" value={identifierType} onChange={(event) => { setIdentifierType(event.target.value as "phone" | "imei"); setError(""); }} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white"><option value="phone">Phone number</option><option value="imei">IMEI</option></select>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300" htmlFor="simulation-identifier">Sample {identifierType}</label>
            <input id="simulation-identifier" inputMode="numeric" autoComplete="off" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={identifierType === "imei" ? "15-digit sample IMEI" : "e.g. 08012345678"} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600" />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <button type="submit" className="w-full rounded-xl bg-fuchsia-400 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-fuchsia-500/20 hover:bg-fuchsia-300">Start Abuja simulation</button>
          </form>
          {location && <div className="mt-5 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Unit</span><span className="font-mono font-bold text-white">{location.deviceId}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">State</span><span className={running ? "text-emerald-300" : "text-amber-300"}>{running ? "Moving live" : "Paused"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Speed</span><span className="font-semibold text-white">{location.speed} km/h</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Started</span><span className="text-white">{startedAt.current?.toLocaleTimeString()}</span></div>
            <div className="grid grid-cols-2 gap-2 pt-2"><button type="button" onClick={running ? () => setRunning(false) : () => setRunning(true)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white">{running ? "Pause" : "Resume"}</button><button type="button" onClick={reset} className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">Reset</button></div>
          </div>}
        </div>
        <div className="relative min-h-[460px] p-3 sm:p-4">
          <Map locations={location ? [location] : []} selectedUnit={location} trails={location ? { [location.deviceId]: trail } : {}} />
          <div className="pointer-events-none absolute bottom-6 left-6 rounded-lg border border-fuchsia-300/30 bg-slate-950/85 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-fuchsia-100 backdrop-blur">Training data · Abuja FCT · Not a real device</div>
        </div>
      </div>
    </section>
  );
}
