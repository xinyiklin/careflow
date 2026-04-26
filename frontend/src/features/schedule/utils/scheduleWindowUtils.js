import { getAppointmentDurationMinutes, toMinutes } from "./scheduleGridMath";

function alignMinuteDown(totalMinutes, intervalMinutes) {
  return Math.max(
    0,
    Math.floor(totalMinutes / intervalMinutes) * intervalMinutes
  );
}

function alignMinuteUp(totalMinutes, intervalMinutes) {
  return Math.min(
    24 * 60,
    Math.ceil(totalMinutes / intervalMinutes) * intervalMinutes
  );
}

export function mergeScheduleWindows(baseWindow, extraWindow) {
  if (!baseWindow) return extraWindow;
  if (!extraWindow) return baseWindow;

  return {
    startMinute: Math.min(baseWindow.startMinute, extraWindow.startMinute),
    endMinute: Math.max(baseWindow.endMinute, extraWindow.endMinute),
  };
}

export function getAppointmentsScheduleWindow(appointments, intervalMinutes) {
  if (!appointments.length) return null;

  const appointmentBounds = appointments.map((appointment) => {
    const startMinute = toMinutes(appointment.time);
    return {
      startMinute,
      endMinute:
        startMinute +
        getAppointmentDurationMinutes(appointment, intervalMinutes),
    };
  });

  const startMinute = alignMinuteDown(
    Math.min(
      ...appointmentBounds.map((appointment) => appointment.startMinute)
    ),
    intervalMinutes
  );
  const endMinute = alignMinuteUp(
    Math.max(...appointmentBounds.map((appointment) => appointment.endMinute)),
    intervalMinutes
  );

  return {
    startMinute,
    endMinute: Math.max(endMinute, startMinute + intervalMinutes),
  };
}
