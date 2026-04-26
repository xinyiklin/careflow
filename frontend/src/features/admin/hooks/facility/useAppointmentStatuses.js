import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAppointmentStatuses,
  createAppointmentStatus,
  updateAppointmentStatus,
  deleteAppointmentStatus,
} from "../../api/facility/appointmentStatuses";

function getAppointmentStatusesQueryKey(facilityId) {
  return ["admin", "facility", facilityId || null, "appointment-statuses"];
}

function getFacilityConfigQueryKey(facilityId) {
  return ["facilityConfig", "appointmentStatuses", facilityId || null];
}

export default function useAppointmentStatuses(facilityId) {
  const queryClient = useQueryClient();
  const queryKey = getAppointmentStatusesQueryKey(facilityId);

  const statusesQuery = useQuery({
    queryKey,
    queryFn: () => fetchAppointmentStatuses(facilityId),
    enabled: !!facilityId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }) => {
      if (!facilityId) return null;

      if (id) {
        return updateAppointmentStatus(facilityId, id, values);
      }

      return createAppointmentStatus(facilityId, values);
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
      return deleteAppointmentStatus(facilityId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey(facilityId),
      });
    },
  });

  const saveStatus = async ({ id, values }) => {
    if (!facilityId) return;
    return saveMutation.mutateAsync({ id, values });
  };

  const removeStatus = async (id) => {
    if (!facilityId) return;
    return removeMutation.mutateAsync(id);
  };

  return {
    statuses: Array.isArray(statusesQuery.data) ? statusesQuery.data : [],
    loading: statusesQuery.isLoading,
    saving: saveMutation.isPending || removeMutation.isPending,
    error:
      saveMutation.error?.message ||
      removeMutation.error?.message ||
      statusesQuery.error?.message ||
      "",
    reload: statusesQuery.refetch,
    saveStatus,
    removeStatus,
  };
}
