import { useQuery } from "@tanstack/react-query";
import { fetchAppointments } from "../api/appointments";

export default function useAppointments({ facilityId, date, dateTo }) {
  const appointmentsQuery = useQuery({
    queryKey: ["appointments", facilityId, date, dateTo || null],
    queryFn: () =>
      fetchAppointments({
        facilityId,
        date,
        dateTo,
      }),
    enabled: !!facilityId && !!date,
    placeholderData: (previousData) => previousData,
  });

  return {
    appointments: appointmentsQuery.data || [],
    loading: appointmentsQuery.isLoading,
    error: appointmentsQuery.error?.message || "",
    reload: appointmentsQuery.refetch,
  };
}
