import {
  formatDateOnlyInTimeZone,
  parseDateOnlyInTimeZone,
} from "../../../shared/utils/dateTime";

export type ScheduleDateMode = "resource" | "days";

export function addDaysToDateString(
  dateString: string,
  offset: number,
  timeZone?: string | null
): string {
  const date = parseDateOnlyInTimeZone(dateString, timeZone);
  if (!date) return dateString;
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDateOnlyInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function buildVisibleDates(
  startDate: string,
  count: number,
  timeZone?: string | null,
  mode: ScheduleDateMode = "resource"
): string[] {
  if (!startDate || !timeZone || count < 1) return [];
  if (mode === "resource") {
    return Array.from({ length: count }, () => startDate);
  }
  return Array.from({ length: count }, (_, index) =>
    addDaysToDateString(startDate, index, timeZone)
  );
}

export function getDateRangeBounds(dates: string[]): {
  minDate: string;
  maxDate: string;
} {
  if (!dates.length) {
    return { minDate: "", maxDate: "" };
  }

  const sortedDates = [...dates].sort((left, right) =>
    left.localeCompare(right)
  );
  return {
    minDate: sortedDates[0],
    maxDate: sortedDates[sortedDates.length - 1],
  };
}

export function formatPickerDateToApi(
  date: unknown,
  timeZone?: string | null
): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return formatDateOnlyInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function getTimeZoneAbbreviation(
  dateString: string,
  timeZone?: string | null
): string {
  try {
    const date = parseDateOnlyInTimeZone(dateString, timeZone);
    if (!date) return "Time";
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone || "America/New_York",
      timeZoneName: "short",
    });
    return (
      formatter.formatToParts(date).find((part) => part.type === "timeZoneName")
        ?.value || "Time"
    );
  } catch {
    return "Time";
  }
}
