import React from "react";

const sidebarConfig: Record<string, { label: string; items: { label: string; href?: string; }[] }> = {
  super_admin: {
    label: "Super Admin",
    items: [
      { label: "User Management" },
      { label: "Analytics" },
      { label: "Devices" },
      { label: "Simulate Mobile Client" },
    ],
  },
  control_room: {
    label: "Control Room",
    items: [
      { label: "Incidents" },
      { label: "Geofences" },
      { label: "Units" },
    ],
  },
  dispatcher: {
    label: "Dispatcher",
    items: [
      { label: "Incidents" },
      { label: "Units" },
      { label: "Assignments" },
      { label: "Communications" },
    ],
  },
  patrol_officer: {
    label: "Patrol Officer",
    items: [
      { label: "Assigned Incidents" },
      { label: "Location History" },
      { label: "Status Update" },
    ],
  },
  analyst: {
    label: "Analyst",
    items: [
      { label: "Analytics" },
      { label: "Reports" },
      { label: "Export Data" },
    ],
  },
  field_agent: {
    label: "Field Agent",
    items: [
      { label: "Assigned Tasks" },
      { label: "Location Reporting" },
      { label: "Incident Updates" },
    ],
  },
};

export default function RoleSidebar({ role }: { role: string }) {
  const config = sidebarConfig[role] || { label: "Unknown", items: [] };
  return (
    <aside className="tm-glass w-full lg:max-w-[220px] lg:min-h-screen flex flex-col py-4 lg:py-8 px-4 border-b lg:border-b-0 lg:border-r border-[var(--tm-border)] shadow-lg bg-[var(--tm-bg-sidebar)]">
      <div className="flex flex-col items-start lg:items-center mb-4 lg:mb-8">
        <span className="text-xl font-bold tracking-widest text-[var(--tm-accent-blue)] tm-heading">{config.label}</span>
      </div>
      <nav className="flex flex-wrap lg:flex-col gap-2 lg:gap-4">
        {config.items.map((item, i) => (
          <span key={i} className="text-sm lg:text-base font-medium text-[var(--tm-text-main)] hover:text-[var(--tm-accent-blue)] cursor-pointer px-2 py-1 rounded-md border border-transparent hover:border-[var(--tm-border)]">
            {item.label}
          </span>
        ))}
      </nav>
      <div className="hidden lg:block mt-auto pt-8 text-xs text-[var(--tm-text-secondary)] opacity-70">© 2026 Trackme</div>
    </aside>
  );
}
