import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { beginAppointmentEditSession } from "../../appointments/api/appointments";
import useAppointmentFlow from "../../appointments/hooks/useAppointmentFlow";
import useAppointmentMutations from "../../appointments/hooks/useAppointmentMutations";
import { ApiError } from "../../../shared/api/types";
import type { ApiPayload, EntityId } from "../../../shared/api/types";
import type { AppointmentLike } from "../../../shared/types/domain";
import type { AppointmentEditSessionActiveEditor } from "../../appointments/api/appointments";
import type { AppointmentSubmitPayload } from "../../appointments/types";
import type {
  ClinicalEncounter,
  ClinicalEncounterPayload,
  EncounterBillingRecord,
  EncounterBillingRecordPayload,
  ProgressNoteFormValues,
} from "../../billing/types";
import usePatientBilling from "../../billing/hooks/usePatientBilling";
import usePatientClinical from "./usePatientClinical";
import { buildAppointmentPatientSnapshot } from "../components/PatientHubTabPanels";
import {
  buildProgressNotePayload,
  INITIAL_CONFIRM,
  INITIAL_EDIT_BLOCKED,
  INITIAL_HISTORY_MODAL,
  INITIAL_PROGRESS_NOTE_MODAL,
  toNumberOrNull,
  type ConfirmDialogState,
  type EditBlockedDialogState,
  type HistoryModalState,
  type ProgressNoteModalState,
} from "../PatientHubContent.helpers";
import type { PatientRecord } from "../types";

type PatientClinical = ReturnType<typeof usePatientClinical>;
type PatientBilling = ReturnType<typeof usePatientBilling>;
type AppointmentFlow = ReturnType<typeof useAppointmentFlow>;

type UsePatientHubActionsArgs = {
  patient: PatientRecord | null;
  patientId?: EntityId | null;
  patientName: string;
  selectedFacilityId: EntityId | null | undefined;
  appointmentFlow: AppointmentFlow;
  patientClinical: PatientClinical;
  patientBilling: PatientBilling;
  canCreateClinical: boolean;
};

export type UsePatientHubActionsResult = {
  appointmentError: string;
  progressNoteError: string;
  billingError: string;
  progressNoteModalState: ProgressNoteModalState;
  historyModalState: HistoryModalState;
  editBlockedDialogState: EditBlockedDialogState;
  confirmDialogState: ConfirmDialogState;
  setConfirmDialogState: (value: ConfirmDialogState) => void;
  closeConfirmDialog: () => void;
  closeEditBlockedDialog: () => void;
  closeProgressNoteModal: () => void;
  closeHistoryModal: () => void;
  showEditBlockedDialog: (
    activeEditor: AppointmentEditSessionActiveEditor
  ) => void;
  handleCloseAppointmentModal: () => void;
  handleSubmitAppointment: (
    submittedData: AppointmentSubmitPayload
  ) => Promise<void>;
  handleDeleteAppointment: () => void;
  handleOpenAppointment: (appointment: AppointmentLike) => Promise<void>;
  handleScheduleEncounter: () => void;
  handleStartClinicalEncounter: (appointment?: AppointmentLike | null) => void;
  handleOpenProgressNote: (encounter: ClinicalEncounter) => void;
  handleSaveProgressNoteDraft: (
    values: ProgressNoteFormValues
  ) => Promise<void>;
  handleSignProgressNote: (values: ProgressNoteFormValues) => Promise<void>;
  handleUnsignProgressNote: () => Promise<void>;
  handleOpenAppointmentHistory: () => void;
  handleSaveBillingRecord: (
    record: EncounterBillingRecord | null,
    values: EncounterBillingRecordPayload
  ) => Promise<void>;
};

