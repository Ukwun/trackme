"use client";
import { useEffect, useState } from "react";

export default function ActivityLog({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/activity", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to fetch activity logs");
    setLogs(data.logs || []);
  }

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="tm-card p-4">
      <div className="font-semibold mb-2">Activity Log</div>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {loading && <div>Loading...</div>}
      <ul className="text-xs">
        {logs.map((log, i) => (
          <li key={i} className="mb-1">
            <span className="font-mono text-gray-500">{new Date(log.timestamp).toLocaleString()}</span> — <span>{log.action}</span> {log.meta && <span className="text-gray-400">({JSON.stringify(log.meta)})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
