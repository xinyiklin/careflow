import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  copyOrgScheduleToFacility,
  fetchFacilityFeeScheduleItems,
  fetchFacilityFeeSchedules,
  populateFacilityFeeSchedule,
  updateFacilityFeeSchedule,
  updateFacilityFeeScheduleItem,
} from "../../api/facility/catalogs";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SavePayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

function getQueryKey(facilityId: EntityId | null | undefined, name: string) {
  return ["admin", "facility", facilityId || null, "fee-schedules", name];
}

export default function useFacilityFeeSchedule(
  facilityId: EntityId | null | undefined
) {
  const queryClient = useQueryClient();
  const enabled = Boolean(facilityId);

  const schedulesQuery = useQuery({
    queryKey: getQueryKey(facilityId, "sheets"),
    queryFn: () => fetchFacilityFeeSchedules(facilityId),
    enabled,
  });

  const itemsQuery = useQuery({
    queryKey: getQueryKey(facilityId, "items"),
    queryFn: () => fetchFacilityFeeScheduleItems(facilityId),
    enabled,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin", "facility", facilityId || null, "fee-schedules"],
    });
    queryClient.invalidateQueries({
      queryKey: ["admin", "facility", facilityId || null, "catalogs"],
    });
    queryClient.invalidateQueries({ queryKey: ["billing", "feeSchedule"] });
  };

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, values }: SavePayload) => {
      if (!facilityId || !id) return Promise.resolve(null);
      return updateFacilityFeeSchedule(facilityId, id, values);
    },
    onSuccess: invalidateAll,
  });

  const copyFromOrgMutation = useMutation({
    mutationFn: (sourceScheduleId: EntityId) => {
      if (!facilityId) return Promise.resolve(null);
      return copyOrgScheduleToFacility(facilityId, sourceScheduleId);
    },
    onSuccess: invalidateAll,
  });

  const populateMutation = useMutation({
    mutationFn: (scheduleId: EntityId) => {
      if (!facilityId) return Promise.resolve(null);
      return populateFacilityFeeSchedule(facilityId, scheduleId);
    },
    onSuccess: invalidateAll,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, values }: SavePayload) => {
      if (!facilityId || !id) return Promise.resolve(null);
      return updateFacilityFeeScheduleItem(facilityId, id, values);
    },
    onSuccess: invalidateAll,
  });

  return {
    schedules: Array.isArray(schedulesQuery.data) ? schedulesQuery.data : [],
    items: Array.isArray(itemsQuery.data) ? itemsQuery.data : [],
    loading: schedulesQuery.isLoading || itemsQuery.isLoading,
    saving:
      updateScheduleMutation.isPending ||
      copyFromOrgMutation.isPending ||
      populateMutation.isPending ||
      updateItemMutation.isPending,
    error:
      updateScheduleMutation.error?.message ||
      copyFromOrgMutation.error?.message ||
      populateMutation.error?.message ||
      updateItemMutation.error?.message ||
      schedulesQuery.error?.message ||
      itemsQuery.error?.message ||
      "",
    loadError: schedulesQuery.error?.message || itemsQuery.error?.message || "",
    reload: async () => {
      await Promise.all([schedulesQuery.refetch(), itemsQuery.refetch()]);
    },
    saveSchedule: (payload: SavePayload) =>
      updateScheduleMutation.mutateAsync(payload),
    saveItem: (payload: SavePayload) => updateItemMutation.mutateAsync(payload),
    copyFromOrg: (sourceScheduleId: EntityId) =>
      copyFromOrgMutation.mutateAsync(sourceScheduleId),
    populateFromCatalog: (scheduleId: EntityId) =>
      populateMutation.mutateAsync(scheduleId),
  };
}
