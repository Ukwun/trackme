"use client";
import { useState } from "react";

export default function TwoFactorSetup({ token }: { token: string }) {
  const [step, setStep] = useState<"setup" | "verify" | "done">("setup");
  const [secret, setSecret] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "setup" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Failed to setup 2FA");
    setSecret(data.base32);
    setStep("verify");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "verify", token: otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Invalid code");
    setStep("done");
  }

  if (step === "done") return <div className="tm-card p-4 text-green-600">2FA setup complete!</div>;

  return (
    <div className="tm-card p-4 flex flex-col gap-4">
      {step === "setup" && (
        <>
          <div className="font-semibold">Set up Two-Factor Authentication</div>
          <button onClick={handleSetup} className="bg-blue-700 text-white rounded p-2 font-semibold" disabled={loading}>{loading ? "Please wait..." : "Generate 2FA Secret"}</button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </>
      )}
      {step === "verify" && secret && (
        <form onSubmit={handleVerify} className="flex flex-col gap-2">
          <div className="font-semibold">Enter the 6-digit code from your authenticator app</div>
          <div className="text-xs">Secret: <span className="font-mono">{secret}</span></div>
          <input type="text" required maxLength={6} minLength={6} pattern="[0-9]{6}" value={otp} onChange={e => setOtp(e.target.value)} className="p-2 rounded border w-32" placeholder="123456" />
          <button type="submit" className="bg-green-600 text-white rounded p-2 font-semibold" disabled={loading}>{loading ? "Verifying..." : "Verify 2FA"}</button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </form>
      )}
    </div>
  );
}
