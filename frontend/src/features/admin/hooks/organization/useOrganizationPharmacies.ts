import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrganizationPharmacy,
  fetchOrganizationPharmacies,
  updateOrganizationPharmacy,
} from "../../api/organization/pharmacies";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SavePharmacyPreferencePayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

const ORGANIZATION_PHARMACIES_QUERY_KEY = [
  "admin",
  "organization",
  "pharmacies",
];

export default function useOrganizationPharmacies() {
  const queryClient = useQueryClient();

  const pharmaciesQuery = useQuery({
    queryKey: ORGANIZATION_PHARMACIES_QUERY_KEY,
    queryFn: fetchOrganizationPharmacies,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: SavePharmacyPreferencePayload) => {
      if (id) return updateOrganizationPharmacy(id, values);
      return createOrganizationPharmacy(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_PHARMACIES_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: ["facilityConfig", "pharmacies"],
      });
    },
  });

  return {
    preferences: Array.isArray(pharmaciesQuery.data)
      ? pharmaciesQuery.data
      : [],
    loading: pharmaciesQuery.isLoading,
    error: pharmaciesQuery.error?.message || "",
    loadError: pharmaciesQuery.error?.message || "",
    reload: pharmaciesQuery.refetch,
    saving: saveMutation.isPending,
    savePharmacyPreference: (payload: SavePharmacyPreferencePayload) =>
      saveMutation.mutateAsync(payload),
  };
}
