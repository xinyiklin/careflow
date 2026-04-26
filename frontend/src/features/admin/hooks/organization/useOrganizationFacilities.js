import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrganizationFacilities,
  createOrganizationFacility,
  updateOrganizationFacility,
  deactivateOrganizationFacility,
} from "../../api/organization/facilities";

const ORGANIZATION_FACILITIES_QUERY_KEY = [
  "admin",
  "organization",
  "facilities",
];

export default function useOrganizationFacilities() {
  const queryClient = useQueryClient();

  const facilitiesQuery = useQuery({
    queryKey: ORGANIZATION_FACILITIES_QUERY_KEY,
    queryFn: fetchOrganizationFacilities,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }) => {
      if (id) {
        return updateOrganizationFacility(id, values);
      }
      return createOrganizationFacility(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_FACILITIES_QUERY_KEY,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: deactivateOrganizationFacility,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ORGANIZATION_FACILITIES_QUERY_KEY,
      });
    },
  });

  return {
    facilities: Array.isArray(facilitiesQuery.data) ? facilitiesQuery.data : [],
    loading: facilitiesQuery.isLoading,
    error: facilitiesQuery.error?.message || "",
    reload: facilitiesQuery.refetch,
    saving: saveMutation.isPending || removeMutation.isPending,
    saveFacility: ({ id, values }) => saveMutation.mutateAsync({ id, values }),
    removeFacility: (id) => removeMutation.mutateAsync(id),
  };
}
