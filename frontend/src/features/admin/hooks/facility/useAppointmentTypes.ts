import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAppointmentTypes,
  createAppointmentType,
  updateAppointmentType,
  deleteAppointmentType,
} from "../../api/facility/appointmentTypes";

import type { ApiPayload, EntityId } from "../../../../shared/api/types";

type SaveAppointmentTypePayload = {
  id?: EntityId | null;
  values: ApiPayload;
};

function getAppointmentTypesQueryKey(facilityId: EntityId | null | undefined) {
  return ["admin", "facility", facilityId || null, "appointment-types"];
}

function getFacilityConfigQueryKey(facilityId: EntityId | null | undefined) {
  return ["facilityConfig", "appointmentTypes", facilityId || null];
}

export default function useAppointmentTypes(
  facilityId: EntityId | null | undefined
) {
  const queryClient = useQueryClient();
  const queryKey = getAppointmentTypesQueryKey(facilityId);

  const appointmentTypesQuery = useQuery({
    queryKey,
    queryFn: () => fetchAppointmentTypes(facilityId),
    enabled: !!facilityId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, values }: SaveAppointmentTypePayload) => {
      if (!facilityId) return null;

      if (id) {
        return updateAppointmentType(facilityId, id, values);
      }

      return createAppointmentType(facilityId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey(facilityId),
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: EntityId) => {
      if (!facilityId) return null;
      return deleteAppointmentType(facilityId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({
        queryKey: getFacilityConfigQueryKey(facilityId),
      });
    },
  });

  const saveAppointmentType = async ({
    id,
    values,
  }: SaveAppointmentTypePayload) => {
    if (!facilityId) return;
    return saveMutation.mutateAsync({ id, values });
  };

  const removeAppointmentType = async (id: EntityId) => {
    if (!facilityId) return;
    return removeMutation.mutateAsync(id);
  };

  return {
    appointmentTypes: Array.isArray(appointmentTypesQuery.data)
      ? appointmentTypesQuery.data
      : [],
    loading: appointmentTypesQuery.isLoading,
    saving: saveMutation.isPending || removeMutation.isPending,
    error:
      saveMutation.error?.message ||
      removeMutation.error?.message ||
      appointmentTypesQuery.error?.message ||
      "",
    loadError: appointmentTypesQuery.error?.message || "",
    reload: appointmentTypesQuery.refetch,
    saveAppointmentType,
    removeAppointmentType,
  };
}
