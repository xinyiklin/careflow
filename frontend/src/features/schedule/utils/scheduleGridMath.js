import { SCHEDULE_START_MINUTE } from "./scheduleConstants";

export function toMinutes(time24) {
  if (!time24) return 0;
  const [hours, minutes] = time24.split(":").map(Number);
  return hours * 60 + minutes;
}

export function toTime24(totalMinutes) {
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatScheduleSlotLabel(time24) {
  const [hourText, minuteText] = (time24 || "00:00").split(":");
  if (minuteText !== "00") return "";
  const hour = Number(hourText);
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteText}`;
}

export function getAppointmentDurationMinutes(appointment, intervalMinutes) {
  if (appointment.duration_minutes) return appointment.duration_minutes;

  if (appointment.end_time_str) {
    const duration =
      toMinutes(appointment.end_time_str) - toMinutes(appointment.time);
    if (duration > 0) return duration;
  }

  return intervalMinutes;
}

export function getAppointmentSpan(appointment, intervalMinutes) {
  const startMinutes = toMinutes(appointment.time);
  const endMinutes = appointment.end_time_str
    ? toMinutes(appointment.end_time_str)
    : startMinutes +
      Math.max(
        appointment.duration_minutes || intervalMinutes,
        intervalMinutes
      );
  const duration = Math.max(endMinutes - startMinutes, intervalMinutes);
  return Math.max(1, Math.ceil(duration / intervalMinutes));
}

export function getSlotRowHeight(intervalMinutes) {
  if (intervalMinutes <= 5) return 32;
  if (intervalMinutes <= 10) return 36;
  if (intervalMinutes <= 15) return 42;
  if (intervalMinutes <= 20) return 46;
  if (intervalMinutes <= 30) return 52;
  return 62;
}

export function getRenderedSpan(span, visibleDayCount) {
  if (visibleDayCount <= 1) return span;
  return Math.min(span, 3);
}

export function buildPositionedAppointments(
  appointments,
  intervalMinutes,
  startMinute = SCHEDULE_START_MINUTE
) {
  const sortedAppointments = [...appointments]
    .map((appointment) => {
      const [hours, minutes] = appointment.time.split(":").map(Number);
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

  const laneEndSlots = [];
  const groupSizes = new Map();
  let activeAppointments = [];
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
