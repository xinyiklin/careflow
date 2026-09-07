import {
  extractStoredDate,
  extractStoredTime,
} from "../../../shared/utils/dateTime";
import { facilityWallText } from "./appointmentCandidate";
import { getPatientChartName } from "../../patients/utils/patientDisplay";

import type { AppointmentLike } from "../../../shared/types/domain";

export type FormattedAppointment = AppointmentLike & {
  patient_name: string;
  duration_minutes: number | string;
  date: string;
  time: string;
  end_date: string | null;
  end_time_str: string | null;
  onEdit: () => void;
};

export default function formatAppointments(
  appointments: AppointmentLike[] = [],
  onEditAppointment: (
    appointment: Omit<FormattedAppointment, "onEdit">
  ) => void,
  timeZone?: string | null
): FormattedAppointment[] {
  const displayTime = (value?: string | null) => {
    if (!value || !timeZone || !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value))
      return value;
    return facilityWallText(value, timeZone);
  };
  return appointments.map((appointment) => {
    const start = displayTime(appointment.appointment_time);
    const end = displayTime(appointment.end_time);
    const patientName = getPatientChartName(
      appointment,
      appointment.patient_name || "Appointment"
    );
    const formattedAppointment = {
      id: appointment.id,
      patient_id: appointment.patient_id,
      patient_name: patientName,
      patient_first_name: appointment.patient_first_name,
      patient_middle_name: appointment.patient_middle_name,
      patient_last_name: appointment.patient_last_name,
      patient_preferred_name: appointment.patient_preferred_name,
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
      is_billable: appointment.is_billable,
      created_by_name: appointment.created_by_name,
      appointment_time: start,
      appointment_time_instant: appointment.appointment_time_instant,
      end_time_instant: appointment.end_time_instant,
      duration_minutes: appointment.duration_minutes || 0,
      end_time: end,
      date: extractStoredDate(start),
      time: extractStoredTime(start),
      end_date: end ? extractStoredDate(end) : null,
      end_time_str: end ? extractStoredTime(end) : null,
    };

    return {
      ...formattedAppointment,
      onEdit: () => onEditAppointment(formattedAppointment),
    };
  });
}
