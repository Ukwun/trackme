"use client";
import { useEffect, useState } from "react";
import DeviceHistory from "./DeviceHistory";

export default function RightIntelligencePanel({ selectedUnit, onClose }: { selectedUnit: any, onClose: () => void }) {
  const [officer, setOfficer] = useState<any>(null);
  const [incident, setIncident] = useState<any>(null);

  useEffect(() => {
    if (selectedUnit?.assignedIncident) {
      fetch(`/api/incidents/${selectedUnit.assignedIncident}`)
        .then(res => res.json())
        .then(data => setIncident(data.incident || null));
    } else {
      setIncident(null);
    }
    // Officer info could be fetched here if not in selectedUnit
    setOfficer(selectedUnit?.officer || null);
  }, [selectedUnit]);

  if (!selectedUnit) return null;

  return (
    <div className="tm-card p-4 mb-4 animate-fade-in flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="tm-heading text-xl font-bold">Unit Intelligence</h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-red-500 text-lg font-bold">×</button>
      </div>
      <div className="mb-2">
        <div className="font-semibold text-[--tm-accent-blue] text-lg">{officer?.name || selectedUnit.deviceId}</div>
        <div className="text-xs text-[--tm-text-secondary]">Unit ID: {selectedUnit.deviceId}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div><span className="font-semibold">Speed:</span> {selectedUnit.speed ?? "-"} km/h</div>
        <div><span className="font-semibold">Battery:</span> {selectedUnit.battery ?? "-"}%</div>
        <div><span className="font-semibold">Signal:</span> {selectedUnit.signal ?? "-"} dBm</div>
        <div><span className="font-semibold">Status:</span> {selectedUnit.status ?? "-"}</div>
      </div>
      <div className="mb-2">
        <span className="font-semibold">Assigned Incident:</span> {incident ? `${incident.type} (${incident.status})` : "None"}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Live Coordinates:</span> {selectedUnit.lat}, {selectedUnit.lng}
      </div>
      <div className="mb-2">
        <span className="font-semibold">Route Timeline:</span>
        <DeviceHistory deviceId={selectedUnit.deviceId} />
      </div>
    </div>
  );
}
