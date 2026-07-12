"use client";

import { useEffect, useState } from "react";

export default function ConsentPage() {
  const [accepted, setAccepted] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [imei, setImei] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDeviceId(params.get("track") || "");
    setImei(params.get("imei") || "");
    setPhone(params.get("phone") || "");
  }, []);

  async function accept() {
    setStatus("Submitting consent...");
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, imei, phone }),
      });
      if (res.ok) {
        setAccepted(true);
        setStatus("Consent recorded. Your device will now share location.");
      } else {
        const body = await res.json();
        setStatus(body?.error || "Unable to record consent");
      }
    } catch (e) {
      setStatus("Network error while recording consent");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6">
      <div className="max-w-xl w-full rounded-lg border border-white/6 bg-slate-800 p-6">
        <h1 className="text-2xl font-bold mb-2">TrackMe — Consent</h1>
        <p className="mb-4 text-sm text-slate-300">You were invited to share live location for device <strong>{deviceId || imei || phone}</strong>. Accepting grants one-time consent so this device may send location updates to the TrackMe workspace until consent is revoked.</p>
        <div className="mb-4">
          <div className="text-xs text-slate-400">Device</div>
          <div className="text-sm font-mono text-slate-200">{deviceId || imei || phone || "Unknown"}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={accept} disabled={accepted} className="rounded-md bg-emerald-600 px-4 py-2 font-semibold">Accept and Share</button>
          <a href="/" className="rounded-md border border-white/10 px-4 py-2">Decline</a>
        </div>
        {status && <div className="mt-4 text-sm text-slate-300">{status}</div>}
      </div>
    </main>
  );
}
