import UserManagement from "../../../app/admin/user-management";
import AnalyticsPanel from "../AnalyticsPanel";
import RegisterDevice from "../RegisterDevice";
import DeviceList from "../DeviceList";
import SharedDevices from "../SharedDevices";
import MobileClientSimulator from "../MobileClientSimulator";
import RoleSidebar from "./RoleSidebar";
import { roleIcons, widgetIcons } from "../RoleIcons";

export default function SuperAdminDashboard({ token }: { token: string }) {
  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <RoleSidebar role="super_admin" />
      <main className="flex-1 flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 lg:p-6 overflow-y-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl sm:text-5xl">{roleIcons.super_admin}</div>
            <div>
              <h1 className="tm-heading text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Super Admin
              </h1>
              <p className="text-sm text-blue-200 mt-1">System oversight and user management</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="tm-card p-3 sm:p-4 md:p-5 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm hover:border-blue-400/50 transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">{widgetIcons.refresh}</div>
              <div>
                <div className="text-xs uppercase tracking-wider text-blue-300 font-semibold">System Status</div>
                <div className="text-base sm:text-lg font-bold text-blue-100 mt-1">Operational</div>
              </div>
            </div>
          </div>
          <div className="tm-card p-3 sm:p-4 md:p-5 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm hover:border-blue-400/50 transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">{widgetIcons.assign}</div>
              <div>
                <div className="text-xs uppercase tracking-wider text-blue-300 font-semibold">Users</div>
                <div className="text-base sm:text-lg font-bold text-blue-100 mt-1">All Roles</div>
              </div>
            </div>
          </div>
          <div className="tm-card p-3 sm:p-4 md:p-5 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm hover:border-blue-400/50 transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">{widgetIcons.export}</div>
              <div>
                <div className="text-xs uppercase tracking-wider text-blue-300 font-semibold">Devices</div>
                <div className="text-base sm:text-lg font-bold text-blue-100 mt-1">Managed</div>
              </div>
            </div>
          </div>
          <div className="tm-card p-3 sm:p-4 md:p-5 rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm hover:border-blue-400/50 transition">
            <div className="flex items-center gap-3">
              <div className="text-2xl sm:text-3xl">🔐</div>
              <div>
                <div className="text-xs uppercase tracking-wider text-blue-300 font-semibold">Incidents</div>
                <div className="text-base sm:text-lg font-bold text-blue-100 mt-1">Monitored</div>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4">
          {/* User Management (Primary) */}
          <div className="space-y-3 sm:space-y-4 xl:col-span-7">
            <div className="tm-card rounded-xl border border-blue-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">{widgetIcons.assign}</span> User Management
              </h2>
              <UserManagement />
            </div>
          </div>

          {/* Analytics Sidebar */}
          <div className="space-y-3 sm:space-y-4 xl:col-span-5">
            <div className="tm-card rounded-xl border border-blue-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 xl:sticky xl:top-4">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">📊</span> Analytics
              </h3>
              <AnalyticsPanel />
            </div>
          </div>
        </div>

        {/* Device Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="tm-card rounded-xl border border-blue-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Register Device</h3>
            <RegisterDevice />
          </div>
          <div className="tm-card rounded-xl border border-blue-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Shared Devices</h3>
            <SharedDevices />
          </div>
        </div>

        {/* Device List */}
        <div className="tm-card rounded-xl border border-blue-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 lg:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3">All Devices</h3>
          <DeviceList />
        </div>

        {/* Mobile Simulator */}
        <div className="tm-card rounded-xl border border-blue-500/40 bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-4 md:p-5 lg:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-3">Mobile Client Simulator</h3>
          <MobileClientSimulator />
        </div>
      </main>
    </div>
  );
}
