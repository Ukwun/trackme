"use client";
import AnalyticsCharts from "../src/components/AnalyticsCharts";
import { useState, useEffect } from "react";

export default function AnalyticsScreen() {
  const [insights, setInsights] = useState<any>(null);
  useEffect(() => {
    fetch("/api/analytics?mode=insights").then(res => res.json()).then(setInsights);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-blue-950 to-zinc-800 flex flex-col items-center py-10 px-2">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-blue-300 tracking-widest">Analytics Dashboard</h1>
      <div className="w-full max-w-5xl flex flex-col gap-8">
        <AnalyticsCharts />
        <div className="tm-card p-6 bg-white/10 backdrop-blur rounded-xl border border-blue-400/30">
          <h2 className="text-xl font-semibold mb-4 text-blue-200">Historical Insights</h2>
          {insights ? (
            <ul className="text-zinc-100 text-sm list-disc ml-6">
              {insights.insights?.map((i: string, idx: number) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          ) : <div className="text-zinc-400">Loading insights...</div>}
        </div>
      </div>
    </div>
  );
}
