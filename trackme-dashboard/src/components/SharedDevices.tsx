"use client";
import { useEffect, useState } from "react";
import { EmptyState, LoadingState, OperationalState, UnauthorizedState } from "./ui/OperationalState";
import { getClientSession } from "../lib/clientAuth";

export default function SharedDevices() {
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState(() => getClientSession());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setSession(getClientSession());
    sync();
    window.addEventListener("tm-auth-changed", sync);
    return () => window.removeEventListener("tm-auth-changed", sync);
  }, []);

  const canViewShared = session.role === "super_admin" || session.role === "control_room" || session.role === "dispatcher";

  async function fetchShares() {
    if (!session.token) {
      setShares([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/devices/share", {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch shared devices");
      }
      setShares(data.shares || []);
    } catch (e: any) {
      setShares([]);
      setError(e.message || "Failed to fetch shared devices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canViewShared) {
      setShares([]);
      setLoading(false);
      return;
    }
    fetchShares();
  }, [session.token, canViewShared]);

  if (!session.token) {
    return <UnauthorizedState detail="Sign in to view devices that have been shared with your account." />;
  }

  if (!canViewShared) {
    return <UnauthorizedState detail="Your role does not have shared-device visibility." />;
  }

  if (loading) {
    return <LoadingState title="Loading shared devices..." />;
  }

  if (error) {
    return <OperationalState title="Unable to retrieve shared devices" detail={error} tone="danger" actionLabel="Retry" onAction={fetchShares} />;
  }

  if (shares.length === 0) {
    return <EmptyState title="No shared devices" detail="Shared devices will appear here once another operator grants access." />;
  }

  return (
    <div className="max-w-2xl w-full p-4 bg-white dark:bg-zinc-900 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Devices Shared With You</h2>
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
    </div>
  );
}
