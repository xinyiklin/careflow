import { apiRequest } from "../../../../shared/api/client";

export function fetchStaff(facilityId, extraParams = {}) {
  return apiRequest("/facilities/staff/", {
    includeFacilityId: !facilityId,
    params: {
      ...(facilityId ? { facility_id: facilityId } : {}),
      ...extraParams,
    },
  });
}

export function createStaff(facilityId, data) {
  return apiRequest("/facilities/staff/", {
    method: "POST",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function updateStaff(facilityId, id, data) {
  return apiRequest(`/facilities/staff/${id}/`, {
    method: "PATCH",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function updateStaffRole(facilityId, id, data) {
  return apiRequest(`/facilities/staff-roles/${id}/`, {
    method: "PATCH",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
    body: JSON.stringify(data),
  });
}

export function deactivateStaff(facilityId, id) {
  return apiRequest(`/facilities/staff/${id}/`, {
    method: "DELETE",
    includeFacilityId: !facilityId,
    params: facilityId ? { facility_id: facilityId } : {},
  });
}
