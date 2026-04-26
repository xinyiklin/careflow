import {
  formatDateOnlyInTimeZone,
  parseDateOnlyInTimeZone,
} from "../../../shared/utils/dateTime";
import {
  SCHEDULE_END_MINUTE,
  SCHEDULE_START_MINUTE,
} from "./scheduleConstants";

const DEFAULT_OPERATING_DAYS = [1, 2, 3, 4, 5];
const DAY_LABELS = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

export function parseTimeToMinutes(value, fallbackMinutes) {
  if (typeof value !== "string") return fallbackMinutes;

  const [rawHour, rawMinute] = value.split(":");
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return fallbackMinutes;
  }

  return hour * 60 + minute;
}

export function getFacilityOperatingWindow(facility) {
  const startMinute = parseTimeToMinutes(
    facility?.operating_start_time,
    SCHEDULE_START_MINUTE
  );
  const endMinute = parseTimeToMinutes(
    facility?.operating_end_time,
    SCHEDULE_END_MINUTE
  );

  if (startMinute >= endMinute) {
    return {
      startMinute: SCHEDULE_START_MINUTE,
      endMinute: SCHEDULE_END_MINUTE,
    };
  }

  return { startMinute, endMinute };
}

export function getFacilityOperatingDays(facility) {
  const rawDays = Array.isArray(facility?.operating_days)
    ? facility.operating_days
    : DEFAULT_OPERATING_DAYS;
  const normalizedDays = rawDays
    .map((day) => Number(day))
    .filter(
      (day, index, days) => day >= 1 && day <= 7 && days.indexOf(day) === index
    );

  return normalizedDays.length ? normalizedDays : DEFAULT_OPERATING_DAYS;
}

export function isFacilityOperatingDate(dateString, timeZone, facility) {
  const date = parseDateOnlyInTimeZone(dateString, timeZone);
  if (!date) return true;

  const isoDay = Number(formatDateOnlyInTimeZone(date, timeZone, "i"));
  return getFacilityOperatingDays(facility).includes(isoDay);
}

export function formatOperatingWindow(facility) {
  const { startMinute, endMinute } = getFacilityOperatingWindow(facility);
  return `${formatMinutes(startMinute)}-${formatMinutes(endMinute)}`;
}

export function formatOperatingDays(facility) {
  const days = getFacilityOperatingDays(facility);
  if (days.join(",") === DEFAULT_OPERATING_DAYS.join(",")) return "Mon-Fri";
  if (days.length === 7) return "Daily";
  return days
    .map((day) => DAY_LABELS[day])
    .filter(Boolean)
    .join(", ");
}

function formatMinutes(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? "AM" : "PM";

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}
