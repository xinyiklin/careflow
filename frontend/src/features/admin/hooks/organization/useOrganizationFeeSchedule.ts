import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrganizationFeeSchedule,
  createOrganizationFeeScheduleItem,
  fetchOrganizationFeeSchedule,
  fetchOrganizationFeeSchedules,
  populateFeeScheduleFromCatalog,
  updateOrganizationFeeSchedule,
  updateOrganizationFeeScheduleItem,
} from "../../api/organization/feeSchedule";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SaveOrganizationFeeSchedulePayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

type SaveOrganizationFeeScheduleSheetPayload =
  SaveOrganizationFeeSchedulePayload;

const ORGANIZATION_FEE_SCHEDULE_QUERY_KEY = [
  "admin",
  "organization",
  "fee-schedule",
];
const ORGANIZATION_FEE_SCHEDULE_SHEETS_QUERY_KEY = [
  "admin",
  "organization",
  "fee-schedule-sheets",
];

export default function useOrganizationFeeSchedule() {
  const queryClient = useQueryClient();

  const feeScheduleQuery = useQuery({
    queryKey: ORGANIZATION_FEE_SCHEDULE_QUERY_KEY,
    queryFn: fetchOrganizationFeeSchedule,
  });

  const sheetsQuery = useQuery({
    queryKey: ORGANIZATION_FEE_SCHEDULE_SHEETS_QUERY_KEY,
    queryFn: fetchOrganizationFeeSchedules,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ORGANIZATION_FEE_SCHEDULE_SHEETS_QUERY_KEY,
    });
    queryClient.invalidateQueries({
      queryKey: ORGANIZATION_FEE_SCHEDULE_QUERY_KEY,
    });
    queryClient.invalidateQueries({ queryKey: ["billing", "feeSchedule"] });
  };

  const saveSheetMutation = useMutation({
    mutationFn: ({ id, values }: SaveOrganizationFeeScheduleSheetPayload) => {
      if (id) return updateOrganizationFeeSchedule(id, values);
      return createOrganizationFeeSchedule(values);
    },
    onSuccess: invalidateAll,
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: SaveOrganizationFeeSchedulePayload) => {
      if (id) return updateOrganizationFeeScheduleItem(id, values);
      return createOrganizationFeeScheduleItem(values);
    },
    onSuccess: invalidateAll,
  });

  const populateMutation = useMutation({
    mutationFn: (scheduleId: EntityId) =>
      populateFeeScheduleFromCatalog(scheduleId),
    onSuccess: invalidateAll,
  });

  return {
    schedules: Array.isArray(sheetsQuery.data) ? sheetsQuery.data : [],
    items: Array.isArray(feeScheduleQuery.data) ? feeScheduleQuery.data : [],
    loading: feeScheduleQuery.isLoading || sheetsQuery.isLoading,
    saving:
      saveMutation.isPending ||
      saveSheetMutation.isPending ||
      populateMutation.isPending,
    error:
      saveMutation.error?.message ||
      saveSheetMutation.error?.message ||
      populateMutation.error?.message ||
      feeScheduleQuery.error?.message ||
      sheetsQuery.error?.message ||
      "",
    loadError:
      feeScheduleQuery.error?.message || sheetsQuery.error?.message || "",
    reload: async () => {
      await Promise.all([feeScheduleQuery.refetch(), sheetsQuery.refetch()]);
    },
    saveSchedule: (payload: SaveOrganizationFeeScheduleSheetPayload) =>
      saveSheetMutation.mutateAsync(payload),
    saveItem: (payload: SaveOrganizationFeeSchedulePayload) =>
      saveMutation.mutateAsync(payload),
    populateFromCatalog: (scheduleId: EntityId) =>
      populateMutation.mutateAsync(scheduleId),
  };
}
