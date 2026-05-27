import type { AppointmentLike } from "../../../shared/types/domain";
import type {
  ClinicalEncounter,
  ProgressNoteFormValues,
} from "../../billing/types";
import type { PatientCareProvider } from "../types";

export type SoapFieldKey = "subjective" | "objective" | "assessment" | "plan";

export type ProgressNoteFieldIds = Record<
  SoapFieldKey | "reason" | "provider",
  string
>;

export const noteContentRequiredMessage =
  "Add note content before saving or signing.";

export const SOAP_FIELDS: Array<{
  key: SoapFieldKey;
  label: string;
  placeholder: string;
}> = [
  {
    key: "subjective",
    label: "Subjective",
    placeholder: "Patient-reported symptoms, interval history, and concerns.",
  },
  {
    key: "objective",
    label: "Objective",
    placeholder: "Observed findings, vitals review, exam findings, and data.",
  },
  {
    key: "assessment",
    label: "Assessment",
    placeholder: "Clinical impression, diagnoses, and visit-level reasoning.",
  },
  {
    key: "plan",
    label: "Plan",
    placeholder: "Follow-up, patient instructions, orders, and next steps.",
  },
];

export function getProviderLabel(provider: PatientCareProvider) {
  const userName = [provider.user?.first_name, provider.user?.last_name]
    .filter(Boolean)
    .join(" ");
  return (
    provider.display_name ||
    [provider.title_name, userName].filter(Boolean).join(" ") ||
    [provider.first_name, provider.last_name].filter(Boolean).join(" ") ||
    "Provider"
  );
}

export function getInitialProgressNoteValues(
  encounter?: ClinicalEncounter | null,
  appointment?: AppointmentLike | null
): ProgressNoteFormValues {
  const note = encounter?.progress_note;

  return {
    reason: encounter?.reason || appointment?.reason || "",
    rendering_provider:
      encounter?.rendering_provider || appointment?.rendering_provider || "",
    subjective: note?.subjective || "",
    objective: note?.objective || "",
    assessment: note?.assessment || "",
    plan: note?.plan || "",
  };
}

export function hasProgressNoteContent(values: ProgressNoteFormValues) {
  return SOAP_FIELDS.some((field) => values[field.key].trim());
}

export function getCompletedSoapCount(values: ProgressNoteFormValues) {
  return SOAP_FIELDS.filter((field) => values[field.key].trim()).length;
}

export function areProgressNoteValuesEqual(
  first: ProgressNoteFormValues,
  second: ProgressNoteFormValues
) {
  return (
    first.reason === second.reason &&
    String(first.rendering_provider || "") ===
      String(second.rendering_provider || "") &&
    SOAP_FIELDS.every((field) => first[field.key] === second[field.key])
  );
}
