"use client";

import { useEffect, useState } from "react";

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
  const [identity, setIdentity] = useState({ name: "Verified operator", email: "" });

  useEffect(() => {
    const sync = () => setIdentity({
      name: window.localStorage.getItem("tm_auth_name") || "Verified operator",
      email: window.localStorage.getItem("tm_auth_email") || "",
    });
    sync();
    window.addEventListener("tm-auth-changed", sync);
    return () => window.removeEventListener("tm-auth-changed", sync);
  }, []);

  function signOut() {
    for (const key of ["tm_auth_token", "tm_auth_role", "tm_auth_name", "tm_auth_email"]) window.localStorage.removeItem(key);
    window.dispatchEvent(new Event("tm-auth-changed"));
    window.location.assign("/");
  }

  return (
    <aside className="tm-glass flex w-full flex-col border-b border-[var(--tm-border)] bg-[var(--tm-bg-sidebar)] px-4 py-4 shadow-lg lg:min-h-screen lg:max-w-[236px] lg:border-b-0 lg:border-r lg:py-8">
      <div className="mb-5 flex items-center gap-3 lg:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-sm font-black text-slate-950">{identity.name.slice(0, 2).toUpperCase()}</div>
        <div className="min-w-0"><span className="tm-heading block text-lg font-bold tracking-wider text-[var(--tm-accent-blue)]">{config.label}</span><p className="truncate text-xs text-[var(--tm-text-secondary)]">{identity.email || identity.name}</p></div>
      </div>
      <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-3" aria-label={`${config.label} workspace`}>
        {config.items.map((item) => <button key={item} type="button" aria-pressed={activeItem === item} onClick={() => setActiveItem(item)} className={`rounded-xl border px-3 py-2 text-left text-sm font-medium ${activeItem === item ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100" : "border-transparent text-[var(--tm-text-main)] hover:border-[var(--tm-border)] hover:bg-white/5"}`}>{item}</button>)}
      </nav>
      <div className="mt-4 border-t border-white/10 pt-4 lg:mt-auto"><button type="button" onClick={signOut} className="w-full rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20">Sign out securely</button><div className="mt-4 hidden text-xs text-[var(--tm-text-secondary)] opacity-70 lg:block">© 2026 TrackMe</div></div>
    </aside>
  );
}
