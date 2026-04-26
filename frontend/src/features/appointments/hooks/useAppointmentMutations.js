import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../api/appointments";
import useFacility from "../../facilities/hooks/useFacility";
import { getErrorMessage } from "../../../shared/utils/errors";

function extractAppointmentDate(value) {
  if (!value || typeof value !== "string") return "";
  return value.slice(0, 10);
}

function isDateWithinRange(date, queryDate, queryDateTo) {
  if (!date || !queryDate) return false;
  const endDate = queryDateTo || queryDate;
  return date >= queryDate && date <= endDate;
}

export default function useAppointmentMutations({ onCloseModal, setError }) {
  const queryClient = useQueryClient();
  const { selectedFacilityId } = useFacility();

  const invalidateAppointments = async () => {
    await queryClient.invalidateQueries({ queryKey: ["appointments"] });
  };

  const getDuplicateDayAppointmentError = (err) =>
    err?.data?.duplicate_day_appointment ?? null;

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      id
        ? updateAppointment(selectedFacilityId, id, data)
        : createAppointment(selectedFacilityId, data),
    onSuccess: async () => {
      await invalidateAppointments();
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
    mutationFn: (id) => deleteAppointment(selectedFacilityId, id),
    onSuccess: async () => {
      await invalidateAppointments();
      onCloseModal();
      setError("");
    },
    onError: (err) => {
      setError(getErrorMessage(err, "Failed to delete appointment."));
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, data }) =>
      updateAppointment(selectedFacilityId, id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({
        queryKey: ["appointments", selectedFacilityId],
      });

      const previousQueries = queryClient.getQueriesData({
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
      await invalidateAppointments();
    },
  });

  return {
    saveMutation,
    deleteMutation,
    moveMutation,
    getDuplicateDayAppointmentError,
  };
}
