"use client";

import { useEffect, useState } from "react";
import { connectSocket } from "../realtime/socket";
import { getClientSession } from "../lib/clientAuth";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  UnauthorizedState,
} from "./ui/OperationalState";

async function sendNotification(message: string, type: string = "info", delivery: string[] = ["in-app"]) {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("tm_auth_token") : null;
  await fetch("/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, type, delivery }),
  });
}

const ALLOWED_ROLES = ["super_admin", "control_room", "dispatcher", "patrol_officer", "field_agent"];

export default function UnitList() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ReturnType<typeof getClientSession> | null>(null);

  useEffect(() => {
    // Initialize session on client only to avoid SSR hydration mismatch
    setSession(getClientSession());
    const handleAuthChange = () => setSession(getClientSession());
    window.addEventListener("tm-auth-changed", handleAuthChange);
    return () => window.removeEventListener("tm-auth-changed", handleAuthChange);
  }, []);

  useEffect(() => {
    // Fetch units on mount
    async function loadUnits() {
      try {
        const token = typeof window !== "undefined" ? window.localStorage.getItem("tm_auth_token") : null;
        const res = await fetch("/api/devices", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 401) {
          setError("Unauthorized");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch units: ${res.statusText}`);
        }
        const data = await res.json();
        setUnits(data.devices || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load units");
        setLoading(false);
      }
    }

    if (session) {
      loadUnits();
    }

    const socket = connectSocket();
    socket.on("unit-update", (incomingUnits: any[]) => {
      setUnits(incomingUnits);
      setError(null);
      setLoading(false);
      // Notify if any unit goes offline
      incomingUnits.forEach((u: any) => {
        if (u.status === "Offline") {
          sendNotification(`Unit ${u.name} is offline`, "warning", ["in-app", "sms"]);
        }
      });
    });
    return () => {
      socket.off("unit-update");
    };
  }, [session]);

  // Role-based access check
  if (session && session.role && !ALLOWED_ROLES.includes(session.role)) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Units</h2>
        <UnauthorizedState detail="Your role does not have access to unit tracking." />
      </div>
    );
  }

  // Authorization pending
  if (!session) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Units</h2>
        <LoadingState title="Verifying access" detail="Checking authentication..." />
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Units</h2>
        <ErrorState
          detail={error}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            setError(null);
          }}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Units</h2>
        <LoadingState title="Loading units" detail="Fetching unit status..." />
      </div>
    );
  }

  // Empty state
  if (units.length === 0) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Units</h2>
        <EmptyState
          title="No Units Online"
          detail="All assigned units are currently offline."
        />
      </div>
    );
  }

  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-lg font-semibold mb-2">Units</h2>
      <ul className="divide-y divide-[var(--tm-border)]">
        {units.map((unit) => (
          <li key={unit.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-semibold text-[var(--tm-text-main)]">{unit.name}</div>
              <div className="text-xs text-[var(--tm-text-secondary)]">{unit.type} • {unit.status}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--tm-accent-blue)]">{unit.battery}%</span>
              <span className={`w-2 h-2 rounded-full ${unit.status === 'Active' ? 'bg-green-500' : unit.status === 'En Route' ? 'bg-yellow-400' : 'bg-gray-400'}`}></span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
