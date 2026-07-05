"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import { useMemo, useState } from "react";

function createDemoSession(role: "dispatcher" | "field_agent") {
  const roleLabel = role === "dispatcher" ? "dispatcher" : "field_agent";
  const displayName = role === "dispatcher" ? "Demo Dispatcher" : "Demo Field Agent";
  const token = `demo.${roleLabel}.${Date.now()}`;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("tm_auth_token", token);
    window.localStorage.setItem("tm_auth_role", roleLabel);
    window.localStorage.setItem("tm_auth_name", displayName);
    window.localStorage.setItem("tm_auth_email", `${roleLabel}@trackme.local`);
    window.dispatchEvent(new Event("tm-auth-changed"));
  }
}

export default function AuthForm({ syncError = "" }: { syncError?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { isLoaded, isSignedIn } = useAuth();
  const isDevMode = useMemo(() => process.env.NODE_ENV !== "production", []);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center" aria-live="polite">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
        <div>
          <h2 className="text-lg font-bold text-white">Preparing your workspace</h2>
          <p className="mt-1 text-sm text-slate-400">Identifying your role and loading your authorized tools.</p>
        </div>
        <span className="text-xs uppercase tracking-[0.22em] text-cyan-300">Secure session sync</span>
        {syncError && <div role="alert" className="max-w-sm rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{syncError}<button type="button" onClick={() => window.location.reload()} className="mt-3 block w-full rounded-lg border border-red-300/20 px-3 py-2 font-semibold hover:bg-red-400/10">Retry connection</button></div>}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-5 py-1">
      <div className="grid w-full max-w-md grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1.5" role="tablist" aria-label="Authentication mode">
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${mode === "login" ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"}`}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${mode === "register" ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"}`}>Create account</button>
      </div>

      <div className="flex w-full justify-center overflow-hidden rounded-2xl" key={mode}>
        {mode === "login" ? (
          <SignIn routing="hash" signUpUrl="#" fallbackRedirectUrl="/" />
        ) : (
          <SignUp routing="hash" signInUrl="#" fallbackRedirectUrl="/" />
        )}
      </div>

      {isDevMode && (
        <div className="w-full rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-3 text-sm text-slate-300">
          <p className="font-semibold text-cyan-200">Local preview access</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => createDemoSession("dispatcher")} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/20">Continue as dispatcher</button>
            <button type="button" onClick={() => createDemoSession("field_agent")} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/20">Continue as field agent</button>
          </div>
        </div>
      )}

      <p className="max-w-sm text-center text-xs leading-5 text-slate-400">
        Email and Google sign-in are secured by Clerk. New accounts begin with field-agent access; administrators assign elevated operational roles.
      </p>
    </div>
  );
}
