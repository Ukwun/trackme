"use client";
import { useState } from "react";

export default function AuthForm({ onAuth }: { onAuth: (token: string, role: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch('/api/auth', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: mode,
        email,
        password,
      }),
    });
    let data: Record<string, unknown> = {};
    const raw = await res.text();
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: raw };
      }
    }
    setLoading(false);
    if (!res.ok) {
      const message = typeof data.error === "string" ? data.error : "Unknown error";
      return setError(message);
    }
    if (mode === "login") {
      const token = typeof data.token === "string" ? data.token : "";
      const authRole = typeof data.role === "string" ? data.role : "field_agent";
      if (!token) {
        return setError("Login succeeded but token was missing");
      }
      onAuth(token, authRole);
    }
    else setMode("login");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <form onSubmit={handleSubmit} className="tm-card p-6 w-full max-w-xs flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-2 text-center">{mode === "login" ? "Sign In" : "Register"}</h2>
        <input type="email" required placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="p-2 rounded border" />
        <input type="password" required placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="p-2 rounded border" />
        {mode === "register" && <div className="rounded border border-cyan-400/20 bg-cyan-950/20 px-3 py-2 text-xs text-slate-300">New self-serve accounts start as field agents. Elevated roles are assigned by administrators.</div>}
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button type="submit" className="bg-blue-700 text-white rounded p-2 font-semibold" disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Sign In" : "Register"}</button>
        <button type="button" className="text-xs underline mt-2" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Already have an account? Sign in"}</button>
      </form>
    </div>
  );
}
