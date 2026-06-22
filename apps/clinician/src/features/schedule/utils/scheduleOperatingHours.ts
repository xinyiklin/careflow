import {
  formatDateOnlyInTimeZone,
  parseDateOnlyInTimeZone,
} from "../../../shared/utils/dateTime";
import {
  SCHEDULE_END_MINUTE,
  SCHEDULE_START_MINUTE,
} from "./scheduleConstants";

import type {
  FacilityLike,
  ScheduleWindow,
} from "../../../shared/types/domain";

const DEFAULT_OPERATING_DAYS = [1, 2, 3, 4, 5] as const;

export function parseTimeToMinutes(
  value: unknown,
  fallbackMinutes: number
): number {
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

export function getFacilityOperatingWindow(
  facility?: FacilityLike | null,
  dayOfWeek?: number | null
): ScheduleWindow {
  if (
    facility?.custom_operating_hours &&
    Array.isArray(facility.custom_operating_hours) &&
    dayOfWeek != null
  ) {
    const matchingBlock = facility.custom_operating_hours.find(
      (block) =>
        Array.isArray(block?.days) &&
        block.days.map(Number).includes(Number(dayOfWeek))
    );
    if (matchingBlock) {
      const startMinute = parseTimeToMinutes(
        matchingBlock.start_time,
        SCHEDULE_START_MINUTE
      );
      const endMinute = parseTimeToMinutes(
        matchingBlock.end_time,
        SCHEDULE_END_MINUTE
      );
      if (startMinute < endMinute) {
        return { startMinute, endMinute };
      }
    }
  }

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

export function getFacilityOperatingDays(
  facility?: FacilityLike | null
): number[] {
  const rawDays = Array.isArray(facility?.operating_days)
    ? facility.operating_days
    : DEFAULT_OPERATING_DAYS;
  const normalizedDays = rawDays
    .map((day) => Number(day))
    .filter(
      (day, index, days) => day >= 1 && day <= 7 && days.indexOf(day) === index
    );

  return normalizedDays.length ? normalizedDays : [...DEFAULT_OPERATING_DAYS];
}

export function isFacilityOperatingDate(
  dateString: string,
  timeZone: string | null | undefined,
  facility?: FacilityLike | null
): boolean {
  const date = parseDateOnlyInTimeZone(dateString, timeZone);
  if (!date) return true;

  const isoDay = Number(formatDateOnlyInTimeZone(date, timeZone, "i"));
  return getFacilityOperatingDays(facility).includes(isoDay);
}
