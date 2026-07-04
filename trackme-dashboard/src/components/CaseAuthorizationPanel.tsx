"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type CaseRecord = {
  _id: string;
  caseNumber: string;
  warrantNumber: string;
  subjectType: "phone" | "imei";
  subjectIdentifier: string;
  purpose: string;
  status: string;
  expiresAt: string;
};

export default function CaseAuthorizationPanel({ token }: { token: string }) {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadCases = useCallback(async () => {
    const response = await fetch("/api/cases", { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (response.ok) setCases(data.cases || []);
    else setMessage(data.error || "Unable to load cases");
  }, [token]);

  useEffect(() => { void loadCases(); }, [loadCases]);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(response.ok ? "Authorization request submitted for independent approval." : data.error || "Request failed");
    if (response.ok) {
      event.currentTarget.reset();
      await loadCases();
    }
  }

  async function decide(caseId: string, decision: "approved" | "rejected" | "revoked") {
    setBusy(true);
    const response = await fetch("/api/cases", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ caseId, decision }),
    });
    const data = await response.json();
    setBusy(false);
    setMessage(response.ok ? `Case ${decision}.` : data.error || "Decision failed");
    if (response.ok) await loadCases();
  }

  return (
    <section className="tm-card rounded-2xl border border-cyan-400/20 bg-slate-950/40 p-4 sm:p-5" aria-labelledby="case-auth-title">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Two-person control</p>
          <h2 id="case-auth-title" className="mt-1 text-xl font-bold text-white">Case authorization</h2>
          <p className="mt-1 text-sm text-slate-400">Every subject identifier must be tied to an active warrant and independently approved.</p>
        </div>
        <span className="w-fit rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">Provider access disabled until configured</span>
      </div>

      <form onSubmit={createCase} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input name="caseNumber" required placeholder="Case number" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm" />
        <input name="warrantNumber" required placeholder="Court order / warrant number" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm" />
        <select name="subjectType" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm"><option value="phone">Phone number</option><option value="imei">IMEI</option></select>
        <input name="subjectIdentifier" required placeholder="Authorized subject identifier" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm" />
        <input name="expiresAt" required type="datetime-local" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm" />
        <input name="purpose" required minLength={12} placeholder="Specific lawful purpose" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm" />
        <button disabled={busy} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50 md:col-span-2 xl:col-span-3">{busy ? "Processing…" : "Submit authorization request"}</button>
      </form>

      {message && <div role="status" className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">{message}</div>}

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {cases.map((item) => (
          <article key={item._id} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{item.caseNumber}</h3><p className="text-xs text-slate-400">Order {item.warrantNumber}</p></div><span className="rounded-full bg-white/5 px-2.5 py-1 text-xs capitalize text-cyan-200">{item.status.replaceAll("_", " ")}</span></div>
            <p className="mt-3 text-sm text-slate-300">{item.subjectType.toUpperCase()}: <span className="font-mono">{item.subjectIdentifier}</span></p>
            <p className="mt-1 text-xs text-slate-500">Expires {new Date(item.expiresAt).toLocaleString()}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.status === "pending_approval" && <><button onClick={() => decide(item._id, "approved")} disabled={busy} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-100">Approve</button><button onClick={() => decide(item._id, "rejected")} disabled={busy} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-100">Reject</button></>}
              {item.status === "approved" && <button onClick={() => decide(item._id, "revoked")} disabled={busy} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-100">Revoke access</button>}
            </div>
          </article>
        ))}
        {cases.length === 0 && <p className="text-sm text-slate-400">No authorization requests yet.</p>}
      </div>
    </section>
  );
}
