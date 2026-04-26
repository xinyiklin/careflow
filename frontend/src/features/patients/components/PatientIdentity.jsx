import { CalendarDays, Hash, Mail, Phone } from "lucide-react";

import { Badge } from "../../../shared/components/ui";
import { formatDOB } from "../../../shared/utils/dateTime";
import {
  getPatientDobMrn,
  getPatientInitials,
  getPatientName,
} from "../utils/patientDisplay";

export function PatientAvatar({ patient, size = "md", selected = false }) {
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

export function PatientNameLine({ patient, className = "" }) {
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

export function PatientDobMrnLine({ patient, prefix = true, className = "" }) {
  const value = getPatientDobMrn(patient);

  return (
    <div
      className={["truncate text-xs text-cf-text-subtle", className].join(" ")}
    >
      {prefix ? value : value.replace(/^DOB\s*/, "") || "—"}
    </div>
  );
}

export function PatientSearchResultCard({
  patient,
  isSelected,
  onSelect,
  onOpen,
  actions,
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={[
        "group w-full rounded-2xl border px-4 py-3 text-left transition",
        isSelected
          ? "border-cf-border-strong bg-cf-surface-soft shadow-sm"
          : "border-cf-border bg-cf-surface hover:border-cf-border-strong hover:bg-cf-surface-muted/55",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <PatientAvatar patient={patient} selected={isSelected} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PatientNameLine patient={patient} className="text-base" />
            {patient.preferred_name ? (
              <Badge variant="muted">Preferred: {patient.preferred_name}</Badge>
            ) : null}
          </div>

          <div className="mt-2 grid gap-2 text-sm text-cf-text-muted sm:grid-cols-2 xl:grid-cols-4">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
              <span className="truncate">
                {formatDOB(patient.date_of_birth)}
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
              <span className="truncate">{patient.chart_number || "—"}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
              <span className="truncate">
                {patient.primary_phone_number || "—"}
              </span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-cf-text-subtle" />
              <span className="truncate">{patient.email || "—"}</span>
            </span>
          </div>
        </div>
      </div>

      {isSelected && actions ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cf-border pt-3">
          {actions}
        </div>
      ) : null}
    </button>
  );
}
