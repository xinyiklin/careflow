import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchStaff,
  createStaff,
  updateStaff,
  deactivateStaff,
} from "../../api/facility/staff";

function getStaffQueryKey(facilityId) {
  return ["admin", "facility", facilityId || null, "staff"];
}

function getFacilityConfigQueryKey(key, facilityId) {
  return ["facilityConfig", key, facilityId || null];
}

function getAdminResourcesQueryKey(facilityId) {
  return ["admin", "facility", facilityId || null, "resources"];
}

export default function useStaff(facilityId) {
  const queryClient = useQueryClient();
  const queryKey = getStaffQueryKey(facilityId);

  const staffQuery = useQuery({
    queryKey,
    queryFn: () => fetchStaff(facilityId),
    enabled: !!facilityId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }) => {
      if (!facilityId) return null;

      if (id) {
        return updateStaff(facilityId, id, values);
      }

      return createStaff(facilityId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey("staff", facilityId),
      });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey("physicians", facilityId),
      });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey("resources", facilityId),
      });
      queryClient.invalidateQueries({
        queryKey: getAdminResourcesQueryKey(facilityId),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id) => {
      if (!facilityId) return null;
      return deactivateStaff(facilityId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey("staff", facilityId),
      });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey("physicians", facilityId),
      });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey("resources", facilityId),
      });
      queryClient.invalidateQueries({
        queryKey: getAdminResourcesQueryKey(facilityId),
      });
    },
  });

  const saveStaff = async ({ id, values }) => {
    if (!facilityId) return;
    return saveMutation.mutateAsync({ id, values });
  };

  const removeStaff = async (id) => {
    if (!facilityId) return;
    return removeMutation.mutateAsync(id);
  };

  return {
    staff: Array.isArray(staffQuery.data) ? staffQuery.data : [],
    loading: staffQuery.isLoading,
    saving: saveMutation.isPending || removeMutation.isPending,
    error:
      saveMutation.error?.message ||
      removeMutation.error?.message ||
      staffQuery.error?.message ||
      "",
    reload: staffQuery.refetch,
    saveStaff,
    removeStaff,
  };
}
