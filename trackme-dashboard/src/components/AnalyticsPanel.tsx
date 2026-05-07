"use client";
import { useEffect, useState } from "react";

export default function AnalyticsPanel() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  useEffect(() => {
    async function fetchAnalytics() {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      setAnalytics(data.analytics || []);
    }
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-xl font-semibold mb-2">Analytics</h2>
      {analytics.length === 0 ? (
        <div className="text-[var(--tm-text-secondary)]">No analytics data yet.</div>
      ) : (
        <ul className="text-xs">
          {analytics.map((a, idx) => (
            <li key={idx} className="mb-1">
              <span className="font-semibold">{a.type || 'Event'}:</span> {a.message || JSON.stringify(a)} <span className="text-[var(--tm-text-secondary)]">({a.createdAt})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
