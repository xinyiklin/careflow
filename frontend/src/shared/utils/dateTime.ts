import { format, parseISO, isValid } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

const FALLBACK_TIMEZONE = "America/New_York";

type DateInput = Date | string | null | undefined;

function safeTimeZone(timeZone?: string | null): string {
  return timeZone || FALLBACK_TIMEZONE;
}

function toValidDate(value: DateInput): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }

  return null;
}

export function formatDOB(dateString?: string | null): string {
  if (!dateString) return "—";

  const parsed = parseISO(dateString);
  if (!isValid(parsed)) return "—";

  return format(parsed, "MM/dd/yyyy");
}

export function getTodayInTimeZone(timeZone?: string | null): string {
  return formatInTimeZone(new Date(), safeTimeZone(timeZone), "yyyy-MM-dd");
}

export function parseDateOnlyInTimeZone(
  dateString?: string | null,
  timeZone?: string | null
): Date | null {
  if (!dateString) return null;

  return fromZonedTime(`${dateString}T00:00:00`, safeTimeZone(timeZone));
}

export function formatDateOnlyInTimeZone(
  value: DateInput,
  timeZone?: string | null,
  pattern = "MMM d, yyyy"
): string {
  const date = toValidDate(value);
  if (!date) return "";

  return formatInTimeZone(date, safeTimeZone(timeZone), pattern);
}

export function formatTimeInTimeZone(
  value: DateInput,
  timeZone?: string | null,
  pattern = "HH:mm"
): string {
  const date = toValidDate(value);
  if (!date) return "";

  return formatInTimeZone(date, safeTimeZone(timeZone), pattern);
}

export function toFacilityDateTime(
  value: DateInput,
  timeZone?: string | null
): Date | null {
  const date = toValidDate(value);
  if (!date) return null;

  return toZonedTime(date, safeTimeZone(timeZone));
}

export function extractStoredDate(dateTimeString?: string | null): string {
  if (!dateTimeString) return "";
  return dateTimeString.slice(0, 10);
}

export function extractStoredTime(dateTimeString?: string | null): string {
  if (!dateTimeString) return "";

  const timePart = dateTimeString.split("T")[1] || "";
  return timePart.slice(0, 5);
}
