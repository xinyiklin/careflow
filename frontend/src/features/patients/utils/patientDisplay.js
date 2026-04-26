import { formatDOB } from "../../../shared/utils/dateTime";

export function getPatientName(patient, fallback = "Unknown patient") {
  if (!patient) return fallback;

  return (
    patient.display_name ||
    patient.full_name ||
    [patient.last_name, patient.first_name].filter(Boolean).join(", ") ||
    [patient.first_name, patient.last_name].filter(Boolean).join(" ") ||
    fallback
  );
}

export function getPatientInitials(patient) {
  return (
    [patient?.first_name, patient?.last_name]
      .map((part) => (part || "").charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "PT"
  );
}

export function getPatientDobMrn(patient) {
  return [
    patient?.date_of_birth ? `DOB ${formatDOB(patient.date_of_birth)}` : "",
    patient?.chart_number ? `MRN ${patient.chart_number}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}