export function usePatientHubActions({
  patient,
  patientId,
  patientName,
  selectedFacilityId,
  appointmentFlow,
  patientClinical,
  patientBilling,
  canCreateClinical,
}: UsePatientHubActionsArgs): UsePatientHubActionsResult {
  const queryClient = useQueryClient();

  const [appointmentError, setAppointmentError] = useState("");
  const [progressNoteError, setProgressNoteError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [progressNoteModalState, setProgressNoteModalState] =
    useState<ProgressNoteModalState>(INITIAL_PROGRESS_NOTE_MODAL);
  const [historyModalState, setHistoryModalState] = useState<HistoryModalState>(
    INITIAL_HISTORY_MODAL
  );
  const [editBlockedDialogState, setEditBlockedDialogState] =
    useState<EditBlockedDialogState>(INITIAL_EDIT_BLOCKED);
  const [confirmDialogState, setConfirmDialogState] =
    useState<ConfirmDialogState>(INITIAL_CONFIRM);

  const invalidatePatientHubAppointments = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [
        "patientHub",
        "appointments",
        selectedFacilityId || null,
        patientId || null,
      ],
    });
  }, [patientId, queryClient, selectedFacilityId]);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialogState(INITIAL_CONFIRM);
  }, []);

  const closeEditBlockedDialog = useCallback(() => {
    setEditBlockedDialogState(INITIAL_EDIT_BLOCKED);
  }, []);

  const closeProgressNoteModal = useCallback(() => {
    setProgressNoteError("");
    setProgressNoteModalState(INITIAL_PROGRESS_NOTE_MODAL);
  }, []);

  const closeHistoryModal = useCallback(() => {
    setHistoryModalState(INITIAL_HISTORY_MODAL);
  }, []);

  const showEditBlockedDialog = useCallback(
    (activeEditor: AppointmentEditSessionActiveEditor) => {
      setEditBlockedDialogState({ isOpen: true, activeEditor });
    },
    []
  );

  const handleCloseAppointmentModal = useCallback(() => {
    setAppointmentError("");
    closeConfirmDialog();
    appointmentFlow.modal.close();
  }, [appointmentFlow.modal, closeConfirmDialog]);

  const {
    deleteMutation: deleteAppointmentMutation,
    saveMutation: saveAppointmentMutation,
    getDuplicateDayAppointmentError,
  } = useAppointmentMutations({
    onCloseModal: handleCloseAppointmentModal,
    setError: setAppointmentError,
  });

  const handleSubmitAppointment = useCallback(
    async (submittedData: AppointmentSubmitPayload) => {
      setAppointmentError("");

      const buildPayload = (overrides: ApiPayload = {}) => ({
        ...submittedData,
        patient: appointmentFlow.selectedPatient?.id || "",
        resource: submittedData.resource
          ? Number(submittedData.resource)
          : null,
        rendering_provider: submittedData.rendering_provider
          ? Number(submittedData.rendering_provider)
          : null,
        status: submittedData.status ? Number(submittedData.status) : "",
        appointment_type: submittedData.appointment_type
          ? Number(submittedData.appointment_type)
          : "",
        facility: submittedData.facility ? Number(submittedData.facility) : "",
        ...overrides,
      });

      try {
        await saveAppointmentMutation.mutateAsync({
          id: appointmentFlow.modal.editingId,
          data: buildPayload(),
        });
        await invalidatePatientHubAppointments();
      } catch (err) {
        const duplicateError = getDuplicateDayAppointmentError(err);
        if (!duplicateError) return;

        setAppointmentError("");
        setConfirmDialogState({
          isOpen: true,
          title: "Possible Double Booking",
          message:
            "This patient already has an appointment on this date. Creating another appointment may result in a double booking. Do you want to proceed anyway?",
          confirmText: "Confirm",
          cancelText: "Cancel",
          variant: "warning",
          onConfirm: async () => {
            await saveAppointmentMutation.mutateAsync({
              id: appointmentFlow.modal.editingId,
              data: buildPayload({ allow_same_day_double_book: true }),
            });
            await invalidatePatientHubAppointments();
            closeConfirmDialog();
          },
        });
      }
    },
    [
      appointmentFlow.modal.editingId,
      appointmentFlow.selectedPatient?.id,
      closeConfirmDialog,
      getDuplicateDayAppointmentError,
      invalidatePatientHubAppointments,
      saveAppointmentMutation,
    ]
  );

  const handleDeleteAppointment = useCallback(() => {
    const appointmentId = appointmentFlow.modal.editingId;
    if (!appointmentId) return;

    setConfirmDialogState({
      isOpen: true,
      title: "Delete Appointment",
      message: "Are you sure you want to delete this appointment?",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        await deleteAppointmentMutation.mutateAsync(appointmentId);
        await invalidatePatientHubAppointments();
        closeConfirmDialog();
      },
    });
  }, [
    appointmentFlow.modal.editingId,
    closeConfirmDialog,
    deleteAppointmentMutation,
    invalidatePatientHubAppointments,
  ]);

  const handleOpenAppointment = useCallback(
    async (appointment: AppointmentLike) => {
      if (!appointment?.id || !selectedFacilityId) return;

      setAppointmentError("");

      try {
        const result = await beginAppointmentEditSession(
          selectedFacilityId,
          appointment.id
        );

        if (result?.status === "occupied") {
          showEditBlockedDialog(result.active_editor ?? null);
          return;
        }

        appointmentFlow.modal.openEdit(appointment);
      } catch {
        setAppointmentError("Appointment could not be opened. Try again.");
      }
    },
    [appointmentFlow.modal, selectedFacilityId, showEditBlockedDialog]
  );

  const handleScheduleEncounter = useCallback(() => {
    if (!patient) return;
    appointmentFlow.modal.openCreate();
    appointmentFlow.setSelectedPatient(
      buildAppointmentPatientSnapshot(patient)
    );
  }, [appointmentFlow, patient]);

  const handleStartClinicalEncounter = useCallback(
    (appointment: AppointmentLike | null = null) => {
      if (!canCreateClinical) return;

      setProgressNoteError("");
      setProgressNoteModalState({
        isOpen: true,
        encounter: null,
        appointment,
      });
    },
    [canCreateClinical]
  );

  const handleOpenProgressNote = useCallback((encounter: ClinicalEncounter) => {
    setProgressNoteError("");
    setProgressNoteModalState({
      isOpen: true,
      encounter,
      appointment: null,
    });
  }, []);

  const persistProgressNoteDraft = useCallback(
    async (values: ProgressNoteFormValues) => {
      const notePayload = buildProgressNotePayload(values);
      const encounter = progressNoteModalState.encounter;
      const encounterPayload = {
        reason: values.reason.trim(),
        rendering_provider: toNumberOrNull(values.rendering_provider),
      };

      if (encounter?.id) {
        await patientClinical.updateEncounterMutation.mutateAsync({
          encounterId: encounter.id,
          values: encounterPayload,
        });

        const noteId = encounter.progress_note?.id;
        if (!noteId) return null;

        await patientClinical.updateProgressNoteMutation.mutateAsync({
          noteId,
          values: notePayload,
        });
        return noteId;
      }

      if (!patientId) return null;

      const createdEncounter =
        await patientClinical.createEncounterMutation.mutateAsync({
          patient: Number(patientId),
          appointment: toNumberOrNull(progressNoteModalState.appointment?.id),
          rendering_provider: toNumberOrNull(values.rendering_provider),
          reason: values.reason.trim(),
          progress_note: notePayload,
        } satisfies ClinicalEncounterPayload);

      return createdEncounter?.progress_note?.id || null;
    },
    [
      patientClinical.createEncounterMutation,
      patientClinical.updateEncounterMutation,
      patientClinical.updateProgressNoteMutation,
      patientId,
      progressNoteModalState.appointment?.id,
      progressNoteModalState.encounter,
    ]
  );

  const handleSaveProgressNoteDraft = useCallback(
    async (values: ProgressNoteFormValues) => {
      setProgressNoteError("");
      try {
        await persistProgressNoteDraft(values);
        closeProgressNoteModal();
      } catch {
        setProgressNoteError("Progress note could not be saved. Try again.");
      }
    },
    [closeProgressNoteModal, persistProgressNoteDraft]
  );

  const handleSignProgressNote = useCallback(
    async (values: ProgressNoteFormValues) => {
      setProgressNoteError("");
      try {
        const noteId = await persistProgressNoteDraft(values);
        if (!noteId) {
          setProgressNoteError("Progress note could not be signed. Try again.");
          return;
        }
        await patientClinical.signProgressNoteMutation.mutateAsync(noteId);
        closeProgressNoteModal();
      } catch (err) {
        const message =
          err instanceof ApiError && err.message
            ? err.message
            : "Progress note could not be signed. Try again.";
        setProgressNoteError(message);
      }
    },
    [
      closeProgressNoteModal,
      patientClinical.signProgressNoteMutation,
      persistProgressNoteDraft,
    ]
  );

  const handleUnsignProgressNote = useCallback(async () => {
    const encounter = progressNoteModalState.encounter;
    const noteId = encounter?.progress_note?.id;
    if (!noteId) return;
    setProgressNoteError("");
    try {
      await patientClinical.unsignProgressNoteMutation.mutateAsync(noteId);
      setProgressNoteModalState((prev) => {
        if (!prev.encounter) return prev;
        return {
          ...prev,
          encounter: {
            ...prev.encounter,
            status: "in_progress",
            progress_note: prev.encounter.progress_note
              ? {
                  ...prev.encounter.progress_note,
                  status: "draft",
                  signed_by: null,
                  signed_by_name: null,
                  signed_at: null,
                }
              : null,
          },
        };
      });
    } catch (err) {
      const message =
        err instanceof ApiError && err.message
          ? err.message
          : "Progress note could not be unsigned. Try again.";
      setProgressNoteError(message);
    }
  }, [
    patientClinical.unsignProgressNoteMutation,
    progressNoteModalState.encounter,
  ]);

  const handleOpenAppointmentHistory = useCallback(() => {
    if (!appointmentFlow.modal.editingId) return;

    setHistoryModalState({
      isOpen: true,
      appointmentId: appointmentFlow.modal.editingId,
      patientName: patientName || "",
      appointmentTime: appointmentFlow.modal.formData.appointment_time,
    });
  }, [
    appointmentFlow.modal.editingId,
    appointmentFlow.modal.formData.appointment_time,
    patientName,
  ]);

  const handleSaveBillingRecord = useCallback(
    async (
      record: EncounterBillingRecord | null,
      values: EncounterBillingRecordPayload
    ) => {
      setBillingError("");
      try {
        if (record?.id) {
          await patientBilling.updateBillingRecordMutation.mutateAsync({
            billingRecordId: record.id,
            values,
          });
        } else {
          await patientBilling.createBillingRecordMutation.mutateAsync(values);
        }
      } catch {
        setBillingError("Billing record could not be saved. Try again.");
      }
    },
    [
      patientBilling.createBillingRecordMutation,
      patientBilling.updateBillingRecordMutation,
    ]
  );

  return {
    appointmentError,
    progressNoteError,
    billingError,
    progressNoteModalState,
    historyModalState,
    editBlockedDialogState,
    confirmDialogState,
    setConfirmDialogState,
    closeConfirmDialog,
    closeEditBlockedDialog,
    closeProgressNoteModal,
    closeHistoryModal,
    showEditBlockedDialog,
    handleCloseAppointmentModal,
    handleSubmitAppointment,
    handleDeleteAppointment,
    handleOpenAppointment,
    handleScheduleEncounter,
    handleStartClinicalEncounter,
    handleOpenProgressNote,
    handleSaveProgressNoteDraft,
    handleSignProgressNote,
    handleUnsignProgressNote,
    handleOpenAppointmentHistory,
    handleSaveBillingRecord,
  };
}

export default usePatientHubActions;
