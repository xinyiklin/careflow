import { apiRequest } from "../../../../shared/api/client";

export function fetchOrganizations() {
  return apiRequest("/organizations/");
}

export function fetchOrganization(id) {
  return apiRequest(`/organizations/${id}/`);
}

export function updateOrganization(id, data) {
  return apiRequest(`/organizations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
