import { useCallback, useMemo } from "react";
import { Plus, X } from "lucide-react";

import {
  formatDateOnlyInTimeZone,
  parseDateOnlyInTimeZone,
} from "../../../shared/utils/dateTime";
import { MAX_SCHEDULE_COLUMNS } from "../utils/scheduleConstants";
import { isFacilityOperatingDate } from "../utils/scheduleOperatingHours";

function addDaysToDateStringInTimeZone(dateString, offset, timeZone) {
  const date = parseDateOnlyInTimeZone(dateString, timeZone);
  if (!date) return dateString;
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDateOnlyInTimeZone(date, timeZone, "yyyy-MM-dd");
}

function hourKey(time24) {
  const [hour] = (time24 || "00:00").split(":").map(Number);
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${displayHour}:00 ${suffix}`;
}

function getDefaultResourceKey(resourceOptions) {
  if (!resourceOptions.length) return "";
  return resourceOptions[0].key;
}

function doesAppointmentMatchResource(appointment, resource) {
  if (!resource) return false;
  return (
    String(appointment.resource || "") === String(resource.resourceId || "")
  );
}

function AgendaColumnHeader({
  date,
  timeZone,
  resourceKey,
  resourceOptions,
  appointmentCount = 0,
  resourceColumnMode = false,
  canRemoveDay,
  onRemove,
  onChangeResource,
  showResourceSelector = true,
}) {
  if (resourceColumnMode) {
    const resourceLabel =
      resourceOptions.find((resource) => resource.key === resourceKey)?.label ||
      "Unassigned resource";
    const countLabel =
      appointmentCount === 1
        ? "1 appointment"
        : `${appointmentCount} appointments`;

    return (
      <div className="border-b border-cf-border bg-cf-surface px-3 py-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-cf-text">
              {resourceLabel}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-cf-text-subtle">
              <span>{countLabel}</span>
              <span className="h-1 w-1 rounded-full bg-cf-border-strong" />
              <span>{formatDateOnlyInTimeZone(date, timeZone, "MMM d")}</span>
            </div>
          </div>
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cf-accent ring-4 ring-cf-surface-soft" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-cf-border bg-gradient-to-b from-cf-surface-muted to-cf-surface px-3 py-2">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 truncate text-sm font-semibold text-cf-text">
          {formatDateOnlyInTimeZone(date, timeZone, "EEE, MMM d")}
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

      {showResourceSelector ? (
        <div className="mt-2">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
            Resource
          </label>
          <select
            value={resourceKey}
            onChange={(event) => onChangeResource(event.target.value)}
            disabled={!resourceOptions.length}
            className="mt-1 h-9 w-full rounded-xl border border-cf-border bg-cf-surface px-3 text-sm font-medium text-cf-text shadow-[var(--shadow-panel)] outline-none transition disabled:cursor-not-allowed disabled:text-cf-text-subtle focus:border-cf-border-strong"
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
        </div>
      ) : null}
    </div>
  );
}

export default function ScheduleAgendaView({
  appointments,
  selectedDate,
  timeZone,
  facility = null,
  onDateChange,
  visibleDates = [],
  columnResourceKeys = [],
  resourceOptions = [],
  onVisibleDatesChange,
  onColumnResourceKeysChange,
  onVisibleDayCountChange,
  allowAddColumn = true,
  resourceColumnMode = false,
  scrollColumnsAt = null,
  showResourceSelector = true,
  showToolbar = true,
  embedded = false,
}) {
  const resourceOptionsByKey = useMemo(
    () => new Map(resourceOptions.map((resource) => [resource.key, resource])),
    [resourceOptions]
  );

  const visibleDayEntries = useMemo(
    () =>
      visibleDates.map((date, index) => ({
        date,
        index,
        key: `${date}:${index}`,
        isOperatingDay: isFacilityOperatingDate(date, timeZone, facility),
        resourceKey:
          columnResourceKeys[index] || getDefaultResourceKey(resourceOptions),
      })),
    [columnResourceKeys, facility, resourceOptions, timeZone, visibleDates]
  );

  const canRemoveDay = !resourceColumnMode && visibleDayEntries.length > 1;
  const canAddDay =
    allowAddColumn && visibleDayEntries.length < MAX_SCHEDULE_COLUMNS;
  const shouldScrollColumns =
    embedded &&
    scrollColumnsAt != null &&
    visibleDayEntries.length >= scrollColumnsAt;
  const embeddedColumnTrack = shouldScrollColumns
    ? `repeat(${Math.max(visibleDayEntries.length, 1)}, minmax(18rem, 18rem))`
    : `repeat(${Math.max(visibleDayEntries.length, 1)}, minmax(0, 1fr))`;
  const embeddedColumnTemplate = embedded
    ? `${embeddedColumnTrack}${canAddDay ? " 3rem" : ""}`
    : undefined;

  const formattedRange = useMemo(() => {
    if (!selectedDate) return "";
    if (visibleDates.length <= 1) {
      return formatDateOnlyInTimeZone(selectedDate, timeZone, "MMM d, yyyy");
    }

    const sortedDates = [...visibleDates].sort((left, right) =>
      left.localeCompare(right)
    );
    return `${formatDateOnlyInTimeZone(
      sortedDates[0],
      timeZone,
      "MMM d"
    )} - ${formatDateOnlyInTimeZone(sortedDates[sortedDates.length - 1], timeZone, "MMM d, yyyy")}`;
  }, [selectedDate, timeZone, visibleDates]);

  const appointmentsByColumn = useMemo(() => {
    const map = new Map();

    visibleDayEntries.forEach((entry) => {
      const resource = resourceOptionsByKey.get(entry.resourceKey);
      const dayAppointments = appointments
        .filter(
          (appointment) =>
            appointment.date === entry.date &&
            doesAppointmentMatchResource(appointment, resource)
        )
        .sort((left, right) =>
          (left.time || "").localeCompare(right.time || "")
        );

      const grouped = new Map();
      dayAppointments.forEach((appointment) => {
        const key = hourKey(appointment.time);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(appointment);
      });

      map.set(entry.key, grouped);
    });

    return map;
  }, [appointments, resourceOptionsByKey, visibleDayEntries]);

  const handleRemoveDay = useCallback(
    (removeIndex) => {
      if (!canRemoveDay) return;

      const nextDates = visibleDayEntries
        .filter((_, index) => index !== removeIndex)
        .map((entry) => entry.date);
      const nextResourceKeys = visibleDayEntries
        .filter((_, index) => index !== removeIndex)
        .map((entry) => entry.resourceKey);

      if (removeIndex === 0 && nextDates[0]) {
        onDateChange?.(nextDates[0]);
      }

      onVisibleDatesChange?.(nextDates);
      onColumnResourceKeysChange?.(nextResourceKeys);
      onVisibleDayCountChange?.(nextDates.length);
    },
    [
      canRemoveDay,
      onColumnResourceKeysChange,
      onDateChange,
      onVisibleDatesChange,
      onVisibleDayCountChange,
      visibleDayEntries,
    ]
  );

  const handleAddDay = useCallback(() => {
    if (!canAddDay) return;

    const anchorDate =
      visibleDayEntries[visibleDayEntries.length - 1]?.date || selectedDate;
    const nextDate = addDaysToDateStringInTimeZone(anchorDate, 1, timeZone);
    const nextDates = [
      ...visibleDayEntries.map((entry) => entry.date),
      nextDate,
    ];
    const nextResourceKeys = [
      ...visibleDayEntries.map((entry) => entry.resourceKey),
      visibleDayEntries[visibleDayEntries.length - 1]?.resourceKey ||
        visibleDayEntries[0]?.resourceKey ||
        getDefaultResourceKey(resourceOptions),
    ];

    onVisibleDatesChange?.(nextDates);
    onColumnResourceKeysChange?.(nextResourceKeys);
    onVisibleDayCountChange?.(nextDates.length);
  }, [
    canAddDay,
    onColumnResourceKeysChange,
    onVisibleDatesChange,
    onVisibleDayCountChange,
    resourceOptions,
    selectedDate,
    timeZone,
    visibleDayEntries,
  ]);

  const handleChangeResourceKey = useCallback(
    (targetIndex, nextResourceKey) => {
      const nextResourceKeys = visibleDayEntries.map((entry, index) =>
        index === targetIndex ? nextResourceKey : entry.resourceKey
      );
      onColumnResourceKeysChange?.(nextResourceKeys);
    },
    [onColumnResourceKeysChange, visibleDayEntries]
  );

  return (
    <div
      className={[
        "flex h-full min-h-0 flex-col overflow-hidden",
        embedded
          ? "rounded-none border-0 bg-transparent shadow-none"
          : "rounded-[1.25rem] border border-cf-border bg-cf-surface shadow-sm",
      ].join(" ")}
    >
      {showToolbar ? (
        <div className="border-b border-cf-border bg-cf-surface-muted/70 px-3 py-2">
          <div className="flex items-center justify-between gap-3 select-none">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                Agenda View
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-cf-text">
                {formattedRange}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className={[
            embedded
              ? [
                  "grid h-full gap-0 p-0",
                  shouldScrollColumns ? "min-w-max" : "min-w-0",
                ].join(" ")
              : "flex h-full min-w-max gap-3 p-3",
          ].join(" ")}
          style={
            embedded
              ? { gridTemplateColumns: embeddedColumnTemplate }
              : undefined
          }
        >
          {visibleDayEntries.map((entry, index) => {
            const groupedAppointments =
              appointmentsByColumn.get(entry.key) || new Map();
            const hourGroups = Array.from(groupedAppointments.entries());
            const appointmentCount = hourGroups.reduce(
              (total, [, items]) => total + items.length,
              0
            );

            return (
              <div
                key={entry.key}
                className={[
                  "flex min-h-0 flex-col overflow-hidden",
                  embedded
                    ? "min-w-0 border-r border-cf-border bg-transparent shadow-none last:border-r-0"
                    : "w-[min(32rem,calc(100vw-9rem))] min-w-[23rem] flex-1 rounded-[1.35rem] cf-ui-panel",
                ].join(" ")}
              >
                <AgendaColumnHeader
                  date={entry.date}
                  timeZone={timeZone}
                  resourceKey={entry.resourceKey}
                  resourceOptions={resourceOptions}
                  appointmentCount={appointmentCount}
                  resourceColumnMode={resourceColumnMode}
                  canRemoveDay={canRemoveDay}
                  onRemove={() => handleRemoveDay(index)}
                  onChangeResource={(nextResourceKey) =>
                    handleChangeResourceKey(index, nextResourceKey)
                  }
                  showResourceSelector={showResourceSelector}
                />

                <div className="min-h-0 flex-1 overflow-auto p-3">
                  {hourGroups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-cf-border bg-cf-surface-muted px-4 py-6 text-center text-sm text-cf-text-muted">
                      {entry.isOperatingDay
                        ? "No appointments scheduled."
                        : "This facility is closed on this day."}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {hourGroups.map(([hourLabel, items]) => (
                        <div key={`${entry.key}:${hourLabel}`}>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
                            {hourLabel}
                          </div>
                          <div className="space-y-2">
                            {items.map((appointment) => (
                              <button
                                key={appointment.id}
                                type="button"
                                onDoubleClick={() => appointment.onEdit?.()}
                                className="w-full rounded-2xl border border-white/70 px-3 py-3 text-left shadow-sm transition hover:shadow-md"
                                style={{
                                  backgroundColor:
                                    appointment.status_color || "#ffffff",
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <div
                                    className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border border-white/70"
                                    style={{
                                      backgroundColor:
                                        appointment.appointment_type_color ||
                                        "#cbd5e1",
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-cf-text">
                                      {appointment.patient_name}
                                    </div>
                                    <div className="mt-0.5 truncate text-xs text-cf-text-muted">
                                      {appointment.time}
                                      {appointment.room
                                        ? ` • ${appointment.room}`
                                        : ""}
                                    </div>
                                    <div className="mt-1 truncate text-xs text-cf-text-muted">
                                      {appointment.appointment_type_name ||
                                        "General"}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {canAddDay ? (
            <button
              type="button"
              onClick={handleAddDay}
              aria-label="Add day column"
              className={[
                "flex h-full min-h-0 w-12 shrink-0 items-center justify-center border border-dashed border-cf-border px-1.5 text-cf-text-muted transition hover:border-cf-border-strong hover:text-cf-text",
                embedded
                  ? "bg-cf-surface/65 hover:bg-cf-surface-muted/75"
                  : "bg-cf-surface-soft/70 hover:bg-cf-surface",
              ].join(" ")}
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
