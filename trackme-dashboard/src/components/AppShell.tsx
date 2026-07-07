"use client";

import ErrorBoundary from "./ErrorBoundary";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeToggle />
      <ErrorBoundary>
        <div className="min-h-screen w-full bg-[var(--tm-bg-secondary)]">
          {children}
        </div>
      </ErrorBoundary>
    </>
  );
}
