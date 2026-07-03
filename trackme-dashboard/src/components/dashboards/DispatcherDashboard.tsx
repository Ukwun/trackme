"use client";

import { useEffect, useState } from "react";
import IncidentPanel from "../IncidentPanel";
import UnitList from "../UnitList";
import Map from "../Map";
import RoleSidebar from "./RoleSidebar";
import { roleIcons, widgetIcons } from "../RoleIcons";
import { connectSocket } from "../../realtime/socket";

export default function DispatcherDashboard() {
  const [activeAction, setActiveAction] = useState<string>("Dispatch");
  const [commsStatus, setCommsStatus] = useState<string>("Channel idle");
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [unitTrails, setUnitTrails] = useState<Record<string, Array<[number, number]>>>({});
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const focusSection = (sectionId: string, actionLabel: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setActiveAction(actionLabel);
  };

  const handleQuickAction = (action: string) => {
    setActiveButton(action);
    setTimeout(() => setActiveButton(null), 2000);
  };

  const useChannel = (channel: "SMS" | "Radio" | "Call") => {
    const time = new Date().toLocaleTimeString();
    setCommsStatus(`${channel} channel armed at ${time}`);
    handleQuickAction(`channel-${channel}`);
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

    const pollInterval = setInterval(async () => {
      try {
        const token = window.localStorage.getItem("tm_auth_token");
        const response = await fetch("/api/locations?limit=30", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length === 0) return;

        const latestByDevice = new globalThis.Map<string, any>();
        for (const row of rows) {
          if (!row?.deviceId) continue;
          if (!latestByDevice.has(row.deviceId)) {
            latestByDevice.set(row.deviceId, row);
          }
        }

        for (const row of latestByDevice.values()) {
          handleLocationUpdate(row);
        }
      } catch {
        // Ignore polling failures and keep socket updates active.
      }
    }, 2500);

    return () => {
      socket.off("location-update", handleLocationUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-linear-to-br from-slate-900 via-green-900 to-slate-900">
      <RoleSidebar role="dispatcher" />
      <main className="flex-1 flex flex-col gap-4 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl sm:text-5xl">{roleIcons.dispatcher}</div>
            <div>
              <h1 className="tm-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Dispatcher
              </h1>
              <p className="text-sm text-green-200 mt-1">Incident queue and unit dispatch coordination</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <button onClick={() => { focusSection("dispatch-units", "Dispatch Units"); handleQuickAction("dispatch"); }} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-green-500/30 bg-linear-to-br from-green-500/10 to-green-600/5 hover:border-green-400/50 transition ${ activeButton === "dispatch" ? "ring-2 ring-green-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.assign}</div>
            <div className="text-xs uppercase tracking-wider text-green-300 font-semibold">Dispatch</div>
            <div className="text-sm font-bold text-green-100">Units</div>
            {activeButton === "dispatch" && <div className="mt-2 text-xs text-green-400">✓ Units selected</div>}
          </button>
          <button onClick={() => { focusSection("dispatch-incidents", "Review Incident Queue"); handleQuickAction("queue"); }} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-green-500/30 bg-linear-to-br from-green-500/10 to-green-600/5 hover:border-green-400/50 transition ${ activeButton === "queue" ? "ring-2 ring-green-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.report}</div>
            <div className="text-xs uppercase tracking-wider text-green-300 font-semibold">Incident</div>
            <div className="text-sm font-bold text-green-100">Queue</div>
            {activeButton === "queue" && <div className="mt-2 text-xs text-green-400">✓ Queue loaded</div>}
          </button>
          <button onClick={() => { focusSection("dispatch-units", "Check Unit Status"); handleQuickAction("status"); }} className={`tm-card text-left p-3 sm:p-4 rounded-lg border border-green-500/30 bg-linear-to-br from-green-500/10 to-green-600/5 hover:border-green-400/50 transition ${ activeButton === "status" ? "ring-2 ring-green-400" : "" }`}>
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.status}</div>
            <div className="text-xs uppercase tracking-wider text-green-300 font-semibold">Unit</div>
            <div className="text-sm font-bold text-green-100">Status</div>
            {activeButton === "status" && <div className="mt-2 text-xs text-green-400">✓ Checking now</div>}
          </button>
        </div>

        <div className="tm-card rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-xs text-green-100">
          Active workflow: <span className="font-semibold">{activeAction}</span> | Communications: <span className="font-semibold">{commsStatus}</span>
        </div>

        {/* Live Map */}
        <div className="tm-card rounded-xl border border-green-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🗺️</span> Dispatch Map - Live Units
          </h3>
          <div style={{ height: "400px" }}>
            <Map locations={locations} selectedUnit={selectedUnit} trails={unitTrails} />
          </div>
        </div>

        {/* Primary Incident Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Incident Queue (Primary) */}
          <div id="dispatch-incidents">
            <div className="tm-card rounded-xl border border-green-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">⚠️</span> Incident Queue
              </h2>
              <IncidentPanel />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-3">
            <div className="tm-card rounded-lg border border-green-500/30 bg-linear-to-br from-green-500/5 to-green-600/5 p-3">
              <div className="text-sm text-green-300 uppercase tracking-wider font-semibold">Priority</div>
              <div className="text-2xl font-bold text-green-100 mt-2">High</div>
            </div>
            <div className="tm-card rounded-lg border border-green-500/30 bg-linear-to-br from-green-500/5 to-green-600/5 p-3">
              <div className="text-sm text-green-300 uppercase tracking-wider font-semibold">Pending</div>
              <div className="text-2xl font-bold text-green-100 mt-2">Units</div>
            </div>
          </div>
        </div>

        {/* Available Units */}
        <div id="dispatch-units" className="tm-card rounded-xl border border-green-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 lg:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🚗</span> Available Units
          </h3>
          <UnitList />
        </div>

        {/* Communication Tools */}
        <div className="tm-card rounded-xl border border-green-500/40 bg-linear-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 lg:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Communication</h3>
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              Send communication to field units via available channels:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button onClick={() => useChannel("SMS")} className={`px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg text-sm font-semibold text-green-200 hover:bg-green-600/30 transition ${ activeButton === "channel-SMS" ? "ring-2 ring-green-400" : "" }`}>
                📱 SMS {activeButton === "channel-SMS" && "✓"}
              </button>
              <button onClick={() => useChannel("Radio")} className={`px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg text-sm font-semibold text-green-200 hover:bg-green-600/30 transition ${ activeButton === "channel-Radio" ? "ring-2 ring-green-400" : "" }`}>
                📻 Radio {activeButton === "channel-Radio" && "✓"}
              </button>
              <button onClick={() => useChannel("Call")} className={`px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg text-sm font-semibold text-green-200 hover:bg-green-600/30 transition ${ activeButton === "channel-Call" ? "ring-2 ring-green-400" : "" }`}>
                📞 Call {activeButton === "channel-Call" && "✓"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
