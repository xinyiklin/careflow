import { apiRequest } from "../../../shared/api/client";

export function fetchInsuranceCarriers() {
  return apiRequest("/insurance/carriers/");
}

export function fetchPatientInsurancePolicies({ facilityId, patientId } = {}) {
  return apiRequest("/insurance/policies/", {
    params: {
      facility_id: facilityId,
      patient_id: patientId,
    },
  });
}

export function createPatientInsurancePolicy(facilityId, data) {
  return apiRequest("/insurance/policies/", {
    method: "POST",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(data),
  });
}

export function updatePatientInsurancePolicy(facilityId, id, data) {
  return apiRequest(`/insurance/policies/${id}/`, {
    method: "PATCH",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(data),
  });
}

export function deletePatientInsurancePolicy(facilityId, id) {
  return apiRequest(`/insurance/policies/${id}/`, {
    method: "DELETE",
    params: {
      facility_id: facilityId,
    },
  });
}
