"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function ShareDevice({ device }: { device: any }) {
  const [targetUserId, setTargetUserId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const { user } = useUser();

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const res = await fetch("/api/devices/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: device.phone, imei: device.imei, targetUserId }),
    });
    const data = await res.json();
    if (data.success) {
      setStatus("Device shared successfully!");
      setTargetUserId("");
    } else {
      setStatus(data.error || "Share failed");
    }
  }

  if (!user || device.owner !== user.id) return null;

  return (
    <form onSubmit={handleShare} className="flex gap-2 mt-2">
      <input
        type="text"
        placeholder="Target User ID"
        value={targetUserId}
        onChange={e => setTargetUserId(e.target.value)}
        className="p-1 border rounded text-xs"
        required
      />
      <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Share</button>
      {status && <span className="text-xs ml-2">{status}</span>}
    </form>
  );
}
