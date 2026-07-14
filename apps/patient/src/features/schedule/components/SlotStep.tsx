import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { CalendarX } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMinimumLoading from "../../../shared/hooks/useMinimumLoading";
import { EmptyState, Field, Select, cn } from "../../../shared/ui";
import { getErrorMessage } from "../../../shared/utils/errors";
import { useScheduleSlots, type PortalSchedulingSlot } from "../api/schedule";

type SlotStepProps = {
  providerId: number;
  typeId: number;
  timeZone: string;
  selected: PortalSchedulingSlot | null;
  onSelect: (slot: PortalSchedulingSlot | null) => void;
};

type DateGroup = {
  isoDate: string;
  label: string;
  slots: PortalSchedulingSlot[];
};

function groupSlotsByDate(
  slots: PortalSchedulingSlot[],
  timeZone: string,
  locale?: string
): DateGroup[] {
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: timeZone || undefined,
  };
  const keyOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timeZone || undefined,
  };
  let dateFormatter: Intl.DateTimeFormat;
  let keyFormatter: Intl.DateTimeFormat;
  try {
    dateFormatter = new Intl.DateTimeFormat(locale || undefined, dateOptions);
    keyFormatter = new Intl.DateTimeFormat("en", keyOptions);
  } catch {
    delete dateOptions.timeZone;
    delete keyOptions.timeZone;
    dateFormatter = new Intl.DateTimeFormat(locale || undefined, dateOptions);
    keyFormatter = new Intl.DateTimeFormat("en", keyOptions);
  }

  const groups = new Map<string, DateGroup>();
  for (const slot of slots) {
    const dt = new Date(slot.start_time);
    if (Number.isNaN(dt.getTime())) continue;
    let key: string;
    let label: string;
    try {
      const keyParts = Object.fromEntries(
        keyFormatter
          .formatToParts(dt)
          .filter((part) => part.type !== "literal")
          .map((part) => [part.type, part.value])
      );
      key = `${keyParts.year}-${keyParts.month}-${keyParts.day}`;
      label = dateFormatter.format(dt);
    } catch {
      key = dt.toISOString().slice(0, 10);
      label = dt.toLocaleDateString(locale || undefined);
    }
    const existing = groups.get(key);
    if (existing) {
      existing.slots.push(slot);
    } else {
      groups.set(key, { isoDate: key, label, slots: [slot] });
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.isoDate.localeCompare(b.isoDate)
  );
}

function formatTime(iso: string, timeZone: string, locale?: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timeZone || undefined,
    }).format(dt);
  } catch {
    return new Intl.DateTimeFormat(locale || undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(dt);
  }
}

export function SlotStep({
  providerId,
  typeId,
  timeZone,
  selected,
  onSelect,
}: SlotStepProps) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, error } = useScheduleSlots(
    providerId,
    typeId
  );
  const showLoading = useMinimumLoading(isLoading);

  const locale = i18n.resolvedLanguage || i18n.language || undefined;
  const groups = useMemo(
    () => groupSlotsByDate(data ?? [], timeZone, locale),
    [data, locale, timeZone]
  );
  const slots = data ?? [];

  const [activeDate, setActiveDate] = useState<string | null>(null);
  const selectedDate = groups.find((group) =>
    group.slots.some((slot) => slot.id === selected?.id)
  )?.isoDate;
  const effectiveActive = groups.some((group) => group.isoDate === activeDate)
    ? activeDate
    : (selectedDate ?? groups[0]?.isoDate ?? null);
  const activeGroup =
    groups.find((g) => g.isoDate === effectiveActive) ?? groups[0] ?? null;

  if (isError) {
    return (
      <p role="alert" className="text-sm text-danger">
        {getErrorMessage(error)}
      </p>
    );
  }

  if (showLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            aria-hidden="true"
            className="h-10 rounded-md border border-border bg-surface-soft"
          />
        ))}
      </div>
    );
  }

  if (isLoading) {
    return null;
  }

  if (slots.length === 0 || !activeGroup) {
    return <EmptyState icon={CalendarX} title={t("schedule.noSlots")} />;
  }

  return (
    <div className="space-y-4">
      {groups.length > 1 ? (
        <Field label={t("schedule.dateLabel")}>
          <Select
            value={effectiveActive ?? ""}
            onChange={(event) => {
              setActiveDate(event.target.value);
              onSelect(null);
            }}
          >
            {groups.map((group) => (
              <option key={group.isoDate} value={group.isoDate}>
                {group.label} ({group.slots.length})
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-xs text-text-muted">{activeGroup.label}</p>
      )}

      <div role="radiogroup" aria-label={t("schedule.timeLabel")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {activeGroup.slots.map((slot, index) => {
            const isSelected = selected?.id === slot.id;
            const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
              let nextIndex: number | null = null;
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                nextIndex = (index + 1) % activeGroup.slots.length;
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                nextIndex =
                  (index - 1 + activeGroup.slots.length) %
                  activeGroup.slots.length;
              } else if (event.key === "Home") {
                nextIndex = 0;
              } else if (event.key === "End") {
                nextIndex = activeGroup.slots.length - 1;
              }
              if (nextIndex === null) return;

              event.preventDefault();
              onSelect(activeGroup.slots[nextIndex]);
              const options =
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="radio"]'
                );
              options?.[nextIndex]?.focus();
            };
            return (
              <button
                key={slot.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (!selected && index === 0) ? 0 : -1}
                onClick={() => onSelect(slot)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "h-11 rounded-md border px-3 text-sm font-medium tracking-tight transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                  isSelected
                    ? "border-accent bg-accent text-accent-contrast"
                    : "border-border bg-surface text-text hover:border-border-strong hover:bg-surface-soft"
                )}
              >
                {formatTime(slot.start_time, timeZone, locale)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
