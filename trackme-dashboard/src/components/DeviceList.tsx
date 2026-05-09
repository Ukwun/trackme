
"use client";
import ShareDevice from "./ShareDevice";
import DeviceHistory from "./DeviceHistory";
import { useEffect, useState } from "react";
import { EmptyState, LoadingState, OperationalState, UnauthorizedState } from "./ui/OperationalState";
import { getClientSession } from "../lib/clientAuth";

export default function DeviceList() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState(() => getClientSession());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setSession(getClientSession());
    sync();
    window.addEventListener("tm-auth-changed", sync);
    return () => window.removeEventListener("tm-auth-changed", sync);
  }, []);

  const canViewDevices = session.role === "super_admin" || session.role === "control_room" || session.role === "dispatcher";

  async function fetchDevices() {
    setLoading(true);
    setError(null);

    if (!session.token) {
      setDevices([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/devices/manage", {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load devices");
      }
      setDevices(data.devices || []);
    } catch (e: any) {
      setDevices([]);
      setError(e.message || "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canViewDevices) {
      setLoading(false);
      setDevices([]);
      return;
    }
    fetchDevices();
  }, [session.token, canViewDevices]);

  async function removeDevice(phone: string, imei: string) {
    if (!session.token) return;
    setRemoving(phone + imei);
    await fetch("/api/devices/manage", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ phone, imei }),
    });
    setRemoving(null);
    fetchDevices();
  }

  if (!session.token) {
    return <UnauthorizedState detail="Sign in to manage registered devices." />;
  }

  if (!canViewDevices) {
    return <UnauthorizedState detail="Your role cannot manage device registry operations." />;
  }

  if (loading) {
    return <LoadingState title="Loading registered devices..." />;
  }

  if (error) {
    return <OperationalState title="Device registry is unavailable" detail={error} tone="danger" actionLabel="Retry" onAction={fetchDevices} />;
  }

  if (devices.length === 0) {
    return <EmptyState title="No registered devices" detail="Register a device to begin live tracking and history playback." />;
  }

  return (
    <div className="max-w-2xl w-full p-4 bg-white dark:bg-zinc-900 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Registered Devices</h2>
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
          {devices.map((d, idx) => {
            const isOwner = Boolean(session.userId && d.owner === session.userId);
            return (
              <tr key={d.phone + d.imei + idx}>
                <td className="border px-2 py-1">{d.phone}</td>
                <td className="border px-2 py-1">{d.imei}</td>
                <td className="border px-2 py-1">{d.name}</td>
                <td className="border px-2 py-1">{d.owner}</td>
                <td className="border px-2 py-1">{d.registeredAt}</td>
                <td className="border px-2 py-1">
                  {isOwner ? (
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
            );
          })}
        </tbody>
      </table>

      {devices.map((d, idx) => {
        const isOwner = Boolean(session.userId && d.owner === session.userId);
        return (
          <div key={`${d.phone}-${d.imei}-${idx}-details`}>
            <DeviceHistory deviceId={d.phone || d.deviceId || d.imei} />
            {isOwner ? <ShareDevice device={d} /> : null}
          </div>
        );
      })}
    </div>
  );
}
