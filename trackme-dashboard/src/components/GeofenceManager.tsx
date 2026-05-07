"use client";
import { useState, useEffect } from "react";

async function sendNotification(message: string, type: string = "info") {
  await fetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, type }),
  });
}
import { MapContainer, TileLayer, Circle, Marker } from "react-leaflet";

export default function GeofenceManager() {
  const [geofences, setGeofences] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [center, setCenter] = useState<[number, number]>([6.5244, 3.3792]);
  const [radius, setRadius] = useState(1000);
  useEffect(() => {
    async function fetchGeofences() {
      const res = await fetch("/api/geofences");
      const data = await res.json();
      setGeofences(data.geofences || []);
    }
    fetchGeofences();
  }, []);
  async function handleAdd(e: any) {
    e.preventDefault();
    await fetch("/api/geofences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, center, radius }),
    });
    await sendNotification(`Geofence '${name}' created at [${center.join(", ")}] (radius: ${radius}m)`, "info");
    setName("");
    setRadius(1000);
    // Refresh
    const res = await fetch("/api/geofences");
    const data = await res.json();
    setGeofences(data.geofences || []);
  }
  return (
    <div className="tm-card p-4 mb-4">
      <h2 className="tm-heading text-xl font-semibold mb-2">Geofencing</h2>
      <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
        <input type="text" placeholder="Geofence Name" value={name} onChange={e => setName(e.target.value)} className="p-2 rounded bg-[var(--tm-bg-secondary)] border border-[var(--tm-border)] text-[var(--tm-text-main)]" required />
        <input type="number" placeholder="Radius (meters)" value={radius} onChange={e => setRadius(Number(e.target.value))} className="p-2 rounded bg-[var(--tm-bg-secondary)] border border-[var(--tm-border)] text-[var(--tm-text-main)]" required />
        <button type="submit" className="tm-btn-primary">Add Geofence</button>
      </form>
      <div className="w-full h-64 rounded-2xl overflow-hidden border border-[var(--tm-border)] shadow-lg mb-2">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%", background: '#0F172A' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={center} />
          {geofences.map((g, idx) => (
            <Circle key={idx} center={g.center} radius={g.radius} pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.2 }} />
          ))}
        </MapContainer>
      </div>
      <ul className="text-xs text-[var(--tm-text-secondary)]">
        {geofences.map((g, idx) => (
          <li key={idx}>{g.name} - Center: [{g.center.join(', ')}], Radius: {g.radius}m</li>
        ))}
      </ul>
    </div>
  );
}
