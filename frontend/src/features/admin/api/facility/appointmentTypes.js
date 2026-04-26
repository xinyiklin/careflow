import { apiRequest } from "../../../../shared/api/client";

export function fetchAppointmentTypes(facilityId) {
  return apiRequest("/facilities/appointment-types/", {
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
  });
}

export function createAppointmentType(facilityId, data) {
  return apiRequest("/facilities/appointment-types/", {
    method: "POST",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function updateAppointmentType(facilityId, id, data) {
  return apiRequest(`/facilities/appointment-types/${id}/`, {
    method: "PATCH",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function deleteAppointmentType(facilityId, id) {
  return apiRequest(`/facilities/appointment-types/${id}/`, {
    method: "DELETE",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
  });
}
