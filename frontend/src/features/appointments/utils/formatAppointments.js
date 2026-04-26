import {
  extractStoredDate,
  extractStoredTime,
} from "../../../shared/utils/dateTime";

export default function formatAppointments(
  appointments,
  onEditAppointment,
  timeZone
) {
  return appointments.map((appointment) => ({
    id: appointment.id,
    patient_id: appointment.patient_id,
    patient_name: appointment.patient_name,
    patient_date_of_birth: appointment.patient_date_of_birth,
    patient_chart_number: appointment.patient_chart_number,
    resource: appointment.resource,
    resource_name: appointment.resource_name,
    rendering_provider: appointment.rendering_provider,
    rendering_provider_name: appointment.rendering_provider_name,
    rendering_provider_role_name: appointment.rendering_provider_role_name,
    rendering_provider_title_name: appointment.rendering_provider_title_name,
    room: appointment.room,
    reason: appointment.reason,
    notes: appointment.notes,
    status: appointment.status,
    status_name: appointment.status_name,
    status_code: appointment.status_code,
    status_color: appointment.status_color,
    appointment_type: appointment.appointment_type,
    appointment_type_name: appointment.appointment_type_name,
    appointment_type_code: appointment.appointment_type_code,
    appointment_type_color: appointment.appointment_type_color,
    facility: appointment.facility,
    created_by_name: appointment.created_by_name,
    appointment_time: appointment.appointment_time,
    duration_minutes: appointment.duration_minutes || 0,
    end_time: appointment.end_time,
    date: extractStoredDate(appointment.appointment_time, timeZone),
    time: extractStoredTime(appointment.appointment_time, timeZone),
    end_date: appointment.end_time
      ? extractStoredDate(appointment.end_time, timeZone)
      : null,
    end_time_str: appointment.end_time
      ? extractStoredTime(appointment.end_time, timeZone)
      : null,
    onEdit: () => onEditAppointment(appointment),
  }));
}
