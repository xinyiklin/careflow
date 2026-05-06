import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

export function fetchOrganizationFacilities() {
  return apiRequest("/facilities/manage/");
}

export function fetchOrganizationFacility(id: EntityId) {
  return apiRequest(`/facilities/manage/${id}/`);
}

export function createOrganizationFacility(data: ApiPayload) {
  return apiRequest("/facilities/manage/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrganizationFacility(id: EntityId, data: ApiPayload) {
  return apiRequest(`/facilities/manage/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deactivateOrganizationFacility(id: EntityId) {
  return apiRequest(`/facilities/manage/${id}/`, {
    method: "DELETE",
  });
}
