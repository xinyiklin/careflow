import { apiRequest } from "../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../shared/api/types";
import type { PatientInsurancePolicy } from "../../../shared/types/domain";
import type { InsuranceCarrier } from "../types";

export function fetchInsuranceCarriers({
  facilityId,
}: {
  facilityId?: EntityId | null;
} = {}) {
  return apiRequest<InsuranceCarrier[]>("/insurance/carriers/", {
    params: { facility_id: facilityId },
  });
}

export function fetchPatientInsurancePolicies({
  facilityId,
  patientId,
}: {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
} = {}) {
  return apiRequest<PatientInsurancePolicy[]>("/insurance/policies/", {
    params: {
      facility_id: facilityId,
      patient_id: patientId,
    },
  });
}

export function createPatientInsurancePolicy(
  facilityId: EntityId | null | undefined,
  data: ApiPayload
) {
  return apiRequest("/insurance/policies/", {
    method: "POST",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(data),
  });
}

export function updatePatientInsurancePolicy(
  facilityId: EntityId | null | undefined,
  id: EntityId,
  data: ApiPayload
) {
  return apiRequest(`/insurance/policies/${id}/`, {
    method: "PATCH",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(data),
  });
}

export function deletePatientInsurancePolicy(
  facilityId: EntityId | null | undefined,
  id: EntityId
) {
  return apiRequest(`/insurance/policies/${id}/`, {
    method: "DELETE",
    params: {
      facility_id: facilityId,
    },
  });
}
