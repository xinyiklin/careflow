import { X } from "lucide-react";

import { formatDateOnlyInTimeZone } from "../../../shared/utils/dateTime";
import { SLOT_INTERVAL_OPTIONS } from "../utils/scheduleConstants";
import { getTimeZoneAbbreviation } from "../utils/scheduleDateUtils";

import type { ResourceDefinition } from "../../../shared/types/domain";

const SCHEDULE_COLUMN_HEADER_HEIGHT = "h-12";

export function DayCardHeader({
  date,
  timeZone,
  resourceKey,
  resourceOptions,
  intervalMinutes,
  canRemoveDay,
  onRemove,
  onChangeResource,
  onChangeInterval,
  isOperatingDay = true,
  showIntervalSelector = true,
  showResourceSelector = true,
}: {
  date: string;
  timeZone: string;
  resourceKey: string;
  resourceOptions: ResourceDefinition[];
  intervalMinutes: number;
  canRemoveDay: boolean;
  onRemove: () => void;
  onChangeResource: (resourceKey: string) => void;
  onChangeInterval: (intervalMinutes: number) => void;
  isOperatingDay?: boolean;
  showIntervalSelector?: boolean;
  showResourceSelector?: boolean;
}) {
  const showHeaderControls = showResourceSelector || showIntervalSelector;
  const timeZoneAbbreviation = getTimeZoneAbbreviation(date, timeZone);

  return (
    <div
      className={[
        "grid grid-cols-[56px_minmax(0,1fr)] border-b border-cf-border bg-cf-surface",
        showHeaderControls ? "" : SCHEDULE_COLUMN_HEADER_HEIGHT,
      ].join(" ")}
    >
      <div className="flex h-full select-none items-center justify-end bg-cf-surface px-2 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        {timeZoneAbbreviation}
      </div>
      <div
        className={[
          "min-w-0 bg-cf-surface px-3",
          showHeaderControls ? "py-2" : "flex h-full items-center",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-sm font-semibold text-cf-text">
              {formatDateOnlyInTimeZone(date, timeZone, "EEE, MMM d")}
            </span>
            {showIntervalSelector || !isOperatingDay ? (
              <span className="rounded-full bg-cf-surface-soft px-2 py-0.5 text-[10px] font-semibold text-cf-text-subtle">
                {isOperatingDay ? `${intervalMinutes}m` : "Closed"}
              </span>
            ) : null}
          </div>
          {canRemoveDay ? (
            <button
              type="button"
              onClick={onRemove}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text"
              aria-label={`Remove ${date}`}
              title="Remove day"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {showHeaderControls ? (
          <div className="mt-2">
            <div
              className={[
                "grid gap-2",
                showResourceSelector && showIntervalSelector
                  ? "md:grid-cols-[minmax(0,1fr)_6.5rem]"
                  : "grid-cols-1",
              ].join(" ")}
            >
              {showResourceSelector ? (
                <select
                  value={resourceKey}
                  onChange={(event) => onChangeResource(event.target.value)}
                  disabled={!resourceOptions.length}
                  className="h-8 w-full rounded-xl border border-cf-border bg-cf-surface px-3 text-sm font-semibold text-cf-text shadow-[var(--shadow-panel)] outline-none transition disabled:cursor-not-allowed disabled:text-cf-text-subtle focus:border-cf-border-strong"
                  aria-label={`Resource filter for ${date}`}
                >
                  {resourceOptions.length ? (
                    resourceOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <option value="">No resources</option>
                  )}
                </select>
              ) : null}

              {showIntervalSelector ? (
                <select
                  value={intervalMinutes}
                  onChange={(event) =>
                    onChangeInterval(Number(event.target.value))
                  }
                  className="h-8 w-full rounded-xl border border-cf-border bg-cf-surface px-3 text-sm font-semibold text-cf-text shadow-[var(--shadow-panel)] outline-none transition focus:border-cf-border-strong"
                  aria-label={`Interval for ${date}`}
                >
                  {SLOT_INTERVAL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} min
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ResourceColumnHeader({
  resource,
  isOperatingDay = true,
}: {
  resource?: ResourceDefinition;
  isOperatingDay?: boolean;
}) {
  const label = resource?.label || "Unassigned resource";

  return (
    <div
      className={[
        SCHEDULE_COLUMN_HEADER_HEIGHT,
        "min-w-0 bg-cf-surface px-3",
      ].join(" ")}
    >
      <div className="flex h-full min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-semibold text-cf-text">
          {label}
        </div>
        <span
          className={[
            "h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-cf-surface-soft",
            isOperatingDay ? "bg-cf-accent" : "bg-cf-text-subtle",
          ].join(" ")}
        />
      </div>
    </div>
  );
}

export function ClosedScheduleMessage() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center bg-cf-surface/45 px-4 text-center">
      <div className="rounded-2xl border border-dashed border-cf-border bg-cf-surface-muted px-4 py-5 text-sm text-cf-text-muted">
        This facility is closed on this day.
      </div>
    </div>
  );
}
