"use client";
import { useState } from "react";

const INCIDENT_TYPES = [
  "Robbery",
  "Accident",
  "Disturbance",
  "Medical Emergency",
  "Suspicious Activity"
];

export default function CreateIncident({ onCreated }: { onCreated?: (incident: any) => void }) {
  const [type, setType] = useState(INCIDENT_TYPES[0]);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("tm_auth_token") : null;
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type, location })
      });
      const data = await res.json();
      if (onCreated) onCreated(data.incident);
    } catch (err) {
      setError("Failed to create incident");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="tm-card p-4 mb-4" onSubmit={handleSubmit}>
      <h2 className="tm-heading text-lg font-semibold mb-2">Report Incident</h2>
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Type</label>
        <select value={type} onChange={e => setType(e.target.value)} className="tm-input">
          {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="mb-2">
        <label className="block mb-1 font-semibold">Location</label>
        <input value={location} onChange={e => setLocation(e.target.value)} className="tm-input" required />
      </div>
      <button type="submit" className="tm-btn tm-btn-primary" disabled={loading}>
        {loading ? "Reporting..." : "Report Incident"}
      </button>
      {error && <div className="text-red-500 mt-2 text-xs">{error}</div>}
    </form>
  );
}
