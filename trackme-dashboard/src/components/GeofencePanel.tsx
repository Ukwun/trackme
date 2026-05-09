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

const ALLOWED_ROLES = ["super_admin", "control_room", "dispatcher", "analyst"];

export default function GeofencePanel() {
  const [geofences, setGeofences] = useState<any[]>([]);
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
    // Fetch geofences on mount
    async function loadGeofences() {
      try {
        const token = typeof window !== "undefined" ? window.localStorage.getItem("tm_auth_token") : null;
        const res = await fetch("/api/geofences", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.status === 401) {
          setError("Unauthorized");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch geofences: ${res.statusText}`);
        }
        const data = await res.json();
        setGeofences(data.geofences || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load geofences");
        setLoading(false);
      }
    }

    if (session) {
      loadGeofences();
    }

    const socket = connectSocket();
    socket.on("geofence-update", (data) => {
      setGeofences(data);
      setError(null);
      setLoading(false);
    });
    return () => {
      socket.off("geofence-update");
    };
  }, [session]);

  // Role-based access check
  if (session && session.role && !ALLOWED_ROLES.includes(session.role)) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Geofences</h2>
        <UnauthorizedState detail="Your role does not have access to geofence data." />
      </div>
    );
  }

  // Authorization pending
  if (!session) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Geofences</h2>
        <LoadingState title="Verifying access" detail="Checking authentication..." />
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Geofences</h2>
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
        <h2 className="tm-heading text-lg font-semibold mb-2">Geofences</h2>
        <LoadingState title="Loading geofences" detail="Fetching geofence data..." />
      </div>
    );
  }

  // Empty state
  if (geofences.length === 0) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Geofences</h2>
        <EmptyState
          title="No Geofences"
          detail="No geofence zones have been configured yet."
        />
      </div>
    );
  }

  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-lg font-semibold mb-2">Geofences</h2>
      <ul className="divide-y divide-[var(--tm-border)]">
        {geofences.map((geo) => (
          <li key={geo.id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-semibold text-[var(--tm-text-main)]">{geo.name}</div>
              <div className="text-xs text-[var(--tm-text-secondary)]">{geo.type}</div>
            </div>
            <span className={`text-xs ${geo.status === 'Active' ? 'text-green-500' : 'text-gray-400'}`}>{geo.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
