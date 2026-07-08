"use client";

import { FormEvent, useState } from "react";

type AuthResult = { token: string; role: string; name?: string; email?: string };

export default function AuthForm({ onAuth }: { onAuth: (result: AuthResult) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, name, phone, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed");
      if (mode === "register") {
        setNotice("Account created securely. Sign in to open your field-agent workspace.");
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        return;
      }
      if (!data.token) throw new Error("The server did not return a session token");
      onAuth(data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/85 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid grid-cols-2 rounded-xl border border-slate-700 bg-slate-950/80 p-1" role="tablist" aria-label="Authentication mode">
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === "login" ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => switchMode("register")} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === "register" ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>Create account</button>
      </div>

      <form onSubmit={submit} className="space-y-3.5">
        {mode === "register" && <>
          <div><label htmlFor="auth-name" className="mb-1.5 block text-xs font-semibold text-slate-300">Full name</label><input id="auth-name" required minLength={2} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" className={inputClass} /></div>
          <div><label htmlFor="auth-phone" className="mb-1.5 block text-xs font-semibold text-slate-300">Nigerian phone number</label><input id="auth-phone" required inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0801 234 5678 or +234…" className={inputClass} /></div>
        </>}
        <div><label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold text-slate-300">Email address</label><input id="auth-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className={inputClass} /></div>
        <div>
          <label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold text-slate-300">Password</label>
          <div className="relative"><input id="auth-password" type={showPassword ? "text" : "password"} required minLength={10} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 10 characters" className={`${inputClass} pr-16`} /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-2 px-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200">{showPassword ? "Hide" : "Show"}</button></div>
        </div>
        {mode === "register" && <div><label htmlFor="auth-confirm" className="mb-1.5 block text-xs font-semibold text-slate-300">Confirm password</label><input id="auth-confirm" type={showPassword ? "text" : "password"} required minLength={10} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" className={inputClass} /></div>}
        {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{notice}</div>}
        <button disabled={loading} className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{loading ? "Securing your account…" : mode === "login" ? "Sign in securely" : "Create field-agent account"}</button>
      </form>

      <p className="text-center text-xs leading-5 text-slate-400">Passwords are hashed with bcrypt. New registrations receive field-agent access; elevated roles require administrator approval.</p>
    </div>
  );
}
