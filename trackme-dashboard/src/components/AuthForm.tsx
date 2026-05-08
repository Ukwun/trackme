"use client";
import { useState } from "react";

export default function AuthForm({ onAuth }: { onAuth: (token: string, role: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("field_agent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: mode,
        email,
        password,
        role: mode === "register" ? role : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Unknown error");
    if (mode === "login") onAuth(data.token, data.role);
    else setMode("login");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <form onSubmit={handleSubmit} className="tm-card p-6 w-full max-w-xs flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-2 text-center">{mode === "login" ? "Sign In" : "Register"}</h2>
        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="p-2 rounded border" />
        <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="p-2 rounded border" />
        {mode === "register" && (
          <select value={role} onChange={e => setRole(e.target.value)} className="p-2 rounded border">
            <option value="super_admin">Super Admin</option>
            <option value="control_room">Control Room Operator</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="patrol_officer">Patrol Officer</option>
            <option value="analyst">Analyst</option>
            <option value="field_agent">Field Agent</option>
          </select>
        )}
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button type="submit" className="bg-blue-700 text-white rounded p-2 font-semibold" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign In" : "Register"}</button>
        <button type="button" className="text-xs underline mt-2" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Already have an account? Sign in"}</button>
      </form>
    </div>
  );
}
