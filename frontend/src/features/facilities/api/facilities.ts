import { apiRequest } from "../../../shared/api/client";

import type { EntityId } from "../../../shared/api/types";
import type {
  AppointmentStatusOption,
  AppointmentTypeOption,
  CareProviderRecord,
  PatientGenderOption,
  PharmacyRecord,
  ResourceRecord,
  StaffRecord,
  StaffRoleRecord,
  StaffTitleRecord,
} from "../../../shared/types/domain";

export function fetchPhysicianList(facilityId: EntityId | null | undefined) {
  return apiRequest<StaffRecord[]>("/facilities/staff/", {
    params: {
      facility_id: facilityId,
      role: "physician",
    },
  });
}

export function fetchAppointmentStatuses(
  facilityId: EntityId | null | undefined
) {
  return apiRequest<AppointmentStatusOption[]>(
    "/facilities/appointment-statuses/",
    {
      params: { facility_id: facilityId },
    }
  );
}

export function fetchAppointmentTypes(facilityId: EntityId | null | undefined) {
  return apiRequest<AppointmentTypeOption[]>("/facilities/appointment-types/", {
    params: { facility_id: facilityId },
  });
}

export function fetchFacilityResources(
  facilityId: EntityId | null | undefined
) {
  return apiRequest<ResourceRecord[]>("/facilities/resources/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffRoles(facilityId: EntityId | null | undefined) {
  return apiRequest<StaffRoleRecord[]>("/facilities/staff-roles/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffTitles(facilityId: EntityId | null | undefined) {
  return apiRequest<StaffTitleRecord[]>("/facilities/staff-titles/", {
    params: { facility_id: facilityId },
  });
}

export function fetchPatientGenders(facilityId: EntityId | null | undefined) {
  return apiRequest<PatientGenderOption[]>("/facilities/patient-genders/", {
    params: { facility_id: facilityId },
  });
}

export function fetchStaffList(facilityId: EntityId | null | undefined) {
  return apiRequest<StaffRecord[]>("/facilities/staff/", {
    params: { facility_id: facilityId },
  });
}

export function fetchCareProviders(facilityId: EntityId | null | undefined) {
  return apiRequest<CareProviderRecord[]>("/patients/providers/", {
    params: { facility_id: facilityId },
  });
}

export function fetchPharmacies(facilityId: EntityId | null | undefined) {
  return apiRequest<PharmacyRecord[]>("/patients/pharmacies/", {
    params: { facility_id: facilityId },
  });
}
