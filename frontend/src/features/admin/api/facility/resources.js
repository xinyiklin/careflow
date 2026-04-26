import { apiRequest } from "../../../../shared/api/client";

export function fetchResources(facilityId) {
  return apiRequest("/facilities/resources/", {
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
  });
}

export function createResource(facilityId, data) {
  return apiRequest("/facilities/resources/", {
    method: "POST",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function updateResource(facilityId, id, data) {
  return apiRequest(`/facilities/resources/${id}/`, {
    method: "PATCH",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function deactivateResource(facilityId, id) {
  return apiRequest(`/facilities/resources/${id}/`, {
    method: "DELETE",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
  });
}
