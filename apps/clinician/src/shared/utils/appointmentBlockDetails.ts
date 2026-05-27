import { formatDOB } from "./dateTime";

export type AppointmentBlockDetailAppointment = {
  appointment_type_name?: string | null;
  duration_minutes?: number | string | null;
  end_time_str?: string | null;
  notes?: string | null;
  patient_chart_number?: string | number | null;
  patient_date_of_birth?: string | null;
  reason?: string | null;
  rendering_provider_name?: string | null;
  resource_name?: string | null;
  room?: string | null;
  status_name?: string | null;
  time?: string | null;
};

export type AppointmentBlockDetailDisplay = {
  showAppointmentStatus?: boolean;
  showChartNumber?: boolean;
  showDob?: boolean;
  showNotes?: boolean;
  showProvider?: boolean;
  showReason?: boolean;
  showResource?: boolean;
  showRoom?: boolean;
  showTimeRange?: boolean;
  showVisitType?: boolean;
};

export function getAppointmentTimeLabel(
  appointment: AppointmentBlockDetailAppointment,
  display: AppointmentBlockDetailDisplay
): string {
  const durationLabel = appointment.duration_minutes
    ? `${appointment.duration_minutes}m`
    : "";
  const defaultLabel = [appointment.time, durationLabel]
    .filter(Boolean)
    .join(" · ");

  if (
    !display.showTimeRange ||
    !appointment.time ||
    !appointment.end_time_str
  ) {
    return defaultLabel;
  }

  return `${appointment.time}-${appointment.end_time_str}`;
}

export function getAppointmentDetailText(
  appointment: AppointmentBlockDetailAppointment,
  display: AppointmentBlockDetailDisplay
): string {
  return [
    display.showVisitType ? appointment.appointment_type_name : "",
    display.showRoom && appointment.room ? `Room ${appointment.room}` : "",
    display.showResource ? appointment.resource_name : "",
    display.showProvider ? appointment.rendering_provider_name : "",
    display.showAppointmentStatus ? appointment.status_name : "",
    display.showDob && appointment.patient_date_of_birth
      ? `DOB ${formatDOB(appointment.patient_date_of_birth)}`
      : "",
    display.showChartNumber && appointment.patient_chart_number
      ? `Chart #${appointment.patient_chart_number}`
      : "",
    display.showReason ? appointment.reason : "",
    display.showNotes ? appointment.notes : "",
  ]
    .filter(Boolean)
    .join(" • ");
}
