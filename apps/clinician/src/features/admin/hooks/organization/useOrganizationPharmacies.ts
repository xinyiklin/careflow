import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrganizationPharmacy,
  fetchOrganizationPharmacyDirectory,
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
  const directoryQuery = useQuery({
    queryKey: [...ORGANIZATION_PHARMACIES_QUERY_KEY, "directory"],
    queryFn: fetchOrganizationPharmacyDirectory,
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
    directoryPharmacies: Array.isArray(directoryQuery.data)
      ? directoryQuery.data
      : [],
    loading: pharmaciesQuery.isLoading || directoryQuery.isLoading,
    error:
      saveMutation.error?.message ||
      pharmaciesQuery.error?.message ||
      directoryQuery.error?.message ||
      "",
    loadError:
      pharmaciesQuery.error?.message || directoryQuery.error?.message || "",
    reload: () => {
      void pharmaciesQuery.refetch();
      void directoryQuery.refetch();
    },
    saving: saveMutation.isPending,
    savePharmacyPreference: (payload: SavePharmacyPreferencePayload) =>
      saveMutation.mutateAsync(payload),
  };
}
