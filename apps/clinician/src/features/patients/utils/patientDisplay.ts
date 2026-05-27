import { formatDOB } from "../../../shared/utils/dateTime";

import type { PatientLike } from "../../../shared/types/domain";

function getMiddleInitial(value: unknown): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const initial = trimmed.charAt(0).toUpperCase();
  return `${initial}.`;
}

export function getPatientChartName(
  patient?: PatientLike | null,
  fallback = "Unknown patient"
): string {
  if (!patient) return fallback;

  const firstName =
    patient.preferred_name ||
    patient.patient_preferred_name ||
    patient.first_name ||
    patient.patient_first_name ||
    "";
  const legalFirstName = patient.first_name || patient.patient_first_name || "";
  const lastName = patient.last_name || patient.patient_last_name || "";
  const middleInitial = getMiddleInitial(
    patient.middle_name || patient.patient_middle_name
  );
  const givenName = [firstName, middleInitial].filter(Boolean).join(" ");
  const chartName = [lastName, givenName].filter(Boolean).join(", ");

  return (
    chartName ||
    [legalFirstName, middleInitial, lastName].filter(Boolean).join(" ") ||
    patient.patient_name ||
    patient.full_name ||
    patient.display_name ||
    fallback
  );
}

export function getPatientFullName(
  patient?: PatientLike | null,
  fallback = "Unknown patient"
): string {
  if (!patient) return fallback;

  const firstName = patient.first_name || patient.patient_first_name || "";
  const lastName = patient.last_name || patient.patient_last_name || "";
  const middleInitial = getMiddleInitial(
    patient.middle_name || patient.patient_middle_name
  );

  return (
    [firstName, middleInitial, lastName].filter(Boolean).join(" ") ||
    getPatientChartName(patient, fallback)
  );
}

export function getPatientName(
  patient?: PatientLike | null,
  fallback = "Unknown patient"
): string {
  return getPatientChartName(patient, fallback);
}

export function getPatientInitials(patient?: PatientLike | null): string {
  return (
    [patient?.first_name, patient?.last_name]
      .map((part) => (part || "").charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PT"
  );
}

export function getPatientDobMrn(patient?: PatientLike | null): string {
  return [
    patient?.date_of_birth ? `DOB ${formatDOB(patient.date_of_birth)}` : "",
    patient?.chart_number ? `MRN ${patient.chart_number}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}
