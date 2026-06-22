import {
  getPatientDobMrn,
  getPatientInitials,
  getPatientName,
} from "../utils/patientDisplay";

import type { PatientRecord } from "../types";

type PatientAvatarProps = {
  patient?: PatientRecord | null;
  size?: "sm" | "md";
  selected?: boolean;
};

type PatientLineProps = {
  patient?: PatientRecord | null;
  className?: string;
};

type PatientDobMrnLineProps = PatientLineProps & {
  prefix?: boolean;
};

export function PatientAvatar({
  patient,
  size = "md",
  selected = false,
}: PatientAvatarProps) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm";

  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center rounded-2xl border font-semibold tracking-[0.1em]",
        sizeClass,
        selected
          ? "border-cf-border-strong bg-cf-text text-cf-page-bg"
          : "border-cf-border bg-cf-surface-muted text-cf-text",
      ].join(" ")}
    >
      {getPatientInitials(patient)}
    </div>
  );
}

export function PatientNameLine({ patient, className = "" }: PatientLineProps) {
  const name = getPatientName(patient);

  return (
    <div
      className={["truncate font-semibold text-cf-text", className].join(" ")}
      title={name}
    >
      {name}
    </div>
  );
}

export function PatientDobMrnLine({
  patient,
  prefix = true,
  className = "",
}: PatientDobMrnLineProps) {
  const value = getPatientDobMrn(patient);

  return (
    <div
      className={["truncate text-xs text-cf-text-subtle", className].join(" ")}
    >
      {prefix ? value : value.replace(/^DOB\s*/, "") || "—"}
    </div>
  );
}
