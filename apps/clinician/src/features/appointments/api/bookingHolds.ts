import { apiRequest } from "../../../shared/api/client";
import type { EntityId } from "../../../shared/api/types";
import type { ScheduleCandidate } from "../utils/appointmentCandidate";

export type ScheduleConflict = ScheduleCandidate;
export type BookingHolder = {
  user_name: string;
  start_time: string;
  end_time: string;
};
export type BookingResponse = {
  status: "active" | "occupied" | "available" | "released" | "revoked";
  session_id?: string;
  revision?: number;
  candidate: ScheduleCandidate | null;
  conflicts: ScheduleConflict[];
  holders: BookingHolder[];
};
export type BookingSeed = {
  sessionId: string;
  revision: number;
  response?: BookingResponse | null;
};

export const acquireBookingHold = (
  facilityId: EntityId,
  sessionId: string,
  revision: number,
  candidate: ScheduleCandidate,
  takeOver = false
) =>
  apiRequest<BookingResponse>("/appointments/booking-hold/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify({
      session_id: sessionId,
      revision,
      ...candidate,
      take_over: takeOver,
    }),
  });

export const heartbeatBookingHold = (
  facilityId: EntityId,
  sessionId: string,
  revision: number
) =>
  apiRequest<BookingResponse>("/appointments/booking-hold/", {
    method: "PATCH",
    params: { facility_id: facilityId },
    body: JSON.stringify({ session_id: sessionId, revision }),
  });

export const releaseBookingHold = (
  facilityId: EntityId,
  sessionId: string,
  revision: number
) =>
  apiRequest<BookingResponse>("/appointments/booking-hold/", {
    method: "DELETE",
    params: { facility_id: facilityId, session_id: sessionId, revision },
  });

export const checkAppointmentSchedule = (
  facilityId: EntityId,
  candidate: ScheduleCandidate,
  appointmentId: EntityId
) =>
  apiRequest<BookingResponse>("/appointments/schedule-check/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify({ ...candidate, appointment_id: appointmentId }),
  });
