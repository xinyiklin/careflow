import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { formatDateOnlyInTimeZone } from "../../../shared/utils/dateTime";
import { useUserPreferences } from "../../../app/context/UserPreferencesProvider";
import useScheduleHeatmap from "../hooks/useScheduleHeatmap";
import { MAX_SCHEDULE_COLUMNS } from "../utils/scheduleConstants";
import ScheduleHeader from "./ScheduleHeader";

import type { ScheduleHeatmapMode } from "../../../shared/types/domain";
import type { ScheduleSidebarProps } from "../types";

type CalendarDayCell = {
  day: number;
  date: string;
} | null;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function buildCalendarDayCells(selectedDate: string): CalendarDayCell[] {
  const [yearText, monthText] = (selectedDate || "").split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) return [];

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        day,
        date: `${yearText}-${monthText}-${String(day).padStart(2, "0")}`,
      };
    }),
  ];
  const paddedLength = Math.ceil(cells.length / 7) * 7;

  while (cells.length < paddedLength) {
    cells.push(null);
  }

  return cells;
}

function getMonthStartDate(dateString: string) {
  const [yearText, monthText] = (dateString || "").split("-");
  if (!yearText || !monthText) return "";
  return `${yearText}-${monthText}-01`;
}

function shiftMonth(dateString: string, offset: number) {
  const [yearText, monthText] = (dateString || "").split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) return dateString;

  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  const nextYear = date.getUTCFullYear();
  const nextMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}-01`;
}

function setMonthPart(dateString: string, monthIndex: number) {
  const [yearText] = (dateString || "").split("-");
  if (!yearText || monthIndex < 0) return dateString;
  return `${yearText}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

function shiftYear(dateString: string, offset: number) {
  const [yearText, monthText] = (dateString || "").split("-");
  const year = Number(yearText);
  if (!year || !monthText) return dateString;
  return `${year + offset}-${monthText}-01`;
}

function getHeatmapLevel(
  count: number,
  maxCount: number,
  mode: ScheduleHeatmapMode,
  dailyTarget: number
) {
  if (!count) return 0;

  const denominator =
    mode === "target" && dailyTarget > 0 ? dailyTarget : Math.max(maxCount, 1);
  const intensity = count / denominator;

  if (intensity >= 0.75) return 4;
  if (intensity >= 0.5) return 3;
  if (intensity >= 0.25) return 2;
  return 1;
}

