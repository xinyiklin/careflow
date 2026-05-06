import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

export function fetchOrganizations() {
  return apiRequest("/organizations/");
}

export function fetchOrganization(id: EntityId) {
  return apiRequest(`/organizations/${id}/`);
}

export function updateOrganization(id: EntityId, data: ApiPayload) {
  return apiRequest(`/organizations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
