"use client";

type StateProps = {
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "neutral" | "warning" | "danger";
};

const toneClasses: Record<NonNullable<StateProps["tone"]>, string> = {
  neutral: "border-slate-600/40 bg-slate-900/60 text-slate-200",
  warning: "border-amber-500/40 bg-amber-950/20 text-amber-100",
  danger: "border-red-500/40 bg-red-950/20 text-red-100",
};

export function LoadingState({ title = "Loading operational data...", detail }: { title?: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-600/40 bg-slate-900/50 p-3 sm:p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">Sync</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{title}</div>
      {detail ? <div className="mt-1 text-xs opacity-90">{detail}</div> : null}
      <div className="mt-3 h-2 w-full overflow-hidden rounded bg-slate-800">
        <div className="h-full w-1/3 animate-pulse rounded bg-blue-500/70" />
      </div>
    </div>
  );
}

export function OperationalState({ title, detail, actionLabel, onAction, tone = "neutral" }: StateProps) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${toneClasses[tone]}`}>
      <div className="text-sm font-semibold">{title}</div>
      {detail ? <div className="mt-1 text-xs opacity-90">{detail}</div> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          className="mt-3 rounded-md border border-current/40 px-3 py-1.5 text-xs font-semibold hover:bg-white/10"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function UnauthorizedState({ detail }: { detail?: string }) {
  return (
    <OperationalState
      title="Access is restricted for this role"
      detail={detail || "Use an authorized command role or sign in with elevated privileges to continue."}
      tone="warning"
    />
  );
}

export function EmptyState({ title, detail, actionLabel, onAction }: StateProps) {
  return <OperationalState title={title} detail={detail} actionLabel={actionLabel} onAction={onAction} tone="neutral" />;
}

export function ErrorState({ detail, actionLabel, onAction }: { detail?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <OperationalState
      title="Error loading data"
      detail={detail || "An unexpected error occurred. Please try again."}
      actionLabel={actionLabel}
      onAction={onAction}
      tone="danger"
    />
  );
}
