import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchPhysicianList,
  fetchAppointmentStatuses,
  fetchAppointmentTypes,
  fetchFacilityResources,
  fetchPatientGenders,
  fetchCareProviders,
  fetchPharmacies,
  fetchStaffList,
  fetchStaffRoles,
  fetchStaffTitles,
} from "../api/facilities";

import type { UseQueryResult } from "@tanstack/react-query";
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

type FacilityConfigFetcher<TRecord> = (
  facilityId: EntityId | null | undefined
) => Promise<TRecord[] | null>;

type FacilityConfigQueryOptions<TRecord> = {
  key: string;
  facilityId: EntityId | null | undefined;
  enabled: boolean;
  fetcher: FacilityConfigFetcher<TRecord>;
};

type FacilityConfigDataOptions = {
  facilityId: EntityId | null | undefined;
  enabled?: boolean;
};

function useFacilityConfigQuery<TRecord>({
  key,
  facilityId,
  enabled,
  fetcher,
}: FacilityConfigQueryOptions<TRecord>): UseQueryResult<
  TRecord[] | null,
  Error
> {
  return useQuery({
    queryKey: ["facilityConfig", key, facilityId || null],
    queryFn: () => fetcher(facilityId),
    enabled,
  });
}

function getArray<TRecord>(data: TRecord[] | null | undefined): TRecord[] {
  return Array.isArray(data) ? data : [];
}

function getActiveRecords<TRecord extends { is_active?: boolean | null }>(
  data: TRecord[] | null | undefined
): TRecord[] {
  if (!Array.isArray(data)) return [];
  return data.filter((record) => record?.is_active !== false);
}

export default function useFacilityConfigData({
  facilityId,
  enabled = true,
}: FacilityConfigDataOptions) {
  const isEnabled = enabled && !!facilityId;

  const physicianListQuery = useFacilityConfigQuery<StaffRecord>({
    key: "physicians",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchPhysicianList,
  });

  const staffListQuery = useFacilityConfigQuery<StaffRecord>({
    key: "staff",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchStaffList,
  });

  const statusOptionsQuery = useFacilityConfigQuery<AppointmentStatusOption>({
    key: "appointmentStatuses",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchAppointmentStatuses,
  });

  const typeOptionsQuery = useFacilityConfigQuery<AppointmentTypeOption>({
    key: "appointmentTypes",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchAppointmentTypes,
  });

  const resourcesQuery = useFacilityConfigQuery<ResourceRecord>({
    key: "resources",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchFacilityResources,
  });

  const genderOptionsQuery = useFacilityConfigQuery<PatientGenderOption>({
    key: "patientGenders",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchPatientGenders,
  });

  const rolesQuery = useFacilityConfigQuery<StaffRoleRecord>({
    key: "staffRoles",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchStaffRoles,
  });

  const titlesQuery = useFacilityConfigQuery<StaffTitleRecord>({
    key: "staffTitles",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchStaffTitles,
  });

  const careProvidersQuery = useFacilityConfigQuery<CareProviderRecord>({
    key: "careProviders",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchCareProviders,
  });

  const pharmaciesQuery = useFacilityConfigQuery<PharmacyRecord>({
    key: "pharmacies",
    facilityId,
    enabled: isEnabled,
    fetcher: fetchPharmacies,
  });

  const queries = [
    physicianListQuery,
    staffListQuery,
    statusOptionsQuery,
    typeOptionsQuery,
    resourcesQuery,
    genderOptionsQuery,
    rolesQuery,
    titlesQuery,
    careProvidersQuery,
    pharmaciesQuery,
  ];

  const reload = async () => {
    await Promise.all(queries.map((query) => query.refetch()));
  };

  const physicians = useMemo(
    () => getArray(physicianListQuery.data),
    [physicianListQuery.data]
  );
  const staffs = useMemo(
    () => getArray(staffListQuery.data),
    [staffListQuery.data]
  );
  const statusOptions = useMemo(
    () => getArray(statusOptionsQuery.data),
    [statusOptionsQuery.data]
  );
  const typeOptions = useMemo(
    () => getArray(typeOptionsQuery.data),
    [typeOptionsQuery.data]
  );
  const resources = useMemo(
    () => getActiveRecords(resourcesQuery.data),
    [resourcesQuery.data]
  );
  const genderOptions = useMemo(
    () => getArray(genderOptionsQuery.data),
    [genderOptionsQuery.data]
  );
  const roles = useMemo(() => getArray(rolesQuery.data), [rolesQuery.data]);
  const titles = useMemo(() => getArray(titlesQuery.data), [titlesQuery.data]);
  const careProviders = useMemo(
    () => getActiveRecords(careProvidersQuery.data),
    [careProvidersQuery.data]
  );
  const pharmacies = useMemo(
    () => getActiveRecords(pharmaciesQuery.data),
    [pharmaciesQuery.data]
  );

  return {
    physicians,
    staffs,
    statusOptions,
    typeOptions,
    resources,
    genderOptions,
    roles,
    titles,
    careProviders,
    pharmacies,
    loading: queries.some((query) => query.isLoading),
    isLoading: queries.some((query) => query.isLoading),
    error: queries.find((query) => query.error)?.error?.message || "",
    isError: queries.some((query) => query.isError),
    reload,
  };
}
