"use client";

import { useEffect, useState } from "react";
import DeviceHistory from "../DeviceHistory";
import Map from "../Map";
import RoleSidebar from "./RoleSidebar";
import { roleIcons, widgetIcons } from "../RoleIcons";
import { connectSocket } from "../../realtime/socket";

export default function FieldAgentDashboard({ deviceId }: { deviceId: string }) {
  const [opsStatus, setOpsStatus] = useState("Standing by");
  const [batteryMode, setBatteryMode] = useState("Normal");
  const [autoSync, setAutoSync] = useState(true);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [unitTrails, setUnitTrails] = useState<Record<string, Array<[number, number]>>>({});
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const handleQuickAction = (action: string) => {
    setActiveButton(action);
    setTimeout(() => setActiveButton(null), 2000);
  };

  const focus = (id: string, status: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setOpsStatus(status);
    handleQuickAction(id);
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

  const shareLocation = async () => {
    try {
      const lat = 6.5244 + (Math.random() - 0.5) * 0.01;
      const lng = 3.3792 + (Math.random() - 0.5) * 0.01;
      const res = await fetch("/api/location-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, lat, lng }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Location share failed");
      }
      setOpsStatus(`Location transmitted at ${new Date().toLocaleTimeString()}`);
      handleQuickAction("location-shared");
    } catch (e: any) {
      setOpsStatus(e.message || "Location share failed");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-linear-to-br from-slate-900 via-cyan-900 to-slate-900">
      <RoleSidebar role="field_agent" />
      <main className="flex-1 flex flex-col gap-4 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl sm:text-5xl">{roleIcons.field_agent}</div>
            <div>
              <h1 className="tm-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Field Agent
              </h1>
              <p className="text-sm text-cyan-200 mt-1">Task tracking and location reporting</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <button onClick={() => focus("field-history", "Reviewing assigned task history")} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-cyan-500/30 bg-linear-to-br from-cyan-500/10 to-cyan-600/5 hover:border-cyan-400/50 transition ${ activeButton === "field-history" ? "ring-2 ring-cyan-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">📋</div>
            <div className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">Assigned</div>
            <div className="text-sm font-bold text-cyan-100">Tasks</div>
            {activeButton === "field-history" && <div className="mt-2 text-xs text-cyan-400">✓ Loaded</div>}
          </button>
          <button onClick={() => focus("field-location", "Preparing location share")} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-cyan-500/30 bg-linear-to-br from-cyan-500/10 to-cyan-600/5 hover:border-cyan-400/50 transition ${ activeButton === "field-location" ? "ring-2 ring-cyan-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.location}</div>
            <div className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">Share</div>
            <div className="text-sm font-bold text-cyan-100">Location</div>
            {activeButton === "field-location" && <div className="mt-2 text-xs text-cyan-400">✓ Ready</div>}
          </button>
          <button onClick={() => focus("field-tasks", "Incident update console ready")} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-cyan-500/30 bg-linear-to-br from-cyan-500/10 to-cyan-600/5 hover:border-cyan-400/50 transition ${ activeButton === "field-tasks" ? "ring-2 ring-cyan-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.incident}</div>
            <div className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">Incident</div>
            <div className="text-sm font-bold text-cyan-100">Updates</div>
            {activeButton === "field-tasks" && <div className="mt-2 text-xs text-cyan-400">✓ Ready</div>}
          </button>
        </div>

        {/* Live Location Map */}
        <div className="tm-card rounded-xl border border-cyan-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🗺️</span> Current Location
          </h3>
          <div style={{ height: "400px" }}>
            <Map locations={locations} selectedUnit={selectedUnit} trails={unitTrails} />
          </div>
        </div>

        <div className="tm-card rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-3 text-xs text-cyan-100">
          Field status: <span className="font-semibold">{opsStatus}</span>
        </div>

        {/* Activity & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Current Task / History (Primary) */}
          <div id="field-history">
            <div className="tm-card rounded-xl border border-cyan-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🗂️</span> Activity History
              </h2>
              <DeviceHistory deviceId={deviceId} />
            </div>
          </div>

          {/* Status Panel */}
          <div className="space-y-3">
            <div className="tm-card rounded-lg border border-cyan-500/30 bg-linear-to-br from-cyan-500/5 to-cyan-600/5 p-3">
              <div className="text-sm text-cyan-300 uppercase tracking-wider font-semibold">Device Status</div>
              <div className="text-2xl font-bold text-cyan-100 mt-2">Active</div>
              <div className="text-xs text-cyan-200 mt-1">Reporting location</div>
            </div>

            <div className="tm-card rounded-lg border border-cyan-500/30 bg-linear-to-br from-cyan-500/5 to-cyan-600/5 p-3">
              <div className="text-sm text-cyan-300 uppercase tracking-wider font-semibold">Battery</div>
              <div className="text-2xl font-bold text-cyan-100 mt-2">85%</div>
              <button onClick={() => setBatteryMode((prev) => (prev === "Normal" ? "Power Saver" : "Normal"))} className="mt-3 w-full px-3 py-1 bg-cyan-600/20 border border-cyan-500/50 rounded text-xs font-semibold text-cyan-200 hover:bg-cyan-600/30 transition">
                {batteryMode}
              </button>
            </div>

            <div className="tm-card rounded-lg border border-cyan-500/30 bg-linear-to-br from-cyan-500/5 to-cyan-600/5 p-3">
              <div className="text-sm text-cyan-300 uppercase tracking-wider font-semibold">GPS Signal</div>
              <div className="text-lg font-bold text-cyan-100 mt-2">📡 Strong</div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div id="field-location" className="tm-card rounded-xl border border-cyan-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Location Sharing</h3>
            <div className="space-y-3">
              <button onClick={shareLocation} className={`w-full px-4 py-2 bg-cyan-600/30 border border-cyan-500/50 rounded-lg text-sm font-semibold text-cyan-100 hover:bg-cyan-600/40 transition ${
                activeButton === "location-shared" ? "ring-2 ring-cyan-400" : ""
              }`}>
                {activeButton === "location-shared" ? "✓ Shared" : "📍 Share Current Location"}
              </button>
              <button onClick={() => { setAutoSync((prev) => !prev); handleQuickAction("auto-sync"); }} className={`w-full px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg text-sm font-semibold text-cyan-200 hover:bg-cyan-600/30 transition ${
                activeButton === "auto-sync" ? "ring-2 ring-cyan-400" : ""
              }`}>
                {autoSync ? "🔄 Auto-Sync Enabled" : "⏸️ Auto-Sync Paused"} {activeButton === "auto-sync" ? "✓" : ""}
              </button>
            </div>
          </div>

          <div id="field-tasks" className="tm-card rounded-xl border border-cyan-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Task Updates</h3>
            <div className="space-y-3">
              <button onClick={() => { setOpsStatus("Current task marked complete"); handleQuickAction("task-complete"); }} className={`w-full px-4 py-2 bg-cyan-600/30 border border-cyan-500/50 rounded-lg text-sm font-semibold text-cyan-100 hover:bg-cyan-600/40 transition ${
                activeButton === "task-complete" ? "ring-2 ring-cyan-400" : ""
              }`}>
                {activeButton === "task-complete" ? "✅ Complete" : "✅ Mark Complete"}
              </button>
              <button onClick={() => { setOpsStatus("Task update sent to command center at " + new Date().toLocaleTimeString()); handleQuickAction("task-update"); }} className={`w-full px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg text-sm font-semibold text-cyan-200 hover:bg-cyan-600/30 transition ${
                activeButton === "task-update" ? "ring-2 ring-cyan-400" : ""
              }`}>
                {activeButton === "task-update" ? "👍 Sent" : "💬 Send Update"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
