import { apiRequest } from "../../../../shared/api/client";

export function fetchAppointmentStatuses(facilityId) {
  return apiRequest("/facilities/appointment-statuses/", {
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
  });
}

export function createAppointmentStatus(facilityId, data) {
  return apiRequest("/facilities/appointment-statuses/", {
    method: "POST",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function updateAppointmentStatus(facilityId, id, data) {
  return apiRequest(`/facilities/appointment-statuses/${id}/`, {
    method: "PATCH",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function deleteAppointmentStatus(facilityId, id) {
  return apiRequest(`/facilities/appointment-statuses/${id}/`, {
    method: "DELETE",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
  });
}
