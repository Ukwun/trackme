// Simulated mobile client for sending location updates
import { useState, useRef, useEffect } from "react";
import { sendLocationUpdateWithGeofence } from "../realtime/socket";

function MobileClientSimulator() {
  const [deviceId, setDeviceId] = useState("");
  const [lat, setLat] = useState("6.5244");  // Default: Lagos, Nigeria
  const [lng, setLng] = useState("3.3792");
  const [speed, setSpeed] = useState("0");
  const [heading, setHeading] = useState("0");
  const [battery, setBattery] = useState("100");
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

  // Listen for tracking events from Quick Track panel
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleTrackingStarted = (event: any) => {
      const { deviceId: newDeviceId } = event.detail;
      setDeviceId(newDeviceId);
      setStatus(`📍 Ready to move ${newDeviceId}`);
    };

    const handleTrackingStopped = () => {
      setDeviceId("");
      setStatus(null);
    };

    window.addEventListener("tm-device-tracking-started", handleTrackingStarted);
    window.addEventListener("tm-device-tracking-stopped", handleTrackingStopped);

    // Check localStorage on mount in case there's an active device
    const activeDeviceId = localStorage.getItem("tm_active_device_id");
    if (activeDeviceId) {
      setDeviceId(activeDeviceId);
      setStatus(`📍 Ready to move ${activeDeviceId}`);
    }

    return () => {
      window.removeEventListener("tm-device-tracking-started", handleTrackingStarted);
      window.removeEventListener("tm-device-tracking-stopped", handleTrackingStopped);
    };
  }, []);

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
    <form onSubmit={handleSend} className="max-w-md w-full p-4 bg-gradient-to-br from-blue-500/10 to-cyan-600/5 dark:bg-zinc-800 rounded-lg shadow-lg border border-blue-500/30 dark:border-blue-500/20 mb-8">
      <h2 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-white">📍 Live Location Controller</h2>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">Start tracking above, then use this to move the device in real-time</p>
      <input
        type="text"
        placeholder="Device ID (e.g. UNIT_203)"
        value={deviceId}
        onChange={e => setDeviceId(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600 font-semibold"
        readOnly={!!localStorage.getItem("tm_active_device_id")}
        required
      />
      <input
        type="number"
        placeholder="Latitude"
        value={lat}
        onChange={e => setLat(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
        required
      />
      <input
        type="number"
        placeholder="Longitude"
        value={lng}
        onChange={e => setLng(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
        required
      />
      <input
        type="number"
        placeholder="Speed (km/h)"
        value={speed}
        onChange={e => setSpeed(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
      />
      <input
        type="number"
        placeholder="Heading (deg)"
        value={heading}
        onChange={e => setHeading(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
      />
      <input
        type="number"
        placeholder="Battery (%)"
        value={battery}
        onChange={e => setBattery(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
      />
      <input
        type="number"
        placeholder="Timestamp (unix, sec)"
        value={timestamp}
        onChange={e => setTimestamp(e.target.value)}
        className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600"
      />
      <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700">📡 Send Location Update</button>
      {status && <div className="mt-2 text-center text-sm text-zinc-900 dark:text-green-400">{status}</div>}
      <button type="button" className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 mb-2" onClick={handlePanic}>Panic Button</button>
      {panicStatus && <div className="text-center text-xs text-red-600 mb-2">{panicStatus}</div>}
      <div className="mb-4 p-2 border rounded bg-zinc-50 dark:bg-zinc-800">
        <div className="font-semibold mb-1 text-zinc-900 dark:text-white">Assigned Task</div>
        <div className="text-xs text-zinc-700 dark:text-zinc-300">{task || "No task assigned."}</div>
      </div>
      <form onSubmit={handleIncidentReport} className="mb-4">
        <div className="font-semibold mb-1 text-zinc-900 dark:text-white">Report Incident</div>
        <select value={incidentType} onChange={e => setIncidentType(e.target.value)} className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-600">
          <option value="">Select Type</option>
          <option value="Robbery">Robbery</option>
          <option value="Accident">Accident</option>
          <option value="Disturbance">Disturbance</option>
          <option value="Medical Emergency">Medical Emergency</option>
          <option value="Suspicious Activity">Suspicious Activity</option>
        </select>
        <textarea value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} placeholder="Description" className="mb-2 p-2 border rounded w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 border-zinc-300 dark:border-zinc-600" />
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="mb-2 w-full" />
        <input type="file" accept="audio/*" ref={voiceInputRef} onChange={handleVoiceUpload} className="mb-2 w-full" />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Submit Incident</button>
      </form>
      <div className="mb-2 text-xs text-zinc-500">Navigation: <span className="font-semibold">(Directions to assigned location coming soon)</span></div>
    </form>
  );
}

export default MobileClientSimulator;
