import { useQuery } from "@tanstack/react-query";

import { fetchAppointmentHeatmap } from "../../appointments/api/appointments";

export default function useScheduleHeatmap({ facilityId, month }) {
  const heatmapQuery = useQuery({
    queryKey: ["appointmentHeatmap", facilityId, month],
    queryFn: () => fetchAppointmentHeatmap({ facilityId, month }),
    enabled: !!facilityId && !!month,
    staleTime: 60_000,
  });

  return {
    counts: heatmapQuery.data?.counts || {},
    loading: heatmapQuery.isLoading,
    error: heatmapQuery.error?.message || "",
  };
}
