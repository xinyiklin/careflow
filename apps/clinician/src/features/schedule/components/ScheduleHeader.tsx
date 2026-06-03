import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { SegmentedControl } from "../../../shared/components/ui";
import { SLOT_INTERVAL_OPTIONS } from "../utils/scheduleConstants";

import type { ScheduleHeaderProps, ScheduleMode } from "../types";

const SCHEDULE_MODE_OPTIONS = [
  { value: "resources" as const, label: "Resource" },
  { value: "days" as const, label: "Multi-day" },
] satisfies readonly { value: ScheduleMode; label: string }[];

export default function ScheduleHeader({
  facility,
  scheduleMode,
  activeScheduleInterval,
  onScheduleModeChange,
  onScheduleIntervalChange,
}: ScheduleHeaderProps) {
  const [isIntervalExpanded, setIsIntervalExpanded] = useState(false);
  const intervalControlRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isIntervalExpanded) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        intervalControlRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsIntervalExpanded(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
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
    <div className="mb-2">
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] leading-none text-cf-text-subtle">
          Schedule
        </div>
        <div className="mt-1 truncate text-base font-extrabold leading-none tracking-tight text-cf-text">
          {facility?.name || "Schedule"}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <SegmentedControl
          options={SCHEDULE_MODE_OPTIONS}
          value={scheduleMode}
          onChange={onScheduleModeChange}
          size="xs"
          className="flex-1 min-w-0"
        />

        <div
          ref={intervalControlRef}
          className="relative shrink-0"
          aria-label="Slot interval"
        >
          <button
            type="button"
            onClick={() => setIsIntervalExpanded((current) => !current)}
            aria-expanded={isIntervalExpanded}
            className={[
              "group flex min-h-7 items-center gap-1 rounded-xl border px-2 text-left text-[10px] font-semibold transition",
              isIntervalExpanded
                ? "bg-[var(--color-cf-sidebar-active-bg)] text-[var(--color-cf-sidebar-text)] border-[var(--color-cf-sidebar-active-border)]"
                : "border-[var(--color-cf-sidebar-border)] bg-[var(--color-cf-sidebar-surface)] text-[var(--color-cf-sidebar-text-muted)] hover:bg-[var(--color-cf-sidebar-surface-strong)] hover:text-[var(--color-cf-sidebar-text)]",
            ].join(" ")}
          >
            <span className="tabular-nums">{activeScheduleInterval}</span>
            <ChevronDown
              className={[
                "h-3 w-3 shrink-0 text-[var(--color-cf-sidebar-text-muted)] transition-transform duration-200 group-hover:text-[var(--color-cf-sidebar-text)]",
                isIntervalExpanded ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {isIntervalExpanded ? (
            <div className="absolute right-0 top-[calc(100%+0.25rem)] z-30 grid min-w-[3.5rem] gap-1 overflow-hidden rounded-xl border border-[var(--color-cf-sidebar-border)] bg-[var(--color-cf-sidebar-bg)] p-1 shadow-lg">
              {SLOT_INTERVAL_OPTIONS.map((option) => {
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
                      "flex h-7 items-center justify-center rounded-lg px-2 text-center text-xs font-semibold transition",
                      isActive
                        ? "bg-[var(--color-cf-sidebar-active-bg)] text-[var(--color-cf-sidebar-text)]"
                        : "text-[var(--color-cf-sidebar-text-muted)] hover:bg-[var(--color-cf-sidebar-surface)] hover:text-[var(--color-cf-sidebar-text)]",
                    ].join(" ")}
                  >
                    <span className="tabular-nums">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
