import { useEffect, useRef, useState } from "react";

import { SLOT_INTERVAL_OPTIONS } from "../utils/scheduleConstants";

export default function ScheduleHeader({
  facility,
  scheduleMode,
  activeScheduleInterval,
  onScheduleModeChange,
  onScheduleIntervalChange,
}) {
  const [isIntervalExpanded, setIsIntervalExpanded] = useState(false);
  const intervalControlRef = useRef(null);

  useEffect(() => {
    if (!isIntervalExpanded) return undefined;

    const handlePointerDown = (event) => {
      if (intervalControlRef.current?.contains(event.target)) return;
      setIsIntervalExpanded(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsIntervalExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isIntervalExpanded]);

  return (
    <div className="grid gap-3 border-b border-cf-border bg-cf-surface-muted/55 px-0 py-3 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-0">
      <div className="min-w-0 px-4 sm:px-5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
            Schedule
          </div>
          <div className="truncate text-lg font-semibold tracking-tight text-cf-text">
            {facility?.name || "Schedule"}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 px-4 sm:px-5 lg:px-0">
        <div className="inline-flex max-w-full items-center gap-1 rounded-full border border-cf-border bg-cf-surface-soft p-0.5 text-xs font-semibold shadow-[var(--shadow-panel)]">
          {[
            ["resources", "Resource"],
            ["days", "Multi-day"],
          ].map(([mode, label]) => {
            const isActive = scheduleMode === mode;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onScheduleModeChange(mode)}
                aria-pressed={isActive}
                className={[
                  "rounded-full px-3 py-1.5 transition",
                  isActive
                    ? "bg-cf-surface text-cf-text shadow-[var(--shadow-panel)]"
                    : "text-cf-text-muted hover:text-cf-text",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div
          ref={intervalControlRef}
          className={[
            "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-cf-border bg-cf-surface-soft p-0.5 text-xs font-semibold shadow-[var(--shadow-panel)] transition-all duration-200",
            isIntervalExpanded ? "w-auto" : "w-[4.25rem]",
          ].join(" ")}
          aria-label="Slot interval"
        >
          {isIntervalExpanded ? (
            SLOT_INTERVAL_OPTIONS.map((option) => {
              const isActive = activeScheduleInterval === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onScheduleIntervalChange(option);
                    setIsIntervalExpanded(false);
                  }}
                  aria-pressed={isActive}
                  className={[
                    "rounded-full px-2.5 py-1.5 transition",
                    isActive
                      ? "bg-cf-surface text-cf-text shadow-[var(--shadow-panel)]"
                      : "text-cf-text-muted hover:text-cf-text",
                  ].join(" ")}
                >
                  {option}m
                </button>
              );
            })
          ) : (
            <button
              type="button"
              onClick={() => setIsIntervalExpanded(true)}
              aria-expanded={isIntervalExpanded}
              className="w-full rounded-full bg-cf-surface px-2.5 py-1.5 text-cf-text shadow-[var(--shadow-panel)] transition hover:bg-cf-surface-muted"
            >
              {activeScheduleInterval}m
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
