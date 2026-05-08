"use client";
import { useEffect, useState } from "react";
import { Line, Bar, Heatmap } from "react-chartjs-2";
import Chart from "chart.js/auto";

export default function AnalyticsCharts() {
  const [metrics, setMetrics] = useState<any>({});
  useEffect(() => {
    fetch("/api/analytics?mode=metrics").then(res => res.json()).then(setMetrics);
  }, []);

  if (!metrics.activeUnits) return <div>Loading analytics...</div>;

  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-lg font-semibold mb-2">Analytics Charts</h2>
      <div className="mb-4">
        <div className="font-semibold">Active Units: <span className="text-blue-600">{metrics.activeUnits}</span></div>
        <div>Avg. Response Time: <span className="text-green-600">{metrics.avgResponseTime}s</span></div>
        <div>Patrol Coverage: <span className="text-blue-600">{metrics.patrolCoverage}%</span></div>
        <div>Route Efficiency: <span className="text-blue-600">{metrics.routeEfficiency}%</span></div>
        <div>Incident Density: <span className="text-red-600">{metrics.incidentDensity}</span></div>
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Hotspot Analysis (Heatmap)</h3>
        {metrics.heatmapData && <Heatmap data={metrics.heatmapData} />}
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Incident Timeline</h3>
        {metrics.timelineData && <Line data={metrics.timelineData} />}
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Zone Statistics</h3>
        {metrics.zoneStats && <Bar data={metrics.zoneStats} />}
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Movement Replay</h3>
        {/* Movement replay can be implemented with a map animation or timeline slider */}
        <div>Replay coming soon...</div>
      </div>
    </div>
  );
}
