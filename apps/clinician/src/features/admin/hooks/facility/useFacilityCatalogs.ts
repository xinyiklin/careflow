import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";

import {
  createFacilityFeeScheduleOverride,
  createFacilityPayerOverride,
  createFacilityPharmacyOverride,
  fetchFacilityFeeSchedule,
  fetchFacilityFeeScheduleOverrides,
  fetchFacilityPayerOverrides,
  fetchFacilityPharmacyOverrides,
  updateFacilityFeeScheduleOverride,
  updateFacilityPayerOverride,
  updateFacilityPharmacyOverride,
} from "../../api/facility/catalogs";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SaveCatalogOverridePayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

function getQueryKey(facilityId: EntityId | null | undefined, name: string) {
  return ["admin", "facility", facilityId || null, "catalogs", name];
}

export default function useFacilityCatalogs(
  facilityId: EntityId | null | undefined
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(facilityId);

  const [payersQuery, pharmaciesQuery, feeScheduleQuery, feeOverridesQuery] =
    useQueries({
      queries: [
        {
          queryKey: getQueryKey(facilityId, "payers"),
          queryFn: () => fetchFacilityPayerOverrides(facilityId),
          enabled,
        },
        {
          queryKey: getQueryKey(facilityId, "pharmacies"),
          queryFn: () => fetchFacilityPharmacyOverrides(facilityId),
          enabled,
        },
        {
          queryKey: getQueryKey(facilityId, "fee-schedule"),
          queryFn: () => fetchFacilityFeeSchedule(facilityId),
          enabled,
        },
        {
          queryKey: getQueryKey(facilityId, "fee-overrides"),
          queryFn: () => fetchFacilityFeeScheduleOverrides(facilityId),
          enabled,
        },
      ],
    });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin", "facility", facilityId || null, "catalogs"],
    });
    queryClient.invalidateQueries({ queryKey: ["billing", "feeSchedule"] });
    queryClient.invalidateQueries({ queryKey: ["insurance", "carriers"] });
    queryClient.invalidateQueries({
      queryKey: ["facilityConfig", "pharmacies"],
    });
  };

  const payerMutation = useMutation({
    mutationFn: ({ id, values }: SaveCatalogOverridePayload) => {
      if (!facilityId) return Promise.resolve(null);
      if (id) return updateFacilityPayerOverride(facilityId, id, values);
      return createFacilityPayerOverride(facilityId, values);
    },
    onSuccess: invalidate,
  });

  const pharmacyMutation = useMutation({
    mutationFn: ({ id, values }: SaveCatalogOverridePayload) => {
      if (!facilityId) return Promise.resolve(null);
      if (id) return updateFacilityPharmacyOverride(facilityId, id, values);
      return createFacilityPharmacyOverride(facilityId, values);
    },
    onSuccess: invalidate,
  });

  const feeMutation = useMutation({
    mutationFn: ({ id, values }: SaveCatalogOverridePayload) => {
      if (!facilityId) return Promise.resolve(null);
      if (id) return updateFacilityFeeScheduleOverride(facilityId, id, values);
      return createFacilityFeeScheduleOverride(facilityId, values);
    },
    onSuccess: invalidate,
  });

  return {
    payerOverrides: Array.isArray(payersQuery.data) ? payersQuery.data : [],
    pharmacyOverrides: Array.isArray(pharmaciesQuery.data)
      ? pharmaciesQuery.data
      : [],
    feeScheduleItems: Array.isArray(feeScheduleQuery.data)
      ? feeScheduleQuery.data
      : [],
    feeScheduleOverrides: Array.isArray(feeOverridesQuery.data)
      ? feeOverridesQuery.data
      : [],
    loading:
      payersQuery.isLoading ||
      pharmaciesQuery.isLoading ||
      feeScheduleQuery.isLoading ||
      feeOverridesQuery.isLoading,
    saving:
      payerMutation.isPending ||
      pharmacyMutation.isPending ||
      feeMutation.isPending,
    error:
      payerMutation.error?.message ||
      pharmacyMutation.error?.message ||
      feeMutation.error?.message ||
      payersQuery.error?.message ||
      pharmaciesQuery.error?.message ||
      feeScheduleQuery.error?.message ||
      feeOverridesQuery.error?.message ||
      "",
    loadError:
      payersQuery.error?.message ||
      pharmaciesQuery.error?.message ||
      feeScheduleQuery.error?.message ||
      feeOverridesQuery.error?.message ||
      "",
    reload: () => {
      void payersQuery.refetch();
      void pharmaciesQuery.refetch();
      void feeScheduleQuery.refetch();
      void feeOverridesQuery.refetch();
    },
    savePayerOverride: (payload: SaveCatalogOverridePayload) =>
      payerMutation.mutateAsync(payload),
    savePharmacyOverride: (payload: SaveCatalogOverridePayload) =>
      pharmacyMutation.mutateAsync(payload),
    saveFeeScheduleOverride: (payload: SaveCatalogOverridePayload) =>
      feeMutation.mutateAsync(payload),
  };
}
