"use client";
import { useEffect, useState } from "react";

export default function DeviceHistory({ deviceId }: { deviceId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!deviceId) return;
    setLoading(true);
    fetch(`/api/location-history?deviceId=${deviceId}`)
      .then(res => res.json())
      .then(data => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load history");
        setLoading(false);
      });
  }, [deviceId]);

  return (
    <div className="tm-card p-4 mt-4">
      <div className="font-semibold mb-2">Location History</div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <ul className="text-xs max-h-64 overflow-y-auto">
        {history.map((h, i) => (
          <li key={i} className="mb-1">
            <span className="font-mono text-gray-500">{new Date(h.timestamp * 1000).toLocaleString()}</span> — 
            Lat: {h.lat}, Lng: {h.lng}, Speed: {h.speed ?? "-"} km/h, Heading: {h.heading ?? "-"}°, Battery: {h.battery ?? "-"}%
          </li>
        ))}
      </ul>
    </div>
  );
}
