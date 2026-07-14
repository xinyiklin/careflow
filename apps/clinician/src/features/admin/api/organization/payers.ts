import { apiRequest } from "../../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";
import type {
  AdminInsuranceCarrier,
  AdminOrganizationPayerPreference,
} from "../../types";

export function fetchOrganizationPayers() {
  return apiRequest<AdminOrganizationPayerPreference[]>(
    "/insurance/organization-carriers/"
  );
}

export function fetchOrganizationPayerDirectory() {
  return apiRequest<AdminInsuranceCarrier[]>(
    "/insurance/organization-carriers/directory/"
  );
}

export function createOrganizationPayer(data: ApiPayload) {
  return apiRequest<AdminOrganizationPayerPreference>(
    "/insurance/organization-carriers/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function updateOrganizationPayer(id: EntityId, data: ApiPayload) {
  return apiRequest<AdminOrganizationPayerPreference>(
    `/insurance/organization-carriers/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}
