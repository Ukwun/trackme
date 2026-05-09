export default function AuthHeader() {
  return (
    <header className="flex w-full items-center justify-between gap-4 border-b border-[var(--tm-border)] bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-md">
      <div>
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--tm-text-secondary)]">TrackMe</div>
        <div className="text-sm font-semibold text-[var(--tm-text-main)]">Real-time operations workspace</div>
      </div>
      <div className="text-xs text-[var(--tm-text-secondary)]">JWT session-based access</div>
    </header>
  );
}
