"use client";

import { useEffect, useState } from "react";
import { connectSocket } from "../realtime/socket";

async function sendNotification(message: string, type: string = "info", delivery: string[] = ["in-app"]) {
  await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, type, delivery }),
  });
}

export default function UnitList() {
  const [units, setUnits] = useState<any[]>([]);
  useEffect(() => {
    const socket = connectSocket();
    socket.on("unit-update", (units) => {
      setUnits(units);
      // Example: Notify if any unit goes offline
      units.forEach((u: any) => {
        if (u.status === "Offline") {
          sendNotification(`Unit ${u.name} is offline`, "warning", ["in-app", "sms"]);
        }
      });
    });
    return () => { socket.off("unit-update", setUnits); };
  }, []);
  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-lg font-semibold mb-2">Units</h2>
      <ul className="divide-y divide-[var(--tm-border)]">
        {units.length === 0 ? (
          <li className="py-2 text-[var(--tm-text-secondary)]">No units online.</li>
        ) : units.map((unit) => (
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

// Example triggers for notification types (to be called in real logic):
// sendNotification("Unit XYZ is offline", "warning", ["in-app", "sms"]);
// sendNotification("PANIC BUTTON: UNIT_203 needs immediate assistance!", "danger", ["in-app", "push", "sms"]);
// sendNotification("Device entered restricted zone", "warning", ["in-app", "push"]);
// sendNotification("Unit battery low", "warning", ["in-app", "email"]);
// sendNotification("Route deviation detected", "danger", ["in-app", "push"]);
// sendNotification("Emergency escalation required!", "danger", ["in-app", "push", "sms", "email"]);
