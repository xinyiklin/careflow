import { apiRequest } from "../../../shared/api/client";

import type { ApiPayload, EntityId } from "../../../shared/api/types";
import type { PatientInsurancePolicy } from "../../../shared/types/domain";

export function fetchInsuranceCarriers() {
  return apiRequest("/insurance/carriers/");
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
