import { apiRequest } from "../../../shared/api/client";

export function searchPatients({
  facilityId,
  search,
  name,
  date_of_birth,
  chart_number,
  phone,
} = {}) {
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

export function createPatient(data, facilityId) {
  return apiRequest("/patients/", {
    method: "POST",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(data),
  });
}

export function updatePatient(id, data, facilityId) {
  return apiRequest(`/patients/${id}/`, {
    method: "PUT",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(data),
  });
}

export function patchPatient(id, partialData, facilityId) {
  return apiRequest(`/patients/${id}/`, {
    method: "PATCH",
    params: {
      facility_id: facilityId,
    },
    body: JSON.stringify(partialData),
  });
}

export function deletePatient(id, facilityId) {
  return apiRequest(`/patients/${id}/`, {
    method: "DELETE",
    params: {
      facility_id: facilityId,
    },
  });
}

export function fetchPatientById(id, facilityId) {
  return apiRequest(`/patients/${id}/`, {
    params: {
      facility_id: facilityId,
    },
  });
}

export function revealPatientSsn(id, facilityId) {
  return apiRequest(`/patients/${id}/reveal-ssn/`, {
    params: {
      facility_id: facilityId,
    },
  });
}
