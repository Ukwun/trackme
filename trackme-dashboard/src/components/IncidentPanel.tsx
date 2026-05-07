"use client";

import { useEffect, useState } from "react";
import { connectSocket } from "../realtime/socket";

async function sendNotification(message: string, type: string = "info") {
  await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, type }),
  });
}

export default function IncidentPanel() {
  const [incident, setIncident] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  useEffect(() => {
    const socket = connectSocket();
    socket.on("incident-update", setIncident);
    socket.on("unit-update", setUnits);
    return () => {
      socket.off("incident-update", setIncident);
      socket.off("unit-update", setUnits);
    };
  }, []);

  async function assignUnit(unitId: string) {
    if (!incident) return;
    const updated = {
      ...incident,
      assignedUnits: Array.from(new Set([...(incident.assignedUnits || []), unitId])),
      timeline: [...(incident.timeline || []), { status: `Unit ${unitId} assigned`, time: new Date().toLocaleTimeString() }],
    };
    const socket = connectSocket();
    socket.emit("incident-update", updated);
    await sendNotification(`Unit ${unitId} assigned to incident ${incident.id}`, "info");
  }

  async function updateStatus(newStatus: string) {
    if (!incident) return;
    const updated = {
      ...incident,
      status: newStatus,
      timeline: [...(incident.timeline || []), { status: newStatus, time: new Date().toLocaleTimeString() }],
    };
    const socket = connectSocket();
    socket.emit("incident-update", updated);
    await sendNotification(`Incident ${incident.id} status updated to ${newStatus}`, newStatus === "Resolved" ? "success" : "info");
  }

  if (!incident) return (
    <div className="tm-card p-4 mb-4 text-[var(--tm-text-secondary)]">No active incident.</div>
  );
  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-lg font-semibold mb-2">Incident Details</h2>
      <div className="mb-2 text-xs text-[var(--tm-text-secondary)]">ID: {incident.id}</div>
      <div className="mb-2 font-semibold">{incident.type}</div>
      <div className="mb-2">Status: <span className="text-[var(--tm-accent-blue)]">{incident.status}</span></div>
      <div className="mb-2">Location: {incident.location}</div>
      <div className="mb-2">Assigned Units: {incident.assignedUnits?.join(", ")}</div>
      <div className="mb-2">Created: {incident.createdAt}</div>
      <div className="flex flex-wrap gap-2 my-2">
        <span className="font-semibold text-xs">Assign Unit:</span>
        {units.map((u) => (
          <button
            key={u.id}
            className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow"
            onClick={() => assignUnit(u.id)}
            disabled={incident.assignedUnits?.includes(u.id)}
          >{u.name}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 my-2">
        <span className="font-semibold text-xs">Update Status:</span>
        {["En Route", "Arrived", "Engaged", "Resolved"].map((status) => (
          <button
            key={status}
            className="px-2 py-1 rounded bg-green-600 text-white text-xs font-semibold shadow"
            onClick={() => updateStatus(status)}
            disabled={incident.status === status}
          >{status}</button>
        ))}
      </div>
      <div className="mt-4">
        <div className="font-semibold mb-1">Timeline</div>
        <ul className="text-xs">
          {incident.timeline?.map((t: any, idx: number) => (
            <li key={idx}>{t.time} - {t.status}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
