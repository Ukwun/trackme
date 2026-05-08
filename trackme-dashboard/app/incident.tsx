"use client";
import { useEffect, useState } from "react";

export default function IncidentScreen() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => {
    fetch("/api/incidents").then(res => res.json()).then(data => setIncidents(data.incidents || []));
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-zinc-900 via-blue-900 to-zinc-800">
      {/* Incident Feed */}
      <aside className="w-full md:w-1/3 p-6 bg-zinc-950/80 border-r border-zinc-800 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-blue-400">Incident Feed</h2>
        <ul>
          {incidents.map((inc: any) => (
            <li key={inc.id} className={`mb-4 p-4 rounded-lg shadow bg-zinc-900/60 border border-zinc-800 cursor-pointer ${selected?.id === inc.id ? 'ring-2 ring-blue-400' : ''}`} onClick={() => setSelected(inc)}>
              <div className="font-semibold text-blue-300">{inc.type}</div>
              <div className="text-xs text-zinc-400">{inc.status}</div>
              <div className="text-xs text-zinc-400">{inc.createdAt}</div>
            </li>
          ))}
        </ul>
      </aside>
      {/* Incident Details */}
      <main className="flex-1 p-8 flex flex-col gap-6">
        {selected ? (
          <div className="tm-card p-6 mb-4 bg-white/10 backdrop-blur rounded-xl border border-blue-400/30">
            <h2 className="text-2xl font-bold mb-2 text-blue-300">{selected.type}</h2>
            <div className="mb-2 text-zinc-300">Status: <span className="font-semibold">{selected.status}</span></div>
            <div className="mb-2 text-zinc-300">Location: {selected.location}</div>
            <div className="mb-2 text-zinc-300">Created: {selected.createdAt}</div>
            <div className="mb-2 text-zinc-300">Assigned Units: {selected.assignedUnits?.join(", ")}</div>
            {/* Status Timeline */}
            <div className="mt-4">
              <div className="font-semibold mb-1 text-blue-200">Status Timeline</div>
              <ul className="text-xs text-zinc-200">
                {selected.timeline?.map((t: any, idx: number) => (
                  <li key={idx}>{t.time} - {t.status}</li>
                ))}
              </ul>
            </div>
            {/* Communication Logs */}
            <div className="mt-4">
              <div className="font-semibold mb-1 text-blue-200">Communication Logs</div>
              <div className="text-xs text-zinc-200">(Chat and updates coming soon...)</div>
            </div>
          </div>
        ) : (
          <div className="text-zinc-400">Select an incident to view details.</div>
        )}
      </main>
      {/* Live Responders */}
      <aside className="w-full md:w-1/4 p-6 bg-zinc-950/80 border-l border-zinc-800 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-blue-400">Live Responders</h2>
        {selected && selected.assignedUnits?.length > 0 ? (
          <ul>
            {selected.assignedUnits.map((unit: string, idx: number) => (
              <li key={idx} className="mb-2 p-2 rounded bg-blue-900/40 text-blue-100 font-semibold">{unit}</li>
            ))}
          </ul>
        ) : <div className="text-zinc-400">No responders assigned.</div>}
      </aside>
    </div>
  );
}
