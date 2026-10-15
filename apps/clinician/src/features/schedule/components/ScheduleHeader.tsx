import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  SegmentedControl,
  WorkspaceTitle,
} from "../../../shared/components/ui";
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
      <WorkspaceTitle eyebrow="Schedule" title={facility?.name || "Schedule"} />

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
              "group flex min-h-7 items-center gap-1 rounded-lg border px-2 text-left text-[11px] font-semibold transition-colors",
              isIntervalExpanded
                ? "border-cf-border-strong bg-cf-surface text-cf-text"
                : "border-cf-border bg-cf-surface text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
            ].join(" ")}
          >
            <span className="tabular-nums">{activeScheduleInterval}</span>
            <ChevronDown
              className={[
                "h-3 w-3 shrink-0 text-cf-text-subtle transition-transform duration-150 group-hover:text-cf-text",
                isIntervalExpanded ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {isIntervalExpanded ? (
            <div className="cf-popover-in absolute right-0 top-[calc(100%+0.25rem)] z-30 grid min-w-[3.5rem] gap-0.5 overflow-hidden rounded-xl border border-cf-border bg-cf-surface p-1 shadow-[var(--shadow-panel-lg)]">
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
                        ? "bg-cf-accent text-cf-page-bg"
                        : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
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
