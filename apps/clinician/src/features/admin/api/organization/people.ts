import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type { AdminOrganizationUser } from "../../types";

export function fetchOrganizationPeople() {
  return apiRequest<AdminOrganizationUser[]>("/organizations/people/");
}

export function fetchOrganizationPerson(id: EntityId) {
  return apiRequest<AdminOrganizationUser>(`/organizations/people/${id}/`);
}

export function createOrganizationPerson(data: ApiPayload) {
  return apiRequest<AdminOrganizationUser>("/organizations/people/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrganizationPerson(id: EntityId, data: ApiPayload) {
  return apiRequest<AdminOrganizationUser>(`/organizations/people/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
