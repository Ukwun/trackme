"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";
import { useState } from "react";

const compactAppearance = {
  elements: {
    rootBox: "w-full max-w-none",
    cardBox: "w-full max-w-none shadow-none",
    card: "w-full max-w-none border-0 bg-transparent p-0 shadow-none",
    header: "hidden",
    footer: "hidden",
    socialButtonsBlockButton: "min-h-11 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
    dividerLine: "bg-white/10",
    dividerText: "text-slate-500",
    formFieldLabel: "text-slate-300",
    formFieldInput: "min-h-11 border-white/10 bg-slate-950/70 text-white",
    formButtonPrimary: "min-h-11 bg-cyan-400 font-bold text-slate-950 hover:bg-cyan-300",
    identityPreview: "border-white/10 bg-slate-950/70",
  },
};

export default function AuthForm({ syncError = "" }: { syncError?: string }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
        <div>
          <h2 className="text-lg font-bold text-white">Preparing your workspace</h2>
          <p className="mt-1 text-sm text-slate-400">Confirming your identity and authorized role.</p>
        </div>
        {syncError && (
          <div role="alert" className="max-w-sm rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {syncError}
            <button type="button" onClick={() => window.location.reload()} className="mt-3 block w-full rounded-lg border border-red-300/20 px-3 py-2 font-semibold hover:bg-red-400/10">Retry connection</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-4">
      <div className="grid w-full grid-cols-2 rounded-xl border border-white/10 bg-slate-950/60 p-1" role="tablist" aria-label="Authentication mode">
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20" : "text-slate-400 hover:text-white"}`}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20" : "text-slate-400 hover:text-white"}`}>Create account</button>
      </div>

      <div className="flex w-full min-w-0 justify-center overflow-hidden" key={mode}>
        {mode === "login" ? (
          <SignIn routing="hash" signUpUrl="#" fallbackRedirectUrl="/" appearance={compactAppearance} />
        ) : (
          <SignUp routing="hash" signInUrl="#" fallbackRedirectUrl="/" appearance={compactAppearance} />
        )}
      </div>

      <p className="max-w-sm text-center text-xs leading-5 text-slate-400">
        Real email verification and Google authentication are handled securely by Clerk. New accounts receive field-agent access.
      </p>
    </div>
  );
}
