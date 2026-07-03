"use client";

import { useEffect, useState } from "react";
import MovementPlayback from "./MovementPlayback";

type LocationPoint = {
  timestamp: number;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  battery?: number;
};

export default function DeviceHistory({ deviceId }: { deviceId: string }) {
  const [history, setHistory] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!deviceId) return;
    const controller = new AbortController();
    const token = window.localStorage.getItem("tm_auth_token");
    setLoading(true);
    setError("");

    fetch(`/api/location-history?deviceId=${encodeURIComponent(deviceId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("History request failed");
        return res.json();
      })
      .then((data) => setHistory(Array.isArray(data.history) ? data.history : []))
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError("Failed to load history");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [deviceId]);

  return (
    <div className="tm-card mt-4 p-4">
      <div className="mb-2 font-semibold">Location History</div>
      {loading && <div role="status">Loading…</div>}
      {error && <div className="text-sm text-red-500" role="alert">{error}</div>}
      {!loading && !error && history.length === 0 && (
        <div className="text-sm text-[var(--tm-text-secondary)]">No recorded movement yet.</div>
      )}
      <ul className="max-h-64 overflow-y-auto text-xs">
        {history.map((point, index) => (
          <li key={`${point.timestamp}-${index}`} className="mb-1">
            <span className="font-mono text-gray-500">{new Date(point.timestamp * 1000).toLocaleString()}</span> — Lat: {point.lat}, Lng: {point.lng}, Speed: {point.speed ?? "-"} km/h, Heading: {point.heading ?? "-"}°, Battery: {point.battery ?? "-"}%
          </li>
        ))}
      </ul>
      <MovementPlayback deviceId={deviceId} />
    </div>
  );
}
