import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../api/appointments";
import useFacility from "../../facilities/hooks/useFacility";
import { getErrorMessage } from "../../../shared/utils/errors";

import type { ApiPayload, EntityId } from "../../../shared/api/types";
import type { ApiRecord, AppointmentLike } from "../../../shared/types/domain";

type AppointmentMutationPayload = {
  id?: EntityId | null;
  data: ApiPayload;
};

type UseAppointmentMutationsOptions = {
  onCloseModal: () => void;
  setError: (message: string) => void;
};

type DuplicateAppointmentError = {
  data?: ApiRecord | null;
};

function extractAppointmentDate(value: unknown) {
  if (!value || typeof value !== "string") return "";
  return value.slice(0, 10);
}

function isDateWithinRange(
  date: string,
  queryDate: unknown,
  queryDateTo: unknown
) {
  if (!date || typeof queryDate !== "string") return false;
  const endDate = typeof queryDateTo === "string" ? queryDateTo : queryDate;
  return date >= queryDate && date <= endDate;
}

export default function useAppointmentMutations({
  onCloseModal,
  setError,
}: UseAppointmentMutationsOptions) {
  const queryClient = useQueryClient();
  const { selectedFacilityId } = useFacility();

  const invalidateAppointmentViews = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      queryClient.invalidateQueries({ queryKey: ["appointmentHeatmap"] }),
    ]);
  };

  const getDuplicateDayAppointmentError = (err: unknown) =>
    (err as DuplicateAppointmentError | null)?.data
      ?.duplicate_day_appointment ?? null;

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: AppointmentMutationPayload) =>
      id
        ? updateAppointment(selectedFacilityId, id, data)
        : createAppointment(selectedFacilityId, data),
    onSuccess: async () => {
      await invalidateAppointmentViews();
      onCloseModal();
      setError("");
    },
    onError: (err) => {
      if (!getDuplicateDayAppointmentError(err)) {
        setError(getErrorMessage(err, "Failed to save appointment."));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: EntityId) => deleteAppointment(selectedFacilityId, id),
    onSuccess: async () => {
      await invalidateAppointmentViews();
      onCloseModal();
      setError("");
    },
    onError: (err) => {
      setError(getErrorMessage(err, "Failed to delete appointment."));
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, data }: AppointmentMutationPayload & { id: EntityId }) =>
      updateAppointment(selectedFacilityId, id, data),
    onMutate: async ({
      id,
      data,
    }: AppointmentMutationPayload & { id: EntityId }) => {
      await queryClient.cancelQueries({
        queryKey: ["appointments", selectedFacilityId],
      });

      const previousQueries = queryClient.getQueriesData<AppointmentLike[]>({
        queryKey: ["appointments", selectedFacilityId],
      });

      const nextAppointmentDate = extractAppointmentDate(
        data?.appointment_time
      );

      previousQueries.forEach(([queryKey, queryData]) => {
        if (!Array.isArray(queryData)) return;

        const [, , queryDate, queryDateTo] = queryKey;

        queryClient.setQueryData(queryKey, () => {
          const existingAppointment = queryData.find(
            (appointment) => appointment.id === id
          );

          if (!existingAppointment) {
            return queryData;
          }

          const nextAppointment = {
            ...existingAppointment,
            ...data,
            id,
          };

          const shouldRemainInQuery = isDateWithinRange(
            nextAppointmentDate,
            queryDate,
            queryDateTo
          );

          if (!shouldRemainInQuery) {
            return queryData.filter((appointment) => appointment.id !== id);
          }

          return queryData.map((appointment) =>
            appointment.id === id ? nextAppointment : appointment
          );
        });
      });

      return { previousQueries };
    },
    onSuccess: async () => {
      setError("");
    },
    onError: (err, _variables, context) => {
      context?.previousQueries?.forEach(([queryKey, queryData]) => {
        queryClient.setQueryData(queryKey, queryData);
      });

      if (!getDuplicateDayAppointmentError(err)) {
        setError(getErrorMessage(err, "Failed to move appointment."));
      }
    },
    onSettled: async () => {
      await invalidateAppointmentViews();
    },
  });

  return {
    saveMutation,
    deleteMutation,
    moveMutation,
    getDuplicateDayAppointmentError,
  };
}
