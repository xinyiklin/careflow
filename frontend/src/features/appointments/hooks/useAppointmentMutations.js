import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../api/scheduler";

export default function useAppointmentMutations({ onCloseModal, setError }) {
  const queryClient = useQueryClient();

  const invalidateAppointments = async () => {
    await queryClient.invalidateQueries({ queryKey: ["appointments"] });
  };

  const getDuplicateDayAppointmentError = (err) =>
    err?.data?.duplicate_day_appointment ?? null;

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => {
      return id ? updateAppointment(id, data) : createAppointment(data);
    },
    onSuccess: async () => {
      await invalidateAppointments();
      onCloseModal();
      setError("");
    },
    onError: (err) => {
      console.error(err);

      if (!getDuplicateDayAppointmentError(err)) {
        setError("Failed to save appointment.");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: async () => {
      await invalidateAppointments();
      onCloseModal();
      setError("");
    },
    onError: (err) => {
      console.error(err);
      setError("Failed to delete appointment.");
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, data }) => updateAppointment(id, data),
    onSuccess: async () => {
      await invalidateAppointments();
      setError("");
    },
    onError: (err) => {
      console.error(err);
      setError("Failed to move appointment.");
    },
  });

  return {
    saveMutation,
    deleteMutation,
    moveMutation,
    getDuplicateDayAppointmentError,
  };
}
