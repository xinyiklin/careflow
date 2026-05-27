import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type { OrganizationLike } from "../../../../shared/types/domain";

export function fetchOrganizations() {
  return apiRequest<OrganizationLike[]>("/organizations/");
}

export function fetchOrganization(id: EntityId) {
  return apiRequest<OrganizationLike>(`/organizations/${id}/`);
}

export function updateOrganization(id: EntityId, data: ApiPayload) {
  return apiRequest<OrganizationLike>(`/organizations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
