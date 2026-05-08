"use client";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import ErrorBoundary from "./ErrorBoundary";
import UnitList from "./UnitList";
import GeofencePanel from "./GeofencePanel";
import IncidentPanel from "./IncidentPanel";
import AnalyticsPanel from "./AnalyticsPanel";


export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden tm-btn-ghost px-3 py-2 border border-[var(--tm-border)] bg-[var(--tm-bg-sidebar)] rounded-lg shadow"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Open sidebar"
      >
        <span className="text-xl">☰</span>
      </button>
      <ThemeToggle />
      <ErrorBoundary>
        <div className="flex min-h-screen w-full bg-[var(--tm-bg-secondary)]">
          {/* Left Sidebar */}
          <aside className={`tm-glass w-[80vw] max-w-[300px] min-h-screen flex flex-col py-8 px-4 border-r border-[var(--tm-border)] shadow-lg fixed md:static top-0 left-0 z-40 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:w-[300px] md:block bg-[var(--tm-bg-sidebar)]`}>
            <div className="flex flex-col items-center mb-8">
              <span className="text-2xl font-bold tracking-widest text-[var(--tm-accent-blue)] tm-heading" style={{fontFamily: 'Sora, Inter, sans-serif'}}>TRACKME</span>
              <span className="text-xs text-[var(--tm-text-secondary)] mt-1">Live Intelligence Dashboard</span>
            </div>
            <UnitList />
            <GeofencePanel />
            <div className="mt-auto pt-8 text-xs text-[var(--tm-text-secondary)] opacity-70">© 2026 Trackme</div>
          </aside>
          {/* Main Map/Content */}
          <main className="flex-1 flex flex-col items-center justify-start px-0 sm:px-8 py-8 md:ml-[300px] max-w-[calc(100vw-600px)]">
            {children}
          </main>
          {/* Right Intelligence Panel */}
          <aside className="tm-glass w-[80vw] max-w-[300px] min-h-screen flex flex-col py-8 px-4 border-l border-[var(--tm-border)] shadow-lg fixed md:static top-0 right-0 z-40 md:w-[300px] md:block bg-[var(--tm-bg-sidebar)] hidden md:flex">
            <IncidentPanel />
            <AnalyticsPanel />
          </aside>
        </div>
      </ErrorBoundary>
    </>
  );
}
