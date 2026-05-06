import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type { AdminOrganizationPharmacyPreference } from "../../types";

export function fetchOrganizationPharmacies() {
  return apiRequest<AdminOrganizationPharmacyPreference[]>(
    "/organizations/pharmacies/"
  );
}

export function createOrganizationPharmacy(data: ApiPayload) {
  return apiRequest<AdminOrganizationPharmacyPreference>(
    "/organizations/pharmacies/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function updateOrganizationPharmacy(id: EntityId, data: ApiPayload) {
  return apiRequest<AdminOrganizationPharmacyPreference>(
    `/organizations/pharmacies/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}
