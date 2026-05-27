import { SCHEDULE_START_MINUTE } from "./scheduleConstants";

import type { AppointmentLike } from "../../../shared/types/domain";

type PositionedAppointment = AppointmentLike & {
  startSlot: number;
  span: number;
  endSlot: number;
  laneIndex: number;
  groupId: number;
  laneCount: number;
};

export function toMinutes(time24?: string | null): number {
  if (!time24) return 0;
  const [hours, minutes] = time24.split(":").map(Number);
  return hours * 60 + minutes;
}

export function toTime24(totalMinutes: number): string {
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatScheduleSlotLabel(time24?: string | null): string {
  const [hourText, minuteText] = (time24 || "00:00").split(":");
  if (minuteText !== "00") return "";
  const hour = Number(hourText);
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteText}`;
}

export function getAppointmentDurationMinutes(
  appointment: AppointmentLike,
  intervalMinutes: number
): number {
  if (appointment.duration_minutes) return Number(appointment.duration_minutes);

  if (appointment.end_time_str && appointment.time) {
    const duration =
      toMinutes(appointment.end_time_str) - toMinutes(appointment.time);
    if (duration > 0) return duration;
  }

  return intervalMinutes;
}

export function getAppointmentSpan(
  appointment: AppointmentLike,
  intervalMinutes: number
): number {
  const startMinutes = toMinutes(appointment.time);
  const endMinutes = appointment.end_time_str
    ? toMinutes(appointment.end_time_str)
    : startMinutes +
      Math.max(
        Number(appointment.duration_minutes) || intervalMinutes,
        intervalMinutes
      );
  const duration = Math.max(endMinutes - startMinutes, intervalMinutes);
  return Math.max(1, Math.ceil(duration / intervalMinutes));
}

export function getSlotRowHeight(intervalMinutes: number): number {
  if (intervalMinutes <= 5) return 32;
  if (intervalMinutes <= 10) return 36;
  if (intervalMinutes <= 15) return 46;
  if (intervalMinutes <= 20) return 46;
  if (intervalMinutes <= 30) return 52;
  return 62;
}

export function getRenderedSpan(span: number, visibleDayCount: number): number {
  if (visibleDayCount <= 1) return span;
  return Math.min(span, 3);
}

export function buildPositionedAppointments(
  appointments: AppointmentLike[],
  intervalMinutes: number,
  startMinute = SCHEDULE_START_MINUTE
): PositionedAppointment[] {
  const sortedAppointments = [...appointments]
    .map((appointment) => {
      const [hours, minutes] = (appointment.time || "00:00")
        .split(":")
        .map(Number);
      const startSlot = Math.floor(
        (hours * 60 + minutes - startMinute) / intervalMinutes
      );
      const span = getAppointmentSpan(appointment, intervalMinutes);
      return {
        ...appointment,
        startSlot,
        span,
        endSlot: startSlot + span,
      };
    })
    .filter((appointment) => appointment.endSlot > 0)
    .sort((a, b) => a.startSlot - b.startSlot);

  const laneEndSlots: number[] = [];
  const groupSizes = new Map<number, number>();
  let activeAppointments: Array<{
    endSlot: number;
    laneIndex: number;
    groupId: number;
  }> = [];
  let currentGroupId = -1;

  const positioned = sortedAppointments.map((appointment) => {
    activeAppointments = activeAppointments.filter(
      (activeAppointment) => activeAppointment.endSlot > appointment.startSlot
    );

    if (activeAppointments.length === 0) {
      currentGroupId += 1;
      groupSizes.set(currentGroupId, 0);
    }

    let laneIndex = laneEndSlots.findIndex(
      (endSlot) => endSlot <= appointment.startSlot
    );
    if (laneIndex === -1) {
      laneIndex = laneEndSlots.length;
      laneEndSlots.push(appointment.endSlot);
    } else {
      laneEndSlots[laneIndex] = appointment.endSlot;
    }

    activeAppointments.push({
      endSlot: appointment.endSlot,
      laneIndex,
      groupId: currentGroupId,
    });

    groupSizes.set(
      currentGroupId,
      Math.max(groupSizes.get(currentGroupId) || 0, activeAppointments.length)
    );

    return {
      ...appointment,
      laneIndex,
      groupId: currentGroupId,
    };
  });

  return positioned.map((appointment) => ({
    ...appointment,
    laneCount: Math.max(groupSizes.get(appointment.groupId) || 1, 1),
  }));
}
