import IncidentPanel from "../IncidentPanel";
import GeofencePanel from "../GeofencePanel";
import UnitList from "../UnitList";
import RoleSidebar from "./RoleSidebar";
import { roleIcons, widgetIcons } from "../RoleIcons";
import AbujaTrackingSimulation from "../AbujaTrackingSimulation";

export default function ControlRoomDashboard() {
  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <RoleSidebar role="control_room" />
      <main className="flex-1 flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl sm:text-5xl">{roleIcons.control_room}</div>
            <div>
              <h1 className="tm-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Control Room
              </h1>
              <p className="text-sm text-purple-200 mt-1">Tactical incident command and unit coordination</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          <div className="tm-card p-3 sm:p-4 rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:border-purple-400/50 transition">
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.incident}</div>
            <div className="text-xs uppercase tracking-wider text-purple-300 font-semibold">Live</div>
            <div className="text-sm font-bold text-purple-100">Incidents</div>
          </div>
          <div className="tm-card p-3 sm:p-4 rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:border-purple-400/50 transition">
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.assign}</div>
            <div className="text-xs uppercase tracking-wider text-purple-300 font-semibold">Assign</div>
            <div className="text-sm font-bold text-purple-100">Units</div>
          </div>
          <div className="tm-card p-3 sm:p-4 rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:border-purple-400/50 transition">
            <div className="text-2xl sm:text-3xl mb-2">{widgetIcons.status}</div>
            <div className="text-xs uppercase tracking-wider text-purple-300 font-semibold">Update</div>
            <div className="text-sm font-bold text-purple-100">Status</div>
          </div>
          <div className="tm-card p-3 sm:p-4 rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:border-purple-400/50 transition">
            <div className="text-2xl sm:text-3xl mb-2">🗺️</div>
            <div className="text-xs uppercase tracking-wider text-purple-300 font-semibold">Monitor</div>
            <div className="text-sm font-bold text-purple-100">Geofences</div>
          </div>
        </div>

        <AbujaTrackingSimulation />

        {/* Primary Incident & Geofence Management */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4">
          {/* Incident Panel (Primary) */}
          <div className="xl:col-span-5">
            <div className="tm-card rounded-xl border border-purple-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">{widgetIcons.incident}</span> Active Incidents
              </h2>
              <IncidentPanel />
            </div>
          </div>

          {/* Geofence Panel (Secondary) */}
          <div className="xl:col-span-7">
            <div className="tm-card rounded-xl border border-purple-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🗺️</span> Geofences
              </h3>
              <GeofencePanel />
            </div>
          </div>
        </div>

        {/* Unit Coordination */}
        <div className="tm-card rounded-xl border border-purple-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 lg:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">👥</span> Unit Status & Coordination
          </h3>
          <UnitList />
        </div>
      </main>
    </div>
  );
}
