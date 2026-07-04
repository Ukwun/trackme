"use client";

import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { useState } from "react";

const sidebarConfig: Record<string, { label: string; items: string[] }> = {
  super_admin: { label: "Super Admin", items: ["User Management", "Analytics", "Devices", "Mobile Client"] },
  control_room: { label: "Control Room", items: ["Incidents", "Geofences", "Units"] },
  dispatcher: { label: "Dispatcher", items: ["Incidents", "Units", "Assignments", "Communications"] },
  patrol_officer: { label: "Patrol Officer", items: ["Assigned Incidents", "Location History", "Status Update"] },
  analyst: { label: "Analyst", items: ["Analytics", "Reports", "Export Data"] },
  field_agent: { label: "Field Agent", items: ["Assigned Tasks", "Location Reporting", "Incident Updates"] },
};

export default function RoleSidebar({ role }: { role: string }) {
  const config = sidebarConfig[role] || { label: "Team Member", items: [] };
  const [activeItem, setActiveItem] = useState(config.items[0] || "");
  const { user } = useUser();

  const clearLegacySession = () => {
    window.localStorage.removeItem("tm_auth_token");
    window.localStorage.removeItem("tm_auth_role");
    window.dispatchEvent(new Event("tm-auth-changed"));
  };

  return (
    <aside className="tm-glass flex w-full flex-col border-b border-[var(--tm-border)] bg-[var(--tm-bg-sidebar)] px-4 py-4 shadow-lg lg:min-h-screen lg:max-w-[236px] lg:border-b-0 lg:border-r lg:py-8">
      <div className="mb-5 flex items-center justify-between gap-3 lg:flex-col lg:items-start">
        <div>
          <span className="tm-heading text-xl font-bold tracking-widest text-[var(--tm-accent-blue)]">{config.label}</span>
          <p className="mt-1 max-w-[180px] truncate text-xs text-[var(--tm-text-secondary)]">{user?.primaryEmailAddress?.emailAddress || "Verified operator"}</p>
        </div>
        <UserButton appearance={{ elements: { avatarBox: "h-10 w-10 ring-2 ring-cyan-400/30" } }} />
      </div>

      <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-3" aria-label={`${config.label} workspace`}>
        {config.items.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={activeItem === item}
            onClick={() => setActiveItem(item)}
            className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${activeItem === item ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100" : "border-transparent text-[var(--tm-text-main)] hover:border-[var(--tm-border)] hover:bg-white/5"}`}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4 lg:mt-auto">
        <SignOutButton redirectUrl="/">
          <button type="button" onClick={clearLegacySession} className="w-full rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20">Sign out securely</button>
        </SignOutButton>
        <div className="mt-4 hidden text-xs text-[var(--tm-text-secondary)] opacity-70 lg:block">© 2026 TrackMe</div>
      </div>
    </aside>
  );
}
