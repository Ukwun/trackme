"use client";
import { useEffect, useState } from "react";
import { setupRealtime } from '../realtime';

type AnalyticsMode = "all" | "trends" | "anomalies";

export default function AnalyticsPanel() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [mode, setMode] = useState<AnalyticsMode>("all");
  const [trends, setTrends] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<number>(0); // index for playback

  useEffect(() => {
    let unsub = () => {};
    async function fetchData() {
      setLoading(true);
      if (mode === "all") {
        const res = await fetch("/api/analytics");
        const data = await res.json();
        setAnalytics(data.analytics || []);
      } else if (mode === "trends") {
        const res = await fetch("/api/analytics?mode=trends");
        const data = await res.json();
        setTrends(data.trends || []);
      } else if (mode === "anomalies") {
        const res = await fetch("/api/analytics?mode=anomalies");
        const data = await res.json();
        setAnomalies(data.anomalies || []);
      }
      setLoading(false);
    }
    fetchData();
    const interval = setInterval(fetchData, 15000);
    // Real-time updates
    const socket = setupRealtime({
      onAnalytics: () => fetchData(),
    });
    unsub = () => {
      socket?.off && socket.off('analytics-update');
    };
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [mode]);

  // Timeline slider for playback (only for 'all' mode)
  const playbackEvents = analytics.slice().reverse();
  const currentEvent = playbackEvents[timeline] || null;

  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-xl font-semibold mb-2">Analytics</h2>
      <div className="flex gap-2 mb-2">
        <button className={`px-2 py-1 rounded ${mode === "all" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-200"}`} onClick={() => setMode("all")}>All Events</button>
        <button className={`px-2 py-1 rounded ${mode === "trends" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-200"}`} onClick={() => setMode("trends")}>Trends</button>
        <button className={`px-2 py-1 rounded ${mode === "anomalies" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-200"}`} onClick={() => setMode("anomalies")}>Anomalies</button>
      </div>
      {loading && <div className="text-xs text-[var(--tm-text-secondary)]">Loading...</div>}
      {mode === "all" && analytics.length > 0 && (
        <>
          <div className="mb-2">
            <label className="text-xs font-semibold">Historical Playback:</label>
            <input
              type="range"
              min={0}
              max={playbackEvents.length - 1}
              value={timeline}
              onChange={e => setTimeline(Number(e.target.value))}
              className="w-full"
            />
            {currentEvent && (
              <div className="mt-2 p-2 rounded bg-zinc-900 border border-[var(--tm-border)]">
                <div className="font-semibold text-xs">{currentEvent.type || 'Event'}</div>
                <div className="text-xs">{currentEvent.message || JSON.stringify(currentEvent)}</div>
                <div className="text-xs text-[var(--tm-text-secondary)]">{currentEvent.createdAt}</div>
              </div>
            )}
          </div>
          <ul className="text-xs max-h-40 overflow-y-auto">
            {playbackEvents.map((a, idx) => (
              <li key={idx} className={idx === timeline ? "mb-1 font-bold text-blue-400" : "mb-1"}>
                <span className="font-semibold">{a.type || 'Event'}:</span> {a.message || JSON.stringify(a)} <span className="text-[var(--tm-text-secondary)]">({a.createdAt})</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {mode === "trends" && trends.length > 0 && (
        <div className="mt-2">
          <div className="font-semibold text-xs mb-1">Events per Day (last 7 days):</div>
          <ul className="text-xs">
            {trends.map((t, idx) => (
              <li key={idx}>{t._id}: <span className="font-semibold">{t.count}</span></li>
            ))}
          </ul>
        </div>
      )}
      {mode === "anomalies" && anomalies.length > 0 && (
        <div className="mt-2">
          <div className="font-semibold text-xs mb-1">Anomalous Days (activity {'>'} 2x avg):</div>
          <ul className="text-xs">
            {anomalies.map((a, idx) => (
              <li key={idx}>{a._id}: <span className="font-semibold">{a.count}</span></li>
            ))}
          </ul>
        </div>
      )}
      {mode === "all" && analytics.length === 0 && !loading && (
        <div className="text-[var(--tm-text-secondary)]">No analytics data yet.</div>
      )}
      {mode === "trends" && trends.length === 0 && !loading && (
        <div className="text-[var(--tm-text-secondary)]">No trend data yet.</div>
      )}
      {mode === "anomalies" && anomalies.length === 0 && !loading && (
        <div className="text-[var(--tm-text-secondary)]">No anomalies detected.</div>
      )}
    </div>
  );
}
