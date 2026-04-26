import { apiRequest } from "../../../../shared/api/client";

export function fetchOrganizationPharmacies() {
  return apiRequest("/organizations/pharmacies/");
}

export function createOrganizationPharmacy(data) {
  return apiRequest("/organizations/pharmacies/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOrganizationPharmacy(id, data) {
  return apiRequest(`/organizations/pharmacies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
