import type { EntityId } from "../../shared/api/types";
import type { AppointmentLike } from "../../shared/types/domain";
import type { AppointmentEditSessionActiveEditor } from "../appointments/api/appointments";
import type {
  ClinicalEncounter,
  ProgressNoteFormValues,
  ProgressNotePayload,
} from "../billing/types";
import { HUB_TABS } from "./components/PatientHubSections";
import type { PatientHubTabKey } from "./types";

export type ConfirmDialogState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: "default" | "danger" | "warning";
  onConfirm: (() => void | Promise<void>) | null;
};

export type HistoryModalState = {
  isOpen: boolean;
  appointmentId: EntityId | null;
  patientName: string;
  appointmentTime: string;
};

export type EditBlockedDialogState = {
  isOpen: boolean;
  activeEditor: AppointmentEditSessionActiveEditor;
};

export type ProgressNoteModalState = {
  isOpen: boolean;
  encounter: ClinicalEncounter | null;
  appointment: AppointmentLike | null;
};

export const INITIAL_CONFIRM: ConfirmDialogState = {
  isOpen: false,
  title: "",
  message: "",
  confirmText: "Confirm",
  cancelText: "Cancel",
  variant: "default",
  onConfirm: null,
};

export const INITIAL_HISTORY_MODAL: HistoryModalState = {
  isOpen: false,
  appointmentId: null,
  patientName: "",
  appointmentTime: "",
};

export const INITIAL_EDIT_BLOCKED: EditBlockedDialogState = {
  isOpen: false,
  activeEditor: null,
};

export const INITIAL_PROGRESS_NOTE_MODAL: ProgressNoteModalState = {
  isOpen: false,
  encounter: null,
  appointment: null,
};

export function getSafeInitialTab(
  initialTab?: PatientHubTabKey
): PatientHubTabKey {
  return initialTab && HUB_TABS.some((tab) => tab.key === initialTab)
    ? initialTab
    : "registration";
}

export function toNumberOrNull(value?: EntityId | "" | null) {
  if (value === "" || value === null || value === undefined) return null;
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? null : numericValue;
}

export function buildProgressNotePayload(
  values: ProgressNoteFormValues
): ProgressNotePayload {
  return {
    subjective: values.subjective.trim(),
    objective: values.objective.trim(),
    assessment: values.assessment.trim(),
    plan: values.plan.trim(),
  };
}
