import { X } from "lucide-react";

import { formatDateOnlyInTimeZone } from "../../../shared/utils/dateTime";
import { SLOT_INTERVAL_OPTIONS } from "../utils/scheduleConstants";

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
}) {
  const showHeaderControls = showResourceSelector || showIntervalSelector;

  return (
    <div className="border-b border-cf-border bg-gradient-to-b from-cf-surface-muted to-cf-surface px-3 py-2">
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
  );
}

export function ResourceColumnHeader({
  resource,
  appointmentCount,
  intervalMinutes,
  isOperatingDay = true,
}) {
  const label = resource?.label || "Unassigned resource";
  const countLabel =
    appointmentCount === 1
      ? "1 appointment"
      : `${appointmentCount} appointments`;

  return (
    <div className="min-w-0 bg-cf-surface px-3 py-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-cf-text">
            {label}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-cf-text-subtle">
            <span>{countLabel}</span>
            <span className="h-1 w-1 rounded-full bg-cf-border-strong" />
            <span>
              {isOperatingDay ? `${intervalMinutes}m slots` : "Closed day"}
            </span>
          </div>
        </div>
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cf-accent ring-4 ring-cf-surface-soft" />
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
