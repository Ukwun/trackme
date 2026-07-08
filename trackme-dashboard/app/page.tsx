"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AuthHeader from "../src/components/AuthHeader";
import AuthForm from "../src/components/AuthForm";
import NotificationCenter from "../src/components/NotificationCenter";
import ActivityLog from "../src/components/ActivityLog";
import GeofencePanel from "../src/components/GeofencePanel";
import IncidentPanel from "../src/components/IncidentPanel";
import RightIntelligencePanel from "../src/components/RightIntelligencePanel";
import RegisterDevice from "../src/components/RegisterDevice";
import DeviceList from "../src/components/DeviceList";
import SharedDevices from "../src/components/SharedDevices";
import MobileClientSimulator from "../src/components/MobileClientSimulator";
import UserManagement from "../src/components/UserManagement";
import SuperAdminDashboard from "../src/components/dashboards/SuperAdminDashboard";
import ControlRoomDashboard from "../src/components/dashboards/ControlRoomDashboard";
import DispatcherDashboard from "../src/components/dashboards/DispatcherDashboard";
import PatrolOfficerDashboard from "../src/components/dashboards/PatrolOfficerDashboard";
import AnalystDashboard from "../src/components/dashboards/AnalystDashboard";
import FieldAgentDashboard from "../src/components/dashboards/FieldAgentDashboard";
import Map from "../src/components/Map";
import { connectSocket } from "../src/realtime/socket";
import { getClientSession } from "../src/lib/clientAuth";

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="tm-card rounded-2xl border border-[var(--tm-border)] bg-[rgba(15,23,42,0.72)] p-4 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-[0.24em] text-[var(--tm-text-secondary)]">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[var(--tm-text-main)]">{value}</div>
      <div className="mt-1 text-sm text-[var(--tm-text-secondary)]">{helper}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [unitTrails, setUnitTrails] = useState<Record<string, Array<[number, number]>>>({});
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const handleAuth = useCallback((result: { token: string; role: string; name?: string; email?: string }) => {
    window.localStorage.setItem("tm_auth_token", result.token);
    window.localStorage.setItem("tm_auth_role", result.role);
    if (result.name) window.localStorage.setItem("tm_auth_name", result.name);
    if (result.email) window.localStorage.setItem("tm_auth_email", result.email);
    setToken(result.token);
    setRole(result.role);
    window.dispatchEvent(new Event("tm-auth-changed"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAuthState = () => {
      const session = getClientSession();
      setToken(session.token);
      setRole(session.role);
    };

    syncAuthState();
    window.addEventListener("tm-auth-changed", syncAuthState);
    return () => window.removeEventListener("tm-auth-changed", syncAuthState);
  }, []);

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
    socket.on("geofence-update", () => undefined);
    socket.on("incident-update", () => undefined);

    const pollInterval = setInterval(async () => {
      try {
        const authToken = window.localStorage.getItem("tm_auth_token");
        const response = await fetch("/api/locations?limit=40", {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
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
        // Ignore polling failures; socket stream remains primary.
      }
    }, 2500);

    return () => {
      socket.off("location-update", handleLocationUpdate);
      socket.off("geofence-update");
      socket.off("incident-update");
      clearInterval(pollInterval);
    };
  }, []);

  const filteredLocations = useMemo(() => {
    if (!search.trim()) return locations;
    const needle = search.trim().toLowerCase();
    return locations.filter((location) => String(location.deviceId || "").toLowerCase().includes(needle));
  }, [locations, search]);

  const summary = useMemo(() => {
    const total = locations.length;
    const moving = locations.filter((location) => Number(location.speed || 0) > 0).length;
    const lowBattery = locations.filter((location) => Number(location.battery || 100) < 25).length;
    const activeTrails = Object.keys(unitTrails).length;

    return { total, moving, lowBattery, activeTrails };
  }, [locations, unitTrails]);

  if (!token) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.22),_transparent_35%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] text-slate-100">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-5 lg:px-8">
          <AuthHeader />
          <div className="flex flex-1 items-start py-6 lg:items-center lg:py-8">
            <div className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(400px,0.88fr)]">
              <section className="tm-card flex flex-col justify-between rounded-3xl border border-cyan-400/15 bg-[linear-gradient(145deg,rgba(8,47,73,0.42),rgba(2,6,23,0.78))] p-6 shadow-2xl shadow-cyan-950/20 md:p-8 lg:p-10">
                <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                  Live operations platform
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-2xl text-4xl font-black tracking-tight text-white md:text-6xl">
                    TrackMe is a real-time operations workspace for users, devices, incidents, and intelligence.
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                    Sign in to access live location tracking, activity logging, incident handling, geofence monitoring, and role-based dashboards built for actual deployment.
                  </p>
                </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Live coverage" value="24/7" helper="Socket-driven updates" />
                  <StatCard label="Audit trail" value="Full" helper="Every action logged" />
                  <StatCard label="Responsive" value="All devices" helper="Mobile, tablet, desktop" />
                </div>
              </section>
              <section className="flex min-w-0 flex-col self-start rounded-3xl border border-white/10 bg-[rgba(2,6,23,0.56)] p-4 shadow-2xl shadow-slate-950/50 backdrop-blur-md md:p-5" aria-label="Secure account access">
                <div className="mb-4 px-1">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Secure identity portal</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Access your TrackMe workspace</h2>
                  <p className="mt-1 text-sm text-slate-400">Sign in or create an account using your verified information.</p>
                </div>
                <AuthForm onAuth={handleAuth} />
              </section>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (role === "super_admin") return <SuperAdminDashboard token={token} />;
  if (role === "control_room" || role === "control_room_commander") return <ControlRoomDashboard />;
  if (role === "dispatcher") return <DispatcherDashboard />;
  if (role === "field_supervisor") return <DispatcherDashboard />;
  if (role === "patrol_officer") return <PatrolOfficerDashboard deviceId={locations[0]?.deviceId || ""} />;
  if (role === "analyst") return <AnalystDashboard />;
  if (role === "field_agent") return <FieldAgentDashboard deviceId={locations[0]?.deviceId || ""} />;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_42%,#111827_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-[var(--tm-border)] bg-[rgba(2,6,23,0.7)] p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
          <div>
            <AuthHeader />
            <p className="mt-2 max-w-2xl text-sm text-[var(--tm-text-secondary)]">
              Live operations dashboard. Real users, real activity, real-time incident awareness.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <NotificationCenter />
            <button
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem("tm_auth_token");
                  window.localStorage.removeItem("tm_auth_role");
                  window.localStorage.removeItem("tm_auth_name");
                  window.localStorage.removeItem("tm_auth_email");
                  window.dispatchEvent(new Event("tm-auth-changed"));
                }
                setToken(null);
                setRole(null);
                setSelectedUnit(null);
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tracked units" value={String(summary.total)} helper="Devices reporting location" />
          <StatCard label="Moving now" value={String(summary.moving)} helper="Units currently active" />
          <StatCard label="Low battery" value={String(summary.lowBattery)} helper="Need attention soon" />
          <StatCard label="Route histories" value={String(summary.activeTrails)} helper="Trail streams retained" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <div className="tm-card rounded-3xl border border-[var(--tm-border)] bg-[rgba(2,6,23,0.7)] p-4 shadow-xl backdrop-blur-md md:p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[var(--tm-text-main)]">Live location map</h2>
                  <p className="text-sm text-[var(--tm-text-secondary)]">Real-time device positions and movement trails.</p>
                </div>
              </div>
              <div style={{ height: "500px" }}>
                <Map locations={locations} selectedUnit={selectedUnit} trails={unitTrails} />
              </div>
            </div>

            <div className="tm-card rounded-3xl border border-[var(--tm-border)] bg-[rgba(2,6,23,0.7)] p-4 shadow-xl backdrop-blur-md md:p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[var(--tm-text-main)]">Live device feed</h2>
                  <p className="text-sm text-[var(--tm-text-secondary)]">Search, select, and inspect currently active users and devices.</p>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search device ID"
                  className="w-full rounded-xl border border-[var(--tm-border)] bg-slate-950/70 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 md:w-72"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-auto border-collapse text-sm text-[--tm-text-main]">
                  <thead>
                    <tr className="text-left text-[var(--tm-text-secondary)]">
                      <th className="border-b border-[var(--tm-border)] px-3 py-2">Device ID</th>
                      <th className="border-b border-[var(--tm-border)] px-3 py-2">Latitude</th>
                      <th className="border-b border-[var(--tm-border)] px-3 py-2">Longitude</th>
                      <th className="border-b border-[var(--tm-border)] px-3 py-2">Speed</th>
                      <th className="border-b border-[var(--tm-border)] px-3 py-2">Heading</th>
                      <th className="border-b border-[var(--tm-border)] px-3 py-2">Battery</th>
                      <th className="border-b border-[var(--tm-border)] px-3 py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocations.map((location, index) => (
                      <tr
                        key={`${location.deviceId}-${index}`}
                        className={`cursor-pointer border-b border-[var(--tm-border)] transition hover:bg-cyan-400/10 ${selectedUnit?.deviceId === location.deviceId ? "bg-cyan-400/10" : ""}`}
                        onClick={() => setSelectedUnit(location)}
                      >
                        <td className="px-3 py-2 font-semibold">{location.deviceId}</td>
                        <td className="px-3 py-2">{location.lat}</td>
                        <td className="px-3 py-2">{location.lng}</td>
                        <td className="px-3 py-2">{location.speed ?? "-"}</td>
                        <td className="px-3 py-2">{location.heading ?? "-"}</td>
                        <td className="px-3 py-2">{location.battery ?? "-"}</td>
                        <td className="px-3 py-2">{location.timestamp ? new Date(location.timestamp * 1000).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                    {filteredLocations.length === 0 && (
                      <tr>
                        <td className="px-3 py-6 text-center text-[var(--tm-text-secondary)]" colSpan={7}>
                          No live devices match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <GeofencePanel />
              <IncidentPanel />
            </div>

            <ActivityLog token={token} />

            {role === "super_admin" && <UserManagement token={token} />}
          </div>

          <aside className="space-y-4">
            {selectedUnit ? (
              <RightIntelligencePanel selectedUnit={selectedUnit} onClose={() => setSelectedUnit(null)} />
            ) : (
              <div className="tm-card rounded-3xl border border-[var(--tm-border)] bg-[rgba(2,6,23,0.7)] p-4 text-sm text-[var(--tm-text-secondary)]">
                Select a unit to open its live intelligence panel.
              </div>
            )}

            <div className="tm-card rounded-3xl border border-[var(--tm-border)] bg-[rgba(2,6,23,0.7)] p-4">
              <RegisterDevice />
            </div>
            <div className="tm-card rounded-3xl border border-[var(--tm-border)] bg-[rgba(2,6,23,0.7)] p-4">
              <DeviceList />
            </div>
            <div className="tm-card rounded-3xl border border-[var(--tm-border)] bg-[rgba(2,6,23,0.7)] p-4">
              <SharedDevices />
            </div>
            <div className="tm-card rounded-3xl border border-[var(--tm-border)] bg-[rgba(2,6,23,0.7)] p-4">
              <MobileClientSimulator />
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
