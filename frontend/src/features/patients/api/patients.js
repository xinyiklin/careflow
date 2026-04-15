import { apiRequest } from "../../../shared/api/client";

export function searchPatients({
  search,
  name,
  date_of_birth,
  chart_number,
} = {}) {
  const params = new URLSearchParams();

  // data sanitation
  if (search) params.append("search", search);
  if (name) params.append("name", name);
  if (date_of_birth) params.append("date_of_birth", date_of_birth);
  if (chart_number) params.append("chart_number", chart_number);

  const query = params.toString() ? `?${params.toString()}` : "";

  return apiRequest(`/api/patients/${query}`);
}

export function createPatient(data) {
  return apiRequest("/api/patients/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updatePatient(id, data) {
  return apiRequest(`/api/patients/${id}/`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deletePatient(id) {
  return apiRequest(`/api/patients/${id}/`, {
    method: "DELETE",
  });
}

export function fetchPatientById(id) {
  return apiRequest(`/api/patients/${id}/`, {});
}
