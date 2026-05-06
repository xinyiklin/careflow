import { apiRequest } from "../../../shared/api/client";

import type {
  ApiParamValue,
  ApiPayload,
  EntityId,
} from "../../../shared/api/types";

type PatientSearchParams = {
  facilityId?: EntityId | null;
  search?: ApiParamValue;
  name?: ApiParamValue;
  date_of_birth?: ApiParamValue;
  chart_number?: ApiParamValue;
  phone?: ApiParamValue;
};

export function searchPatients({
  facilityId,
  search,
  name,
  date_of_birth,
  chart_number,
  phone,
}: PatientSearchParams = {}) {
  return apiRequest("/patients/", {
    params: {
      facility_id: facilityId,
      search,
      name,
      date_of_birth,
      chart_number,
      phone,
    },
  });
}

export function createPatient(
  data: ApiPayload,
  facilityId: EntityId | null | undefined
) {
  return apiRequest("/patients/", {
    method: "POST",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(data),
  });
}

export function updatePatient(
  id: EntityId,
  data: ApiPayload,
  facilityId: EntityId | null | undefined
) {
  return apiRequest(`/patients/${id}/`, {
    method: "PUT",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(data),
  });
}

export function patchPatient(
  id: EntityId,
  partialData: ApiPayload,
  facilityId: EntityId | null | undefined
) {
  return apiRequest(`/patients/${id}/`, {
    method: "PATCH",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(partialData),
  });
}

export function deletePatient(
  id: EntityId,
  facilityId: EntityId | null | undefined
) {
  return apiRequest(`/patients/${id}/`, {
    method: "DELETE",
    params: {
      facility_id: facilityId,
    },
  });
}

export function fetchPatientById(
  id: EntityId,
  facilityId: EntityId | null | undefined
) {
  return apiRequest(`/patients/${id}/`, {
    params: {
      facility_id: facilityId,
    },
  });
}

export function revealPatientSsn(
  id: EntityId,
  facilityId: EntityId | null | undefined
) {
  return apiRequest(`/patients/${id}/reveal-ssn/`, {
    params: {
      facility_id: facilityId,
    },
  });
}
