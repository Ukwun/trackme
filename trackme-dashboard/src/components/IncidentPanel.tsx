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

async function sendNotification(message: string, type: string = "info") {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("tm_auth_token") : null;
  await fetch("/api/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, type }),
  });
}

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("tm_auth_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getIncidentId(currentIncident: any): string | null {
  if (currentIncident?._id) return String(currentIncident._id);
  if (currentIncident?.id) return String(currentIncident.id);
  return null;
}

const ALLOWED_ROLES = ["super_admin", "control_room", "dispatcher"];

export default function IncidentPanel() {
  const [incident, setIncident] = useState<any>(null);
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
    async function loadLatestIncident() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/incidents", { headers: getAuthHeaders() });
        if (res.status === 401) {
          setError("Unauthorized: insufficient permissions");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch incidents: ${res.statusText}`);
        }
        const data = await res.json();
        if (Array.isArray(data.incidents) && data.incidents.length > 0) {
          setIncident(data.incidents[0]);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load incidents");
        setLoading(false);
      }
    }

    if (session) {
      loadLatestIncident();
    }

    const socket = connectSocket();
    socket.on("incident-update", (data: unknown) => {
      if (data && typeof data === "object") {
        setIncident(data as any);
      }
      setError(null);
    });
    socket.on("unit-update", (data: unknown) => {
      if (Array.isArray(data)) {
        setUnits(data as any[]);
      }
    });
    return () => {
      socket.off("incident-update");
      socket.off("unit-update");
    };
  }, [session]);

  async function assignUnit(unitId: string) {
    if (!incident) return;
    const incidentId = getIncidentId(incident);
    if (!incidentId) return;

    const res = await fetch("/api/incidents", {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ incidentId, assignUnitId: unitId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.incident) return;

    setIncident(data.incident);
    await sendNotification(`Unit ${unitId} assigned to incident ${incidentId}`, "info");
  }

  async function updateStatus(newStatus: string) {
    if (!incident) return;
    const incidentId = getIncidentId(incident);
    if (!incidentId) return;

    const res = await fetch("/api/incidents", {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ incidentId, status: newStatus }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.incident) return;

    setIncident(data.incident);
    await sendNotification(`Incident ${incidentId} status updated to ${newStatus}`, newStatus === "Resolved" ? "success" : "info");
  }

  // Role-based access check
  if (session && session.role && !ALLOWED_ROLES.includes(session.role)) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Incidents</h2>
        <UnauthorizedState detail="Your role does not have access to incident management." />
      </div>
    );
  }

  // Authorization pending or no session
  if (!session) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Incidents</h2>
        <LoadingState title="Verifying access" detail="Checking authentication..." />
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Incidents</h2>
        <ErrorState
          detail={error}
          actionLabel="Retry"
          onAction={() => {
            setLoading(true);
            setError(null);
            // Trigger reload
            window.dispatchEvent(new Event("tm-incident-retry"));
          }}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Incidents</h2>
        <LoadingState title="Loading incidents" detail="Fetching active incident data..." />
      </div>
    );
  }

  // Empty state
  if (!incident) {
    return (
      <div className="tm-card p-4 mb-4">
        <h2 className="tm-heading text-lg font-semibold mb-2">Incidents</h2>
        <EmptyState
          title="No Active Incidents"
          detail="All incidents have been resolved or are awaiting dispatch."
        />
      </div>
    );
  }

  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-lg font-semibold mb-2">Incident Details</h2>
      <div className="mb-2 text-xs text-(--tm-text-secondary)">ID: {incident.id}</div>
      <div className="mb-2 font-semibold">{incident.type}</div>
      <div className="mb-2">Status: <span className="text-(--tm-accent-blue)">{incident.status}</span></div>
      <div className="mb-2">Location: {incident.location}</div>
      <div className="mb-2">Assigned Units: {incident.assignedUnits?.join(", ") || "None"}</div>
      <div className="mb-2">Created: {incident.createdAt}</div>
      <div className="flex flex-wrap gap-2 my-2">
        <span className="font-semibold text-xs">Assign Unit:</span>
        {units.length === 0 ? (
          <span className="text-xs text-(--tm-text-secondary)">No units available</span>
        ) : (
          units.map((u) => (
            <button
              key={u.id}
              className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 disabled:opacity-50"
              onClick={() => assignUnit(u.id)}
              disabled={incident.assignedUnits?.includes(u.id)}
            >{u.name}</button>
          ))
        )}
      </div>
      <div className="flex flex-wrap gap-2 my-2">
        <span className="font-semibold text-xs">Update Status:</span>
        {["En Route", "Arrived", "Engaged", "Resolved"].map((status) => (
          <button
            key={status}
            className="px-2 py-1 rounded bg-green-600 text-white text-xs font-semibold shadow hover:bg-green-700 disabled:opacity-50"
            onClick={() => updateStatus(status)}
            disabled={incident.status === status}
          >{status}</button>
        ))}
      </div>
      <div className="mt-4">
        <div className="font-semibold mb-1">Timeline</div>
        <ul className="text-xs">
          {incident.timeline && incident.timeline.length > 0 ? (
            incident.timeline.map((t: any, idx: number) => (
              <li key={idx}>{t.time} - {t.status}</li>
            ))
          ) : (
            <li className="text-(--tm-text-secondary)">No events recorded</li>
          )}
        </ul>
      </div>
    </div>
  );
}
