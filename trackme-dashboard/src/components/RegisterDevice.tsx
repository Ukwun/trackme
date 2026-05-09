"use client";
import { useEffect, useState } from "react";
import { UnauthorizedState } from "./ui/OperationalState";
import { getClientSession } from "../lib/clientAuth";

const ALLOWED_ROLES = ["super_admin", "control_room", "dispatcher"];

export default function RegisterDevice() {
  const [phone, setPhone] = useState("");
  const [imei, setImei] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [session, setSession] = useState(() => getClientSession());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setSession(getClientSession());
    sync();
    window.addEventListener("tm-auth-changed", sync);
    return () => window.removeEventListener("tm-auth-changed", sync);
  }, []);

  const role = String(session.role || "");

  if (!ALLOWED_ROLES.includes(role)) {
    return <UnauthorizedState detail="Device registration is limited to command-and-control roles." />;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!session.token) {
      setStatus("Authentication required");
      return;
    }
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ phone, imei, name }),
    });
    const data = await res.json();
    if (data.success) {
      setStatus("Device registered successfully!");
      setPhone("");
      setImei("");
      setName("");
    } else {
      setStatus(data.error || "Registration failed");
    }
  }

  return (
    <form onSubmit={handleRegister} className="max-w-md w-full p-4 bg-white dark:bg-zinc-900 rounded shadow mb-8">
      <h2 className="text-xl font-semibold mb-4">Register Device</h2>
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
        type="text"
        placeholder="Device Name (optional)"
        value={name}
        onChange={e => setName(e.target.value)}
        className="mb-2 p-2 border rounded w-full"
      />
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Register</button>
      {status && <div className="mt-2 text-center text-sm">{status}</div>}
    </form>
  );
}
