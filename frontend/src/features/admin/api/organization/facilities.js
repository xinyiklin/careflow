import { apiRequest } from "../../../../shared/api/client";

export function fetchOrganizationFacilities() {
  return apiRequest("/facilities/manage/");
}

export function fetchOrganizationFacility(id) {
  return apiRequest(`/facilities/manage/${id}/`);
}

export function createOrganizationFacility(data) {
  return apiRequest("/facilities/manage/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrganizationFacility(id, data) {
  return apiRequest(`/facilities/manage/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deactivateOrganizationFacility(id) {
  return apiRequest(`/facilities/manage/${id}/`, {
    method: "DELETE",
  });
}
