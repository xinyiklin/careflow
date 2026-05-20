import { useQuery } from "@tanstack/react-query";

import { fetchAppointmentHeatmap } from "../../appointments/api/appointments";

import type { ApiParamValue, EntityId } from "../../../shared/api/types";

type UseScheduleHeatmapOptions = {
  facilityId?: EntityId | null;
  month?: ApiParamValue;
};

export default function useScheduleHeatmap({
  facilityId,
  month,
}: UseScheduleHeatmapOptions) {
  const heatmapQuery = useQuery({
    queryKey: ["appointmentHeatmap", facilityId, month],
    queryFn: () => fetchAppointmentHeatmap({ facilityId, month }),
    enabled: !!facilityId && !!month,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });

  return {
    month: heatmapQuery.data?.month || "",
    counts: heatmapQuery.data?.counts || {},
    loading: heatmapQuery.isLoading,
    refreshing: heatmapQuery.isFetching && !heatmapQuery.isLoading,
    error: heatmapQuery.error?.message || "",
    reload: heatmapQuery.refetch,
  };
}
