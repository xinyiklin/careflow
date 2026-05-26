import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createFacilityPayerOverride,
  fetchFacilityPayerOverrides,
  updateFacilityPayerOverride,
} from "../../api/facility/catalogs";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SavePayerOverridePayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

function getQueryKey(facilityId: EntityId | null | undefined) {
  return ["admin", "facility", facilityId || null, "catalogs", "payers"];
}

export default function useFacilityPayerCatalogs(
  facilityId: EntityId | null | undefined
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(facilityId);

  const payersQuery = useQuery({
    queryKey: getQueryKey(facilityId),
    queryFn: () => fetchFacilityPayerOverrides(facilityId),
    enabled,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getQueryKey(facilityId),
    });
    queryClient.invalidateQueries({ queryKey: ["insurance", "carriers"] });
  };

  const payerMutation = useMutation({
    mutationFn: ({ id, values }: SavePayerOverridePayload) => {
      if (!facilityId) return Promise.resolve(null);
      if (id) return updateFacilityPayerOverride(facilityId, id, values);
      return createFacilityPayerOverride(facilityId, values);
    },
    onSuccess: invalidate,
  });

  return {
    payerOverrides: Array.isArray(payersQuery.data) ? payersQuery.data : [],
    loading: payersQuery.isLoading,
    saving: payerMutation.isPending,
    error: payerMutation.error?.message || payersQuery.error?.message || "",
    loadError: payersQuery.error?.message || "",
    reload: () => {
      void payersQuery.refetch();
    },
    savePayerOverride: (payload: SavePayerOverridePayload) =>
      payerMutation.mutateAsync(payload),
  };
}
