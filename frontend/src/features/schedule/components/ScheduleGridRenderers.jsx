import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { MUI_DATE_FIELD_SX } from "../../../shared/components/ui/dateFieldStyles";
import {
  getTodayInTimeZone,
  parseDateOnlyInTimeZone,
} from "../../../shared/utils/dateTime";
import { formatPickerDateToApi } from "../utils/scheduleDateUtils";

export { ScheduleDayColumns } from "./ScheduleGridColumns";
export { ScheduleDragGhost } from "./ScheduleGridAppointmentLayers";
export { default as SharedTimeRailGrid } from "./SharedTimeRailGrid";

export function ScheduleGridToolbar({
  dragState,
  formattedSelectedDate,
  onChangeDay,
  onDateChange,
  onOpenDatePicker,
  resourceColumnMode,
  timeZone,
}) {
  return (
    <div className="border-b border-cf-border bg-cf-surface-muted/70 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex min-w-0 items-center gap-1 rounded-xl border border-cf-border bg-cf-surface px-1.5 py-1">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-muted hover:text-cf-text"
            onClick={() => onChangeDay(-1)}
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-[168px] px-1 text-center text-sm font-semibold text-cf-text">
            {formattedSelectedDate}
          </div>

          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-muted hover:text-cf-text"
            onClick={() => onChangeDay(1)}
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-muted hover:text-cf-text"
            onClick={onOpenDatePicker}
            aria-label="Open calendar"
            title="Open calendar"
          >
            <CalendarDays className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="inline-flex h-7 items-center justify-center rounded-lg border border-cf-border bg-cf-surface px-2 text-sm font-medium text-cf-text-muted transition hover:border-cf-border-strong hover:text-cf-text"
            onClick={() => onDateChange?.(getTodayInTimeZone(timeZone))}
          >
            Today
          </button>
        </div>

        <div
          className={[
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
            dragState?.activated
              ? "border-cf-border-strong bg-cf-surface text-cf-text shadow-sm"
              : "border-cf-border bg-cf-surface text-cf-text-muted",
          ].join(" ")}
        >
          <span className="h-2 w-2 rounded-full bg-cf-accent" />
          {dragState?.activated
            ? `Drop ${dragState.appointment.patient_name} into a new ${
                resourceColumnMode ? "resource" : "day"
              } or time`
            : `Drag cards across columns to reschedule ${
                resourceColumnMode ? "resources" : "days"
              } or time`}
        </div>
      </div>
    </div>
  );
}

export function ScheduleDatePicker({
  activeDatePickerIndex,
  handleChangeVisibleDate,
  isDatePickerOpen,
  resolvedVisibleDates,
  setActiveDatePickerIndex,
  setIsDatePickerOpen,
  timeZone,
}) {
  return (
    <div className="pointer-events-none absolute opacity-0">
      <DatePicker
        open={isDatePickerOpen}
        onClose={() => {
          setIsDatePickerOpen(false);
          setActiveDatePickerIndex(null);
        }}
        value={
          activeDatePickerIndex != null
            ? parseDateOnlyInTimeZone(
                resolvedVisibleDates[activeDatePickerIndex],
                timeZone
              )
            : null
        }
        onChange={(newValue) => {
          if (activeDatePickerIndex == null) {
            setIsDatePickerOpen(false);
            return;
          }

          const nextDate = formatPickerDateToApi(newValue, timeZone);
          if (nextDate) {
            handleChangeVisibleDate(activeDatePickerIndex, nextDate);
          }
          setIsDatePickerOpen(false);
          setActiveDatePickerIndex(null);
        }}
        slotProps={{ textField: { size: "small", sx: MUI_DATE_FIELD_SX } }}
      />
    </div>
  );
}
