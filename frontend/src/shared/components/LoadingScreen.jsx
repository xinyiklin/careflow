import { CareFlowIcon } from "./icons";

export default function LoadingScreen({
  title = "Preparing workspace",
  message = "Syncing schedule, patients, and facility context.",
}) {
  return (
    <div className="cf-loading-screen flex h-[100dvh] w-full items-center justify-center bg-cf-page-bg px-6 text-cf-text">
      <div className="cf-loading-card relative w-full max-w-lg overflow-hidden rounded-[var(--radius-cf-shell)] border border-cf-border-strong bg-cf-surface px-8 py-8 shadow-[var(--shadow-panel-lg)]">
        <div className="cf-loading-orbit" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center gap-4">
            <div className="cf-loading-mark flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface-soft text-cf-text">
              <CareFlowIcon className="h-7 w-7" strokeWidth={4.5} />
            </div>

            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cf-text-subtle">
                CareFlow
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cf-text">
                {title}
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-sm text-sm leading-6 text-cf-text-muted">
            {message}
          </p>

          <div className="mt-7 space-y-3" aria-hidden="true">
            <div className="cf-loading-skeleton h-3 w-11/12 rounded-full bg-cf-surface-soft" />
            <div className="cf-loading-skeleton h-3 w-8/12 rounded-full bg-cf-surface-soft [animation-delay:120ms]" />
            <div className="cf-loading-skeleton h-3 w-10/12 rounded-full bg-cf-surface-soft [animation-delay:240ms]" />
          </div>

          <div
            className="mt-7 h-1.5 overflow-hidden rounded-full bg-cf-surface-soft"
            aria-hidden="true"
          >
            <div className="cf-loading-progress h-full w-1/2 rounded-full bg-cf-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
