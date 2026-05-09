"use client";

import { useEffect, useState } from "react";
import AnalyticsPanel from "../AnalyticsPanel";
import Map from "../Map";
import RoleSidebar from "./RoleSidebar";
import { roleIcons, widgetIcons } from "../RoleIcons";
import { connectSocket } from "../../realtime/socket";

export default function AnalystDashboard() {
  const [dateRange, setDateRange] = useState("");
  const [incidentType, setIncidentType] = useState("All");
  const [status, setStatus] = useState("Live feed active");
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [unitTrails, setUnitTrails] = useState<Record<string, Array<[number, number]>>>({});
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const handleButtonClick = (button: string) => {
    setActiveButton(button);
    setTimeout(() => setActiveButton(null), 2000);
  };

  const exportReport = (kind: string) => {
    const csv = `report_type,generated_at,date_range,incident_type\n${kind},${new Date().toISOString()},${dateRange || "all"},${incidentType}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${kind.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setStatus(`${kind} exported at ${new Date().toLocaleTimeString()}`);
    handleButtonClick(`export-${kind}`);
  };

  useEffect(() => {
    const socket = connectSocket();

    const handleLocationUpdate = (data: any) => {
      setLocations((previous) => {
        const filtered = previous.filter((location) => location.deviceId !== data.deviceId);
        return [...filtered, data];
      });

      setUnitTrails((previous) => {
        const trail = previous[data.deviceId] || [];
        const nextTrail = [...trail, [data.lng, data.lat]].slice(-20);
        return { ...previous, [data.deviceId]: nextTrail };
      });

      setSelectedUnit((current: any) => (current?.deviceId === data.deviceId ? data : current));
    };

    socket.on("location-update", handleLocationUpdate);
    return () => {
      socket.off("location-update", handleLocationUpdate);
    };
  }, []);

  const scrollToId = (id: string, nextStatus: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setStatus(nextStatus);
  };

  const applyFilters = () => {
    setStatus(`Filters applied: ${incidentType} | ${dateRange || "all dates"} at ${new Date().toLocaleTimeString()}`);
    handleButtonClick("apply-filters");
    scrollToId("analyst-analytics", "Filters applied to analytics context");
  };

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-linear-to-br from-slate-900 via-rose-900 to-slate-900">
      <RoleSidebar role="analyst" />
      <main className="flex-1 flex flex-col gap-4 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl sm:text-5xl">{roleIcons.analyst}</div>
            <div>
              <h1 className="tm-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Analyst
              </h1>
              <p className="text-sm text-rose-200 mt-1">Data-driven insights and reporting</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
          <button onClick={() => { scrollToId("analyst-export", "Preparing report export"); handleButtonClick("export"); }} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-rose-500/30 bg-linear-to-br from-rose-500/10 to-rose-600/5 hover:border-rose-400/50 transition ${ activeButton === "export" ? "ring-2 ring-rose-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.export}</div>
            <div className="text-xs uppercase tracking-wider text-rose-300 font-semibold">Export</div>
            <div className="text-sm font-bold text-rose-100">Report</div>
            {activeButton === "export" && <div className="mt-2 text-xs text-rose-400">✓ Ready</div>}
          </button>
          <button onClick={() => { scrollToId("analyst-analytics", "Trend analysis selected"); handleButtonClick("trends"); }} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-rose-500/30 bg-linear-to-br from-rose-500/10 to-rose-600/5 hover:border-rose-400/50 transition ${ activeButton === "trends" ? "ring-2 ring-rose-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">📊</div>
            <div className="text-xs uppercase tracking-wider text-rose-300 font-semibold">Trends</div>
            <div className="text-sm font-bold text-rose-100">Analysis</div>
            {activeButton === "trends" && <div className="mt-2 text-xs text-rose-400">✓ Loading</div>}
          </button>
          <button onClick={() => { scrollToId("analyst-analytics", "Incident stats in focus"); handleButtonClick("stats"); }} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-rose-500/30 bg-linear-to-br from-rose-500/10 to-rose-600/5 hover:border-rose-400/50 transition ${ activeButton === "stats" ? "ring-2 ring-rose-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.report}</div>
            <div className="text-xs uppercase tracking-wider text-rose-300 font-semibold">Incident</div>
            <div className="text-sm font-bold text-rose-100">Stats</div>
            {activeButton === "stats" && <div className="mt-2 text-xs text-rose-400">✓ Loaded</div>}
          </button>
          <button onClick={() => { scrollToId("analyst-analytics", "Live analytics refreshed"); handleButtonClick("refresh"); }} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-rose-500/30 bg-linear-to-br from-rose-500/10 to-rose-600/5 hover:border-rose-400/50 transition ${ activeButton === "refresh" ? "ring-2 ring-rose-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.refresh}</div>
            <div className="text-xs uppercase tracking-wider text-rose-300 font-semibold">Live</div>
            <div className="text-sm font-bold text-rose-100">Updates</div>
            {activeButton === "refresh" && <div className="mt-2 text-xs text-rose-400">✓ Fresh</div>}
          </button>
        </div>

        {/* Device Location Map */}
        <div className="tm-card rounded-xl border border-rose-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🗺️</span> Incident & Device Locations
          </h3>
          <div style={{ height: "400px" }}>
            <Map locations={locations} selectedUnit={selectedUnit} trails={unitTrails} />
          </div>
        </div>

        <div className="tm-card rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
          Analyst status: <span className="font-semibold">{status}</span>
        </div>

        {/* Analytics Dashboard (Primary) */}
        <div className="grid grid-cols-1 gap-4">
          <div id="analyst-analytics" className="tm-card rounded-xl border border-rose-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 lg:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📈</span> Analytics & Reporting
            </h2>
            <AnalyticsPanel />
          </div>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div id="analyst-export" className="tm-card rounded-xl border border-rose-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Export Data</h3>
            <div className="space-y-3">
              <button onClick={() => exportReport("Incidents Report")} className={`w-full px-4 py-2 bg-rose-600/20 border border-rose-500/50 rounded-lg text-sm font-semibold text-rose-200 hover:bg-rose-600/30 transition flex items-center justify-between ${ activeButton === "export-Incidents Report" ? "ring-2 ring-rose-400" : "" }`}>
                <span>Incidents Report</span> <span>{activeButton === "export-Incidents Report" ? "✓" : "📄"}</span>
              </button>
              <button onClick={() => exportReport("Device Tracking")} className={`w-full px-4 py-2 bg-rose-600/20 border border-rose-500/50 rounded-lg text-sm font-semibold text-rose-200 hover:bg-rose-600/30 transition flex items-center justify-between ${ activeButton === "export-Device Tracking" ? "ring-2 ring-rose-400" : "" }`}>
                <span>Device Tracking</span> <span>{activeButton === "export-Device Tracking" ? "✓" : "🗂️"}</span>
              </button>
              <button onClick={() => exportReport("User Activity")} className={`w-full px-4 py-2 bg-rose-600/20 border border-rose-500/50 rounded-lg text-sm font-semibold text-rose-200 hover:bg-rose-600/30 transition flex items-center justify-between ${ activeButton === "export-User Activity" ? "ring-2 ring-rose-400" : "" }`}>
                <span>User Activity</span> <span>{activeButton === "export-User Activity" ? "✓" : "👥"}</span>
              </button>
            </div>
          </div>

          <div className="tm-card rounded-xl border border-rose-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Report Filters</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-rose-300 uppercase tracking-wider font-semibold">Date Range</label>
                <input type="date" value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full mt-2 px-3 py-2 bg-slate-800 border border-rose-500/30 rounded-lg text-sm text-white focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <label className="text-sm text-rose-300 uppercase tracking-wider font-semibold">Incident Type</label>
                <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} className="w-full mt-2 px-3 py-2 bg-slate-800 border border-rose-500/30 rounded-lg text-sm text-white focus:outline-none focus:border-rose-400">
                  <option>All</option>
                  <option>High Priority</option>
                  <option>Low Priority</option>
                </select>
              </div>
              <button onClick={applyFilters} className={`w-full px-4 py-2 bg-rose-600/30 border border-rose-500/50 rounded-lg text-sm font-semibold text-rose-100 hover:bg-rose-600/40 transition ${ activeButton === "apply-filters" ? "ring-2 ring-rose-400" : "" }`}>
                {activeButton === "apply-filters" ? "✓ Applied" : "Apply Filters"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
