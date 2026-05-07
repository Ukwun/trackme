"use client";

import { useEffect, useState } from "react";
import { connectSocket } from "../realtime/socket";

export default function GeofencePanel() {
  const [geofences, setGeofences] = useState<any[]>([]);
  useEffect(() => {
    const socket = connectSocket();
    socket.on("geofence-update", setGeofences);
    return () => { socket.off("geofence-update", setGeofences); };
  }, []);
  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-lg font-semibold mb-2">Geofences</h2>
      <ul className="divide-y divide-[var(--tm-border)]">
        {geofences.length === 0 ? (
          <li className="py-2 text-[var(--tm-text-secondary)]">No geofences.</li>
        ) : geofences.map((geo) => (
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
