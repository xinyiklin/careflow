import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type { ApiRecord, Facility } from "../../../../shared/types/domain";

export function fetchOrganizationFacilities() {
  return apiRequest<Facility[]>("/facilities/");
}

export function fetchOrganizationFacility(id: EntityId) {
  return apiRequest<Facility>(`/facilities/${id}/`);
}

export function createOrganizationFacility(data: ApiPayload) {
  return apiRequest<Facility>("/facilities/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrganizationFacility(id: EntityId, data: ApiPayload) {
  return apiRequest<Facility>(`/facilities/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deactivateOrganizationFacility(id: EntityId) {
  return apiRequest<ApiRecord>(`/facilities/${id}/`, {
    method: "DELETE",
  });
}
