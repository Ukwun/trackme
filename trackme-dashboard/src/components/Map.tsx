"use client";

import dynamic from "next/dynamic";
import type { MapProps } from "./MapClient";

const ClientOnlyMap = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="relative h-full min-h-[400px] w-full overflow-hidden rounded-xl border border-[var(--tm-border)] bg-slate-950/60">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-md border border-slate-500/40 bg-slate-900/75 px-3 py-2 text-xs font-medium text-slate-100">
          Loading live map...
        </div>
      </div>
    </div>
  ),
});

export default function Map(props: MapProps) {
  return <ClientOnlyMap {...props} />;
}
