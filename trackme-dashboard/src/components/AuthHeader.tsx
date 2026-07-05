"use client";

import { useEffect, useState } from "react";

export default function AuthHeader() {
  const [identity, setIdentity] = useState({ name: "Secure operations", role: "Authenticated workspace" });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncIdentity = () => {
      const name = window.localStorage.getItem("tm_auth_name") || "Secure operations";
      const role = window.localStorage.getItem("tm_auth_role") || "Authenticated workspace";
      setIdentity({ name, role });
    };

    syncIdentity();
    window.addEventListener("tm-auth-changed", syncIdentity);
    return () => window.removeEventListener("tm-auth-changed", syncIdentity);
  }, []);

  return (
    <header className="flex w-full items-center justify-between gap-4 border-b border-[var(--tm-border)] bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-md">
      <div>
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--tm-text-secondary)]">TrackMe</div>
        <div className="text-sm font-semibold text-[var(--tm-text-main)]">Real-time operations workspace</div>
      </div>
      <div className="text-right text-xs text-[var(--tm-text-secondary)]">
        <div className="font-semibold text-[var(--tm-text-main)]">{identity.name}</div>
        <div>{identity.role}</div>
      </div>
    </header>
  );
}
