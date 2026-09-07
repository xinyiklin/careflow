import { useEffect, useRef } from "react";
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "../api/appointments";
import { useAppointmentSaveConfirmation } from "../AppointmentSaveConfirmationProvider";
import {
  AppointmentSaveCancelled,
  runAppointmentSaveAttempt,
} from "../utils/appointmentSaveAttempt";
import { optimisticAppointment } from "../utils/optimisticAppointment";
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
  const { selectedFacilityId, facility } = useFacility();
  const { beginAttempt, invalidateConfirmations } =
    useAppointmentSaveConfirmation();
  useEffect(() => () => invalidateConfirmations(), [invalidateConfirmations]);
  type Attempt = ReturnType<typeof beginAttempt> & {
    facilityId: typeof selectedFacilityId;
    timeZone: string;
    id?: EntityId | null;
    data: ApiPayload;
    previousQueries?: [QueryKey, AppointmentLike[] | undefined][];
    restored?: boolean;
  };
  const attempts = useRef(new WeakMap<AppointmentMutationPayload, Attempt>());
  const prepareAttempt = (variables: AppointmentMutationPayload) => {
    const attempt: Attempt = {
      ...beginAttempt(),
      facilityId: selectedFacilityId,
      timeZone: facility?.timezone || "",
      id: variables.id,
      data: structuredClone(variables.data),
    };
    attempts.current.set(variables, attempt);
    return attempt;
  };
  const restoreMove = (attempt?: Attempt) => {
    if (!attempt || attempt.restored || !attempt.isCurrent()) return;
    attempt.previousQueries?.forEach(([queryKey, queryData]) => {
      queryClient.setQueryData(queryKey, queryData);
    });
    attempt.restored = true;
  };
  const executeAttempt = (
    variables: AppointmentMutationPayload,
    isMove = false
  ) => {
    const attempt = attempts.current.get(variables);
    if (!attempt) throw new AppointmentSaveCancelled();
    return runAppointmentSaveAttempt({
      ...attempt,
      sameDayAlreadyAllowed: attempt.data.allow_same_day_double_book === true,
      send: (data) =>
        attempt.id
          ? updateAppointment(attempt.facilityId, attempt.id, data)
          : createAppointment(attempt.facilityId, data),
      beforeConfirmation: isMove ? () => restoreMove(attempt) : undefined,
    });
  };

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
    retry: false,
    mutationFn: (variables: AppointmentMutationPayload) =>
      executeAttempt(variables),
    onMutate: (variables: AppointmentMutationPayload) =>
      prepareAttempt(variables),
    onSuccess: async (_result, _variables, attempt) => {
      await invalidateAppointmentViews();
      if (!attempt?.isCurrent()) return;
      onCloseModal();
      setError("");
    },
    onError: (err, _variables, attempt) => {
      if (!(err instanceof AppointmentSaveCancelled) && attempt?.isCurrent()) {
        setError(getErrorMessage(err, "Failed to save appointment."));
      }
    },
    onSettled: async (_result, error) => {
      if (error) await invalidateAppointmentViews();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: EntityId) => deleteAppointment(selectedFacilityId, id),
    onMutate: invalidateConfirmations,
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
    retry: false,
    mutationFn: (variables: AppointmentMutationPayload & { id: EntityId }) =>
      executeAttempt(variables, true),
    onMutate: async (
      variables: AppointmentMutationPayload & { id: EntityId }
    ) => {
      const attempt = prepareAttempt(variables);
      const { id, data } = attempt;
      await queryClient.cancelQueries({
        queryKey: ["appointments", attempt.facilityId],
      });
      if (!attempt.isCurrent()) return attempt;

      const previousQueries = queryClient.getQueriesData<AppointmentLike[]>({
        queryKey: ["appointments", attempt.facilityId],
      });

      attempt.previousQueries = previousQueries;

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

          const nextAppointment = optimisticAppointment(
            existingAppointment,
            data,
            attempt.timeZone
          );
          const nextAppointmentDate = extractAppointmentDate(
            nextAppointment.appointment_time
          );

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

      return attempt;
    },
    onSuccess: async (_result, _variables, attempt) => {
      if (attempt?.isCurrent()) setError("");
    },
    onError: (err, _variables, context) => {
      restoreMove(context);

      if (!(err instanceof AppointmentSaveCancelled) && context?.isCurrent()) {
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
