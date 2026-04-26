import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchResources,
  createResource,
  updateResource,
  deactivateResource,
} from "../../api/facility/resources";

function getResourcesQueryKey(facilityId) {
  return ["admin", "facility", facilityId || null, "resources"];
}

function getFacilityConfigQueryKey(facilityId) {
  return ["facilityConfig", "resources", facilityId || null];
}

export default function useResources(facilityId) {
  const queryClient = useQueryClient();
  const queryKey = getResourcesQueryKey(facilityId);

  const resourcesQuery = useQuery({
    queryKey,
    queryFn: () => fetchResources(facilityId),
    enabled: !!facilityId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }) => {
      if (!facilityId) return null;

      if (id) {
        return updateResource(facilityId, id, values);
      }

      return createResource(facilityId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey(facilityId),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id) => {
      if (!facilityId) return null;
      return deactivateResource(facilityId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey(facilityId),
      });
    },
  });

  const saveResource = async ({ id, values }) => {
    if (!facilityId) return;
    return saveMutation.mutateAsync({ id, values });
  };

  const removeResource = async (id) => {
    if (!facilityId) return;
    return removeMutation.mutateAsync(id);
  };

  return {
    resources: Array.isArray(resourcesQuery.data) ? resourcesQuery.data : [],
    loading: resourcesQuery.isLoading,
    saving: saveMutation.isPending || removeMutation.isPending,
    error:
      saveMutation.error?.message ||
      removeMutation.error?.message ||
      resourcesQuery.error?.message ||
      "",
    reload: resourcesQuery.refetch,
    saveResource,
    removeResource,
  };
}
