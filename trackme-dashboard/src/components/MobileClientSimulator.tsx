// Simulated mobile client for sending location updates
import { useState, useRef } from "react";
import { sendLocationUpdateWithGeofence } from "../realtime/socket";

function MobileClientSimulator() {
  const [deviceId, setDeviceId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [speed, setSpeed] = useState("");
  const [heading, setHeading] = useState("");
  const [battery, setBattery] = useState("");
  const [timestamp, setTimestamp] = useState(() => Math.floor(Date.now() / 1000).toString());
  const [status, setStatus] = useState<string | null>(null);
  const [panicStatus, setPanicStatus] = useState<string | null>(null);
  const [task, setTask] = useState<string>("");
  const [incidentType, setIncidentType] = useState("");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [voice, setVoice] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !lat || !lng) {
      setStatus("Device ID, lat, and lng required");
      return;
    }
    sendLocationUpdateWithGeofence({
      deviceId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: speed ? parseFloat(speed) : undefined,
      heading: heading ? parseFloat(heading) : undefined,
      battery: battery ? parseInt(battery) : undefined,
      timestamp: timestamp ? parseInt(timestamp) : Math.floor(Date.now() / 1000),
    });
    setStatus("Location update sent!");
  }

  async function handlePanic() {
    setPanicStatus("Sending panic alert...");
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `PANIC BUTTON: ${deviceId} needs immediate assistance!`, type: "danger" })
    });
    setPanicStatus("Panic alert sent!");
  }

  async function handleIncidentReport(e: React.FormEvent) {
    e.preventDefault();
    // Simulate incident report
    await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: incidentType, description: incidentDesc, location: `${lat},${lng}` })
    });
    setIncidentType(""); setIncidentDesc("");
    if (image) setImage(null);
    if (voice) setVoice(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (voiceInputRef.current) voiceInputRef.current.value = "";
    setStatus("Incident reported!");
  }

  async function handleImageUpload(e: any) {
    setImage(e.target.files[0]);
    // In a real app, upload to /api/upload
  }
  async function handleVoiceUpload(e: any) {
    setVoice(e.target.files[0]);
    // In a real app, upload to /api/upload
  }

  return (
    <form onSubmit={handleSend} className="max-w-md w-full p-4 bg-white dark:bg-zinc-900 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Simulate Mobile Location Update</h2>
      <input
        type="text"
        placeholder="Device ID (e.g. UNIT_203)"
        value={deviceId}
        onChange={e => setDeviceId(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
        required
      />
      <input
        type="number"
        placeholder="Latitude"
        value={lat}
        onChange={e => setLat(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
        required
      />
      <input
        type="number"
        placeholder="Longitude"
        value={lng}
        onChange={e => setLng(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
        required
      />
      <input
        type="number"
        placeholder="Speed (km/h)"
        value={speed}
        onChange={e => setSpeed(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
      />
      <input
        type="number"
        placeholder="Heading (deg)"
        value={heading}
        onChange={e => setHeading(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
      />
      <input
        type="number"
        placeholder="Battery (%)"
        value={battery}
        onChange={e => setBattery(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
      />
      <input
        type="number"
        placeholder="Timestamp (unix, sec)"
        value={timestamp}
        onChange={e => setTimestamp(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
      />
      <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Send Location</button>
      {status && <div className="mt-2 text-center text-sm">{status}</div>}
      <button type="button" className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 mb-2" onClick={handlePanic}>Panic Button</button>
      {panicStatus && <div className="text-center text-xs text-red-600 mb-2">{panicStatus}</div>}
      <div className="mb-4 p-2 border rounded bg-zinc-50 dark:bg-zinc-800">
        <div className="font-semibold mb-1">Assigned Task</div>
        <div className="text-xs">{task || "No task assigned."}</div>
      </div>
      <form onSubmit={handleIncidentReport} className="mb-4">
        <div className="font-semibold mb-1">Report Incident</div>
        <select value={incidentType} onChange={e => setIncidentType(e.target.value)} className="mb-2 p-2 border rounded w-full">
          <option value="">Select Type</option>
          <option value="Robbery">Robbery</option>
          <option value="Accident">Accident</option>
          <option value="Disturbance">Disturbance</option>
          <option value="Medical Emergency">Medical Emergency</option>
          <option value="Suspicious Activity">Suspicious Activity</option>
        </select>
        <textarea value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} placeholder="Description" className="mb-2 p-2 border rounded w-full" />
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="mb-2 w-full" />
        <input type="file" accept="audio/*" ref={voiceInputRef} onChange={handleVoiceUpload} className="mb-2 w-full" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Submit Incident</button>
      </form>
      <div className="mb-2 text-xs text-zinc-500">Navigation: <span className="font-semibold">(Directions to assigned location coming soon)</span></div>
    </form>
  );
}

export default MobileClientSimulator;
