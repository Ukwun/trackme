"use client";

import { useEffect, useState } from "react";
import DeviceHistory from "../DeviceHistory";
import IncidentPanel from "../IncidentPanel";
import RoleSidebar from "./RoleSidebar";
import Map from "../Map";
import { roleIcons, widgetIcons } from "../RoleIcons";
import { connectSocket } from "../../realtime/socket";
import LiveTrackingControl from "../LiveTrackingControl";

export default function PatrolOfficerDashboard({ deviceId }: { deviceId: string }) {
  const [status, setStatus] = useState("On Patrol");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [unitTrails, setUnitTrails] = useState<Record<string, Array<[number, number]>>>({});
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const handleQuickAction = (action: string) => {
    setActiveAction(action);
    setTimeout(() => setActiveAction(null), 2000);
  };

  const statusOptions = ["On Patrol", "En Route", "Break", "Responding", "Off Duty"];

  useEffect(() => {
    const socket = connectSocket();

    const handleLocationUpdate = (data: any) => {
      console.log("[PatrolOfficer] Location update via socket:", data);
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
        handleLocationUpdate(customEvent.detail);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("tm-location-update", handleLocalLocationUpdate);
    }

    // Polling fallback: fetch locations every 2 seconds
    const pollInterval = setInterval(async () => {
      try {
        const query = deviceId ? `?deviceIds=${encodeURIComponent(deviceId)}&limit=10` : "?limit=10";
        const token = window.localStorage.getItem("tm_auth_token");
        const response = await fetch(`/api/locations${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const locations = await response.json();
        
        if (locations.length > 0) {
          const latestLocation = locations[0]; // Most recent first
          console.log("[PatrolOfficer] Location update via poll:", latestLocation);
          
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
        console.warn("[PatrolOfficer] Polling failed:", error);
      }
    }, 2000);

    return () => {
      socket.off("location-update", handleLocationUpdate);
      if (typeof window !== "undefined") {
        window.removeEventListener("tm-location-update", handleLocalLocationUpdate);
      }
      clearInterval(pollInterval);
    };
  }, [deviceId]);

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-slate-900">
      <RoleSidebar role="patrol_officer" />
      <main className="flex-1 flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl sm:text-5xl">{roleIcons.patrol_officer}</div>
            <div>
              <h1 className="tm-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Patrol Officer
              </h1>
              <p className="text-sm text-amber-200 mt-1">Field operations and task coordination</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => handleQuickAction("status")}
            className={`tm-card p-3 sm:p-4 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 hover:border-amber-400/50 hover:bg-amber-500/15 transition cursor-pointer ${
              activeAction === "status" ? "ring-2 ring-amber-400" : ""
            }`}
          >
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.status}</div>
            <div className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Report</div>
            <div className="text-sm font-bold text-amber-100">Status</div>
            {activeAction === "status" && <div className="mt-2 text-xs text-green-400">✓ Status updated</div>}
          </button>
          <button
            onClick={() => handleQuickAction("route")}
            className={`tm-card p-3 sm:p-4 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 hover:border-amber-400/50 hover:bg-amber-500/15 transition cursor-pointer ${
              activeAction === "route" ? "ring-2 ring-amber-400" : ""
            }`}
          >
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.location}</div>
            <div className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Navigate</div>
            <div className="text-sm font-bold text-amber-100">Route</div>
            {activeAction === "route" && <div className="mt-2 text-xs text-green-400">✓ Route loaded</div>}
          </button>
          <button
            onClick={() => handleQuickAction("issue")}
            className={`tm-card p-3 sm:p-4 rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 hover:border-amber-400/50 hover:bg-amber-500/15 transition cursor-pointer ${
              activeAction === "issue" ? "ring-2 ring-amber-400" : ""
            }`}
          >
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.report}</div>
            <div className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Report</div>
            <div className="text-sm font-bold text-amber-100">Issue</div>
            {activeAction === "issue" && <div className="mt-2 text-xs text-green-400">✓ Report sent</div>}
          </button>
        </div>

        {/* Primary Incident Assignment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Assigned Incident (Primary) */}
          <div>
            <div className="tm-card rounded-xl border border-amber-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span> Assigned Tasks
              </h2>
              <IncidentPanel />
            </div>
          </div>

          {/* Personal Status */}
          <div className="space-y-2 sm:space-y-3">
            <div className="tm-card rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/5 p-3">
              <div className="text-sm text-amber-300 uppercase tracking-wider font-semibold">Current Status</div>
              <div className="text-lg font-bold text-amber-100 mt-2">{status}</div>
              <button
                onClick={() => setShowStatusModal(true)}
                className="mt-3 w-full px-3 py-2 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm font-semibold text-amber-200 hover:bg-amber-600/30 transition cursor-pointer active:ring-2 active:ring-amber-400"
              >
                Update Status
              </button>
              {showStatusModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-800 border border-amber-500/50 rounded-lg p-6 max-w-sm w-full">
                    <h3 className="text-lg font-bold text-white mb-4">Update Your Status</h3>
                    <div className="space-y-2 mb-4">
                      {statusOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setStatus(opt);
                            setShowStatusModal(false);
                          }}
                          className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition ${
                            status === opt
                              ? "bg-amber-500 text-white border border-amber-600"
                              : "bg-slate-700 text-amber-100 border border-amber-500/30 hover:bg-slate-600"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowStatusModal(false)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm font-semibold text-slate-100 hover:bg-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="tm-card rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/5 p-3">
              <div className="text-sm text-amber-300 uppercase tracking-wider font-semibold">Battery</div>
              <div className="text-lg font-bold text-amber-100 mt-2">92%</div>
              <div className="text-xs text-amber-200 mt-1">Device powered</div>
            </div>
          </div>
        </div>

        {/* Live Map and Location History */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4">
          {/* Live Map */}
          <div className="tm-card rounded-xl border border-amber-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 xl:col-span-8">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">🗺️</span> Live Location Map
            </h3>
            <div style={{ height: "400px" }}>
              <Map locations={locations} selectedUnit={selectedUnit} trails={unitTrails} />
            </div>
          </div>

          {/* Navigation Panel */}
          <div className="tm-card rounded-xl border border-amber-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 xl:col-span-4">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Quick Navigation</h3>
            <div className="space-y-3">
              <div className="p-3 bg-amber-600/10 border border-amber-500/20 rounded-lg">
                <div className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Destination</div>
                <div className="text-sm text-amber-100 mt-1 font-medium">Awaiting assignment</div>
              </div>
              <button
                onClick={() => handleQuickAction("directions")}
                className={`w-full px-4 py-2 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm font-semibold text-amber-200 hover:bg-amber-600/30 transition cursor-pointer active:ring-2 active:ring-amber-400 ${
                  activeAction === "directions" ? "ring-2 ring-amber-400" : ""
                }`}
              >
                {activeAction === "directions" ? "✓ Route prepared" : "Get Directions"}
              </button>
              <button
                onClick={() => handleQuickAction("share")}
                className={`w-full px-4 py-2 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm font-semibold text-amber-200 hover:bg-amber-600/30 transition cursor-pointer active:ring-2 active:ring-amber-400 ${
                  activeAction === "share" ? "ring-2 ring-amber-400" : ""
                }`}
              >
                {activeAction === "share" ? "✓ Location shared" : "Share Location"}
              </button>

              <div className="pt-2 border-t border-amber-500/30">
                <LiveTrackingControl defaultDeviceId={deviceId} compact allowDeviceSelection={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Location History */}
        <div className="tm-card rounded-xl border border-amber-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">📍</span> Location History
          </h3>
          <DeviceHistory deviceId={deviceId} />
        </div>
      </main>
    </div>
  );
}
