// Simulated mobile client for sending location updates
import { useState } from "react";
import { sendLocationUpdate } from "../realtime/socket";

  const [deviceId, setDeviceId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [speed, setSpeed] = useState("");
  const [heading, setHeading] = useState("");
  const [battery, setBattery] = useState("");
  const [timestamp, setTimestamp] = useState(() => Math.floor(Date.now() / 1000).toString());
  const [status, setStatus] = useState<string | null>(null);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceId || !lat || !lng) {
      setStatus("Device ID, lat, and lng required");
      return;
    }
    sendLocationUpdate({
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
    </form>
  );
}
