import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createFacilityPharmacyOverride,
  fetchFacilityPharmacyOverrides,
  updateFacilityPharmacyOverride,
} from "../../api/facility/catalogs";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SavePharmacyOverridePayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

function getQueryKey(facilityId: EntityId | null | undefined) {
  return ["admin", "facility", facilityId || null, "catalogs", "pharmacies"];
}

export default function useFacilityPharmacyCatalogs(
  facilityId: EntityId | null | undefined
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(facilityId);

  const pharmaciesQuery = useQuery({
    queryKey: getQueryKey(facilityId),
    queryFn: () => fetchFacilityPharmacyOverrides(facilityId),
    enabled,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getQueryKey(facilityId),
    });
    queryClient.invalidateQueries({
      queryKey: ["facilityConfig", "pharmacies"],
    });
  };

  const pharmacyMutation = useMutation({
    mutationFn: ({ id, values }: SavePharmacyOverridePayload) => {
      if (!facilityId) return Promise.resolve(null);
      if (id) return updateFacilityPharmacyOverride(facilityId, id, values);
      return createFacilityPharmacyOverride(facilityId, values);
    },
    onSuccess: invalidate,
  });

  return {
    pharmacyOverrides: Array.isArray(pharmaciesQuery.data)
      ? pharmaciesQuery.data
      : [],
    loading: pharmaciesQuery.isLoading,
    saving: pharmacyMutation.isPending,
    error:
      pharmacyMutation.error?.message || pharmaciesQuery.error?.message || "",
    loadError: pharmaciesQuery.error?.message || "",
    reload: () => {
      void pharmaciesQuery.refetch();
    },
    savePharmacyOverride: (payload: SavePharmacyOverridePayload) =>
      pharmacyMutation.mutateAsync(payload),
  };
}
