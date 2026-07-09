"use client";

import { useEffect, useState } from "react";
import DeviceHistory from "../DeviceHistory";
import Map from "../Map";
import RoleSidebar from "./RoleSidebar";
import { roleIcons, widgetIcons } from "../RoleIcons";
import { connectSocket } from "../../realtime/socket";
import LiveTrackingControl from "../LiveTrackingControl";
import RegisterDevice from "../RegisterDevice";
import MobileClientSimulator from "../MobileClientSimulator";

export default function FieldAgentDashboard({ deviceId }: { deviceId: string }) {
  const [opsStatus, setOpsStatus] = useState("Standing by");
  const [batteryMode, setBatteryMode] = useState("Normal");
  const [autoSync, setAutoSync] = useState(true);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [unitTrails, setUnitTrails] = useState<Record<string, Array<[number, number]>>>({});
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [activeDeviceId, setActiveDeviceId] = useState(deviceId);

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
      console.log("[FieldAgent] Location update via socket:", data);
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

    // Socket listener for real-time updates
    socket.on("location-update", handleLocationUpdate);

    const handleLocalLocationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        if (customEvent.detail.deviceId) setActiveDeviceId(customEvent.detail.deviceId);
        handleLocationUpdate(customEvent.detail);
      }
    };
    const handleTrackingStarted = (event: Event) => {
      const customEvent = event as CustomEvent<{ deviceId?: string }>;
      if (customEvent.detail?.deviceId) setActiveDeviceId(customEvent.detail.deviceId);
    };
    const handleTrackingStopped = () => setActiveDeviceId("");
    if (typeof window !== "undefined") {
      const storedDeviceId = window.localStorage.getItem("tm_active_device_id");
      if (storedDeviceId) setActiveDeviceId(storedDeviceId);
      window.addEventListener("tm-location-update", handleLocalLocationUpdate);
      window.addEventListener("tm-device-tracking-started", handleTrackingStarted);
      window.addEventListener("tm-device-tracking-stopped", handleTrackingStopped);
    }

    // Polling fallback: fetch locations every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const query = activeDeviceId ? `?deviceIds=${encodeURIComponent(activeDeviceId)}&limit=10` : "?limit=10";
        const token = window.localStorage.getItem("tm_auth_token");
        const response = await fetch(`/api/locations${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const locations = await response.json();
        
        if (locations.length > 0) {
          const latestLocation = locations[0]; // Most recent first
          console.log("[FieldAgent] Location update via poll:", latestLocation);
          
          setLocations((previous) => {
            const filtered = previous.filter((location) => location.deviceId !== latestLocation.deviceId);
            return [...filtered, latestLocation];
          });

          setUnitTrails((previous) => {
            const trail = previous[latestLocation.deviceId] || [];
            const nextTrail = [...trail, [latestLocation.lng, latestLocation.lat]].slice(-20);
            return { ...previous, [latestLocation.deviceId]: nextTrail };
          });

          setSelectedUnit((current: any) => (current?.deviceId === latestLocation.deviceId ? latestLocation : current));
        }
      } catch (error) {
        console.warn("[FieldAgent] Polling failed:", error);
      }
    }, 2000);

    return () => {
      socket.off("location-update", handleLocationUpdate);
      if (typeof window !== "undefined") {
        window.removeEventListener("tm-location-update", handleLocalLocationUpdate);
        window.removeEventListener("tm-device-tracking-started", handleTrackingStarted);
        window.removeEventListener("tm-device-tracking-stopped", handleTrackingStopped);
      }
      clearInterval(pollInterval);
    };
  }, [activeDeviceId]);

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
          <button onClick={() => focus("field-register", "Ready to register phone and IMEI")} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-cyan-500/30 bg-linear-to-br from-cyan-500/10 to-cyan-600/5 hover:border-cyan-400/50 transition ${ activeButton === "field-register" ? "ring-2 ring-cyan-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">📋</div>
            <div className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">Register</div>
            <div className="text-sm font-bold text-cyan-100">Phone + IMEI</div>
            {activeButton === "field-register" && <div className="mt-2 text-xs text-cyan-400">Ready</div>}
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

        <section id="field-register" className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)] gap-4">
          <div className="tm-card rounded-xl border border-cyan-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Register and Track Device</h2>
            <p className="mb-4 text-sm text-cyan-100/80">Enter the field phone number and IMEI, then start tracking immediately.</p>
            <RegisterDevice />
          </div>
          <div className="tm-card rounded-xl border border-cyan-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Move Device in Real Time</h2>
            <p className="mb-4 text-sm text-cyan-100/80">After starting tracking, update latitude and longitude here to see the map react.</p>
            <MobileClientSimulator />
          </div>
        </section>

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
              <DeviceHistory deviceId={activeDeviceId} />
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
            <LiveTrackingControl defaultDeviceId={activeDeviceId} compact allowDeviceSelection={false} />
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