export default function ScheduleSidebar({
  facilityId,
  facility,
  selectedDate,
  scheduleMode,
  activeScheduleInterval,
  resourceLoadSummaries,
  selectedResourceKeySet,
  onJumpToToday,
  onSelectDate,
  onScheduleModeChange,
  onScheduleIntervalChange,
  onToggleResource,
}: ScheduleSidebarProps) {
  const { preferences } = useUserPreferences();
  const showHeatmap = preferences.showScheduleHeatmap;
  const heatmapMode = preferences.scheduleHeatmapMode;
  const heatmapDailyTarget = preferences.scheduleHeatmapDailyTarget;

  const [displayMonth, setDisplayMonth] = useState(() =>
    getMonthStartDate(selectedDate)
  );
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  useEffect(() => {
    const selectedMonth = getMonthStartDate(selectedDate);
    if (selectedMonth) setDisplayMonth(selectedMonth);
  }, [selectedDate]);

  const calendarDayCells = useMemo(
    () => buildCalendarDayCells(displayMonth || selectedDate),
    [displayMonth, selectedDate]
  );
  const selectedResourceCount = selectedResourceKeySet.size;
  const heatmapMonth = displayMonth ? displayMonth.slice(0, 7) : "";
  const {
    counts: heatmapCounts,
    loading: heatmapLoading,
    refreshing: heatmapRefreshing,
    error: heatmapError,
    reload: reloadHeatmap,
  } = useScheduleHeatmap({
    facilityId,
    month: showHeatmap ? heatmapMonth : "",
  });
  const heatmapMaxCount = useMemo(
    () => Math.max(0, ...Object.values(heatmapCounts)),
    [heatmapCounts]
  );
  const calendarMonthLabel =
    displayMonth && facility?.timezone
      ? formatDateOnlyInTimeZone(displayMonth, facility.timezone, "MMM yyyy")
      : "Calendar";
  const displayYear = Number((displayMonth || "").split("-")[0]);
  const displayMonthIndex = Number((displayMonth || "").split("-")[1]) - 1;

  return (
    <aside className="hidden min-h-0 overflow-y-auto border-r border-cf-border bg-cf-surface-muted/70 px-3 py-3 lg:block">
      <ScheduleHeader
        facility={facility}
        scheduleMode={scheduleMode}
        activeScheduleInterval={activeScheduleInterval}
        onScheduleModeChange={onScheduleModeChange}
        onScheduleIntervalChange={onScheduleIntervalChange}
      />

      <div className="rounded-xl border border-cf-border/60 bg-cf-surface p-4 shadow-[var(--shadow-panel)]">
        <div className="flex items-start justify-between gap-2">
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((current) => !current)}
              className="inline-flex max-w-full items-center gap-1 rounded-lg px-1 py-0.5 text-sm font-semibold tracking-tight text-cf-text transition hover:bg-cf-surface-soft"
              aria-expanded={isMonthPickerOpen}
              aria-label="Change calendar month"
            >
              <span className="truncate">{calendarMonthLabel}</span>
              <ChevronDown
                className={[
                  "h-3.5 w-3.5 text-cf-text-subtle transition-transform",
                  isMonthPickerOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>

            {isMonthPickerOpen ? (
              <div className="absolute left-0 top-8 z-20 w-56 rounded-xl border border-cf-border/60 bg-cf-surface p-3 shadow-[var(--shadow-elevated)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDisplayMonth((current) =>
                        shiftYear(
                          current || getMonthStartDate(selectedDate),
                          -1
                        )
                      )
                    }
                    className="grid h-7 w-7 place-items-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text"
                    aria-label="Previous calendar year"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="text-sm font-semibold text-cf-text">
                    {displayYear || ""}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDisplayMonth((current) =>
                        shiftYear(current || getMonthStartDate(selectedDate), 1)
                      )
                    }
                    className="grid h-7 w-7 place-items-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text"
                    aria-label="Next calendar year"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {MONTH_LABELS.map((month, index) => {
                    const isActive = displayMonthIndex === index;

                    return (
                      <button
                        key={month}
                        type="button"
                        onClick={() => {
                          setDisplayMonth((current) =>
                            setMonthPart(
                              current || getMonthStartDate(selectedDate),
                              index
                            )
                          );
                          setIsMonthPickerOpen(false);
                        }}
                        className={[
                          "rounded-lg px-2 py-1.5 text-xs font-semibold transition",
                          isActive
                            ? "bg-cf-accent text-cf-page-bg"
                            : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
                        ].join(" ")}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setDisplayMonth((current) =>
                  shiftMonth(current || getMonthStartDate(selectedDate), -1)
                )
              }
              className="grid h-7 w-7 place-items-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text"
              aria-label="Previous calendar month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onJumpToToday}
              className="grid h-7 min-w-7 place-items-center rounded-lg bg-cf-surface-soft px-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-cf-text-subtle transition hover:bg-cf-accent hover:text-cf-page-bg"
              aria-label="Jump schedule to today"
            >
              T
            </button>
            <button
              type="button"
              onClick={() =>
                setDisplayMonth((current) =>
                  shiftMonth(current || getMonthStartDate(selectedDate), 1)
                )
              }
              className="grid h-7 w-7 place-items-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text"
              aria-label="Next calendar month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-cf-text-subtle">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div key={`${day}-${index}`}>{day}</div>
          ))}
        </div>
        <div
          className="mt-1 grid grid-cols-7 gap-1 text-[11px]"
          aria-busy={heatmapLoading || heatmapRefreshing}
        >
          {calendarDayCells.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} />;
            }

            const isSelected = selectedDate === cell.date;
            const appointmentCount = heatmapCounts[cell.date] || 0;
            const heatmapLevel = showHeatmap
              ? getHeatmapLevel(
                  appointmentCount,
                  heatmapMaxCount,
                  heatmapMode,
                  heatmapDailyTarget
                )
              : 0;

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => onSelectDate(cell.date)}
                data-heatmap-level={isSelected ? undefined : heatmapLevel}
                className={[
                  "cf-schedule-heatmap-day grid aspect-square place-items-center rounded-md font-medium transition",
                  isSelected ? "bg-cf-accent text-cf-page-bg" : "",
                ].join(" ")}
                aria-pressed={isSelected}
                aria-label={`${cell.date}: ${appointmentCount} ${
                  appointmentCount === 1 ? "appointment" : "appointments"
                }${showHeatmap && heatmapMode === "target" ? ` of ${heatmapDailyTarget} target` : ""}`}
                title={`${cell.date}: ${appointmentCount} ${
                  appointmentCount === 1 ? "appointment" : "appointments"
                }${showHeatmap && heatmapMode === "target" ? ` (${Math.round((appointmentCount / heatmapDailyTarget) * 100)}% of ${heatmapDailyTarget} target)` : ""}`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
        {showHeatmap ? (
          <>
            <div className="mt-3 flex items-center justify-between text-[10px] text-cf-text-subtle">
              <span>Less</span>
              <div className="flex items-center gap-1">
                <span
                  className="cf-schedule-heatmap-swatch h-2 w-3 rounded-sm"
                  data-heatmap-level="1"
                />
                <span
                  className="cf-schedule-heatmap-swatch h-2 w-3 rounded-sm"
                  data-heatmap-level="2"
                />
                <span
                  className="cf-schedule-heatmap-swatch h-2 w-3 rounded-sm"
                  data-heatmap-level="3"
                />
                <span
                  className="cf-schedule-heatmap-swatch h-2 w-3 rounded-sm"
                  data-heatmap-level="4"
                />
              </div>
              <span>Busy</span>
            </div>
            {heatmapError ? (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-cf-surface-soft px-2.5 py-2 text-[11px] text-cf-text-subtle">
                <span>Heat map unavailable</span>
                <button
                  type="button"
                  onClick={() => void reloadHeatmap()}
                  className="rounded-md px-2 py-1 font-semibold text-cf-text transition hover:bg-cf-surface hover:text-cf-accent"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
            Resources
          </div>
          <span className="text-[11px] font-semibold text-cf-text">
            {scheduleMode === "days"
              ? "Focused"
              : `Selected ${selectedResourceCount}/${MAX_SCHEDULE_COLUMNS}`}
          </span>
        </div>
        <ul className="mt-2 space-y-1.5 text-sm">
          {resourceLoadSummaries.map((resource) => {
            const isSelected = selectedResourceKeySet.has(resource.key);
            const isDisabled =
              scheduleMode === "resources" &&
              !isSelected &&
              selectedResourceCount >= MAX_SCHEDULE_COLUMNS;

            return (
              <li key={resource.key}>
                <button
                  type="button"
                  onClick={() => onToggleResource(resource.key)}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  className={[
                    "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left shadow-[var(--shadow-panel)] transition",
                    isSelected
                      ? "border-cf-border-strong bg-cf-surface-soft text-cf-text ring-1 ring-cf-border-strong"
                      : "border-cf-border bg-cf-surface text-cf-text hover:border-cf-border-strong hover:bg-cf-surface-soft",
                    isDisabled ? "cursor-not-allowed opacity-45" : "",
                  ].join(" ")}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className={[
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        isSelected ? "bg-cf-accent" : resource.dotClassName,
                      ].join(" ")}
                    />
                    <span className="truncate font-medium text-cf-text">
                      {resource.label}
                    </span>
                  </span>
                  <span
                    className={[
                      "font-mono text-[11px]",
                      isSelected ? "text-cf-text-muted" : "text-cf-text-subtle",
                    ].join(" ")}
                  >
                    {resource.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
