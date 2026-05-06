import { apiRequest } from "../../../shared/api/client";

import type { EntityId } from "../../../shared/api/types";

export function fetchPhysicianList(facilityId: EntityId | null | undefined) {
  return apiRequest("/facilities/staff/", {
    params: {
      facility_id: facilityId,
      role: "physician",
    },
  });
}

export function fetchAppointmentStatuses(
  facilityId: EntityId | null | undefined
) {
  return apiRequest("/facilities/appointment-statuses/", {
    params: { facility_id: facilityId },
  });
}

export function fetchAppointmentTypes(facilityId: EntityId | null | undefined) {
  return apiRequest("/facilities/appointment-types/", {
    params: { facility_id: facilityId },
  });
}

export function fetchFacilityResources(
  facilityId: EntityId | null | undefined
) {
  return apiRequest("/facilities/resources/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffRoles(facilityId: EntityId | null | undefined) {
  return apiRequest("/facilities/staff-roles/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffTitles(facilityId: EntityId | null | undefined) {
  return apiRequest("/facilities/staff-titles/", {
    params: { facility_id: facilityId },
  });
}

export function fetchPatientGenders(facilityId: EntityId | null | undefined) {
  return apiRequest("/facilities/patient-genders/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffList(facilityId: EntityId | null | undefined) {
  return apiRequest("/facilities/staff/", {
    params: { facility_id: facilityId },
  });
}

export function fetchCareProviders(facilityId: EntityId | null | undefined) {
  return apiRequest("/patients/providers/", {
    params: { facility_id: facilityId },
  });
}

export function fetchPharmacies(facilityId: EntityId | null | undefined) {
  return apiRequest("/patients/pharmacies/", {
    params: { facility_id: facilityId },
  });
}
