// Simulated mobile client for sending location updates
import { useState } from "react";
import { sendLocationUpdate } from "../realtime/socket";

export default function MobileClientSimulator() {
  const [phone, setPhone] = useState("");
  const [imei, setImei] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !imei || !lat || !lng) {
      setStatus("All fields required");
      return;
    }
    sendLocationUpdate({ phone, imei, lat: parseFloat(lat), lng: parseFloat(lng) });
    setStatus("Location update sent!");
  }

  return (
    <form onSubmit={handleSend} className="max-w-md w-full p-4 bg-white dark:bg-zinc-900 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Simulate Mobile Location Update</h2>
      <input
        type="text"
        placeholder="Phone Number"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
        required
      />
      <input
        type="text"
        placeholder="IMEI"
        value={imei}
        onChange={e => setImei(e.target.value)}
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
      <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Send Location</button>
      {status && <div className="mt-2 text-center text-sm">{status}</div>}
    </form>
  );
}
