"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function SharedDevices() {
  const { user } = useUser();
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShares() {
      setLoading(true);
      const res = await fetch("/api/devices/share");
      const data = await res.json();
      setShares(data.shares || []);
      setLoading(false);
    }
    fetchShares();
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-2xl w-full p-4 bg-white dark:bg-zinc-900 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Devices Shared With You</h2>
      {loading ? (
        <div>Loading...</div>
      ) : shares.length === 0 ? (
        <div>No devices shared with you.</div>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Phone</th>
              <th className="border px-2 py-1">IMEI</th>
              <th className="border px-2 py-1">Owner</th>
              <th className="border px-2 py-1">Shared At</th>
            </tr>
          </thead>
          <tbody>
            {shares.map((s, idx) => (
              <tr key={s.phone + s.imei + idx}>
                <td className="border px-2 py-1">{s.phone}</td>
                <td className="border px-2 py-1">{s.imei}</td>
                <td className="border px-2 py-1">{s.owner}</td>
                <td className="border px-2 py-1">{s.sharedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
