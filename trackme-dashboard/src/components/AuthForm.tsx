"use client";

import { SignIn, SignUp, useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function AuthForm({ onAuth }: { onAuth: (token: string, role: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const controller = new AbortController();

    async function syncIdentity() {
      setSyncing(true);
      setError("");
      try {
        const response = await fetch("/api/auth/clerk", {
          method: "POST",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to create your TrackMe session");
        onAuth(data.token, data.role);
      } catch (syncError) {
        if (syncError instanceof DOMException && syncError.name === "AbortError") return;
        setError(syncError instanceof Error ? syncError.message : "Unable to create your TrackMe session");
      } finally {
        setSyncing(false);
      }
    }

    void syncIdentity();
    return () => controller.abort();
  }, [isLoaded, isSignedIn, onAuth, user]);

  if (isSignedIn) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center" aria-live="polite">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
        <div>
          <h2 className="text-lg font-bold text-white">Preparing your workspace</h2>
          <p className="mt-1 text-sm text-slate-400">Identifying your role and loading your authorized tools.</p>
        </div>
        {syncing && <span className="text-xs uppercase tracking-[0.22em] text-cyan-300">Secure session sync</span>}
        {error && <div role="alert" className="max-w-sm rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-3">
      <div className="grid w-full max-w-md grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1.5" role="tablist" aria-label="Authentication mode">
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${mode === "login" ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"}`}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${mode === "register" ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"}`}>Create account</button>
      </div>

      <div className="w-full overflow-hidden rounded-2xl" key={mode}>
        {mode === "login" ? (
          <SignIn routing="hash" signUpUrl="#" fallbackRedirectUrl="/" />
        ) : (
          <SignUp routing="hash" signInUrl="#" fallbackRedirectUrl="/" />
        )}
      </div>

      <p className="max-w-sm text-center text-xs leading-5 text-slate-400">
        Email and Google sign-in are secured by Clerk. New accounts begin with field-agent access; administrators assign elevated operational roles.
      </p>
    </div>
  );
}
