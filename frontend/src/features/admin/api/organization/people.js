import { apiRequest } from "../../../../shared/api/client";

export function fetchOrganizationPeople() {
  return apiRequest("/organizations/people/");
}

export function fetchOrganizationPerson(id) {
  return apiRequest(`/organizations/people/${id}/`);
}

export function createOrganizationPerson(data) {
  return apiRequest("/organizations/people/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrganizationPerson(id, data) {
  return apiRequest(`/organizations/people/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
