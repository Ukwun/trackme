import ShareDevice from "./ShareDevice";
"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function DeviceList() {
  const { user } = useUser();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  async function fetchDevices() {
    setLoading(true);
    const res = await fetch("/api/devices/manage");
    const data = await res.json();
    setDevices(data.devices || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDevices();
  }, []);

  async function removeDevice(phone: string, imei: string) {
    setRemoving(phone + imei);
    await fetch("/api/devices/manage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, imei }),
    });
    setRemoving(null);
    fetchDevices();
  }

  return (
    <div className="max-w-2xl w-full p-4 bg-white dark:bg-zinc-900 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Registered Devices</h2>
      {loading ? (
        <div>Loading...</div>
      ) : devices.length === 0 ? (
        <div>No devices registered.</div>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Phone</th>
              <th className="border px-2 py-1">IMEI</th>
              <th className="border px-2 py-1">Name</th>
              <th className="border px-2 py-1">Owner</th>
              <th className="border px-2 py-1">Registered At</th>
              <th className="border px-2 py-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d, idx) => (
              <tr key={d.phone + d.imei + idx}>
                <td className="border px-2 py-1">{d.phone}</td>
                <td className="border px-2 py-1">{d.imei}</td>
                <td className="border px-2 py-1">{d.name}</td>
                <td className="border px-2 py-1">{d.owner}</td>
                <td className="border px-2 py-1">{d.registeredAt}</td>
                <td className="border px-2 py-1">
                  {user && d.owner === user.id ? (
                    <button
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
                      onClick={() => removeDevice(d.phone, d.imei)}
                      disabled={removing === d.phone + d.imei}
                    >
                      {removing === d.phone + d.imei ? "Removing..." : "Remove"}
                    </button>
                  ) : (
                    <span className="text-gray-400">Not owner</span>
                  )}
                </td>
              </tr>
              {user && d.owner === user.id && (
                <tr>
                  <td colSpan={6} className="border-t px-2 py-1 bg-zinc-50 dark:bg-zinc-800">
                    <ShareDevice device={d} />
                  </td>
                </tr>
              )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
