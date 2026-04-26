import { apiRequest } from "../../../shared/api/client";

export function fetchPhysicianList(facilityId) {
  return apiRequest("/facilities/staff/", {
    params: {
      facility_id: facilityId,
      role: "physician",
    },
  });
}

export function fetchAppointmentStatuses(facilityId) {
  return apiRequest("/facilities/appointment-statuses/", {
    params: { facility_id: facilityId },
  });
}

export function fetchAppointmentTypes(facilityId) {
  return apiRequest("/facilities/appointment-types/", {
    params: { facility_id: facilityId },
  });
}

export function fetchFacilityResources(facilityId) {
  return apiRequest("/facilities/resources/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffRoles(facilityId) {
  return apiRequest("/facilities/staff-roles/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffTitles(facilityId) {
  return apiRequest("/facilities/staff-titles/", {
    params: { facility_id: facilityId },
  });
}

export function fetchPatientGenders(facilityId) {
  return apiRequest("/facilities/patient-genders/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffList(facilityId) {
  return apiRequest("/facilities/staff/", {
    params: { facility_id: facilityId },
  });
}

export function fetchCareProviders(facilityId) {
  return apiRequest("/patients/providers/", {
    params: { facility_id: facilityId },
  });
}

export function fetchPharmacies(facilityId) {
  return apiRequest("/patients/pharmacies/", {
    params: { facility_id: facilityId },
  });
}
