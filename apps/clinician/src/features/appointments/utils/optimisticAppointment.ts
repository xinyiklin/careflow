import {
  durationEnd,
  facilityInstant,
  facilityWallText,
} from "./appointmentCandidate";
import type { ApiPayload } from "../../../shared/api/types";
import type { AppointmentLike } from "../../../shared/types/domain";

const hasOffset = (value: string) => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);

export function optimisticAppointment(
  previous: AppointmentLike,
  payload: ApiPayload,
  timeZone: string
): AppointmentLike {
  const next = { ...previous, ...payload, id: previous.id };
  const start =
    typeof payload.appointment_time === "string"
      ? payload.appointment_time
      : null;
  const startChanged =
    start !== null &&
    start !== previous.appointment_time &&
    start !== previous.appointment_time_instant;
  try {
    if (start !== null) {
      if (hasOffset(start)) {
        next.appointment_time_instant = new Date(start).toISOString();
        next.appointment_time = facilityWallText(start, timeZone);
      } else if (startChanged) {
        next.appointment_time_instant = null;
      }
    }
    if (Object.hasOwn(payload, "end_time")) {
      const end = typeof payload.end_time === "string" ? payload.end_time : "";
      next.end_time_instant =
        end && hasOffset(end) ? new Date(end).toISOString() : null;
      if (next.end_time_instant)
        next.end_time = facilityWallText(next.end_time_instant, timeZone);
    } else if (startChanged && start) {
      const previousStart =
        previous.appointment_time_instant || previous.appointment_time;
      const previousEnd = previous.end_time_instant || previous.end_time;
      const minutes =
        previousStart && previousEnd
          ? (facilityInstant(previousEnd, timeZone).getTime() -
              facilityInstant(previousStart, timeZone).getTime()) /
            60_000
          : Number(previous.duration_minutes);
      const shiftedEnd = durationEnd(start, minutes, timeZone);
      next.end_time = facilityWallText(shiftedEnd, timeZone);
      next.end_time_instant = shiftedEnd;
      next.duration_minutes = minutes;
    }
  } catch {
    // Invalid pending input must not leave a seemingly valid old interval to
    // reopen while the authoritative save reports its validation error.
    if (startChanged) {
      next.appointment_time_instant = null;
      next.end_time = null;
      next.end_time_instant = null;
    }
  }
  return next;
}
