import {
  formatDateOnlyInTimeZone,
  parseDateOnlyInTimeZone,
} from "../../../shared/utils/dateTime";

export function addDaysToDateString(dateString, offset, timeZone) {
  const date = parseDateOnlyInTimeZone(dateString, timeZone);
  if (!date) return dateString;
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDateOnlyInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function buildVisibleDates(
  startDate,
  count,
  timeZone,
  mode = "resource"
) {
  if (!startDate || !timeZone || count < 1) return [];
  if (mode === "resource") {
    return Array.from({ length: count }, () => startDate);
  }
  return Array.from({ length: count }, (_, index) =>
    addDaysToDateString(startDate, index, timeZone)
  );
}

export function getDateRangeBounds(dates) {
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

export function formatPickerDateToApi(date, timeZone) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return formatDateOnlyInTimeZone(date, timeZone, "yyyy-MM-dd");
}

export function getTimeZoneAbbreviation(dateString, timeZone) {
  try {
    const date = parseDateOnlyInTimeZone(dateString, timeZone);
    if (!date) return "Time";
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone,
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
