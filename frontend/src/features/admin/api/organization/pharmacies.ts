import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

export function fetchOrganizationPharmacies() {
  return apiRequest("/organizations/pharmacies/");
}

export function createOrganizationPharmacy(data: ApiPayload) {
  return apiRequest("/organizations/pharmacies/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrganizationPharmacy(id: EntityId, data: ApiPayload) {
  return apiRequest(`/organizations/pharmacies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
