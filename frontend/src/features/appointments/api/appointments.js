import { apiRequest } from "../../../shared/api/client";

export function fetchAppointments({
  facilityId,
  date,
  dateTo,
  patientId,
} = {}) {
  return apiRequest("/appointments/", {
    params: {
      facility_id: facilityId,
      date,
      date_to: dateTo,
      patient_id: patientId,
    },
  });
}

export function fetchAppointmentHeatmap({ facilityId, month } = {}) {
  return apiRequest("/appointments/heatmap/", {
    params: {
      facility_id: facilityId,
      month,
    },
  });
}

export function createAppointment(facilityId, data) {
  return apiRequest("/appointments/", {
    method: "POST",
    params: { facility_id: facilityId },
    body: JSON.stringify(data),
  });
}

export function updateAppointment(facilityId, id, data) {
  return apiRequest(`/appointments/${id}/`, {
    method: "PUT",
    params: { facility_id: facilityId },
    body: JSON.stringify(data),
  });
}

export function deleteAppointment(facilityId, id) {
  return apiRequest(`/appointments/${id}/`, {
    method: "DELETE",
    params: { facility_id: facilityId },
  });
}

export function fetchAppointmentHistory(facilityId, id) {
  return apiRequest(`/appointments/${id}/history/`, {
    params: { facility_id: facilityId },
  });
}
