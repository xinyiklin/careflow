import { PatientAvatar, PatientNameLine } from "./PatientIdentity";
import { Button } from "../../../shared/components/ui";
import { formatDOB } from "../../../shared/utils/dateTime";

export function PatientResultSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-cf-border px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="cf-loading-skeleton h-10 w-10 rounded-2xl bg-cf-surface-soft" />
        <div className="min-w-0 flex-1">
          <div className="cf-loading-skeleton h-3.5 w-40 rounded-full bg-cf-surface-soft" />
          <div className="cf-loading-skeleton mt-2 h-3 w-72 max-w-full rounded-full bg-cf-surface-soft" />
        </div>
      </div>
      <div className="cf-loading-skeleton h-9 w-16 rounded-xl bg-cf-surface-soft" />
    </div>
  );
}

function patientDetailLine(patient) {
  const details = [
    patient?.date_of_birth ? `DOB ${formatDOB(patient.date_of_birth)}` : null,
    patient?.chart_number ? `MRN ${patient.chart_number}` : null,
    patient?.primary_phone_number || null,
    patient?.email || null,
  ].filter(Boolean);

  return details.join(" · ") || "No demographic details";
}

function SelectedField({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/[0.08] p-3">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">
        {value || "—"}
      </div>
    </div>
  );
}

export function PatientResultRow({
  patient,
  isSelected,
  allowSelect,
  onSelect,
  onUsePatient,
  onOpenPatientProfile,
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={() => onOpenPatientProfile?.(patient)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
      className={[
        "grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b px-4 py-3 text-left transition last:border-b-0",
        isSelected
          ? "border-cf-text bg-cf-text text-white"
          : "border-cf-border bg-cf-surface hover:bg-cf-surface-muted/55",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <PatientAvatar patient={patient} selected={isSelected} size="sm" />
        <div className="min-w-0">
          <PatientNameLine
            patient={patient}
            className={isSelected ? "text-white" : ""}
          />
          <div
            className={[
              "mt-0.5 truncate text-xs",
              isSelected ? "text-slate-300" : "text-cf-text-muted",
            ].join(" ")}
          >
            {patientDetailLine(patient)}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          if (allowSelect) {
            onUsePatient(patient);
          } else {
            onOpenPatientProfile?.(patient);
          }
        }}
        className={
          isSelected
            ? "border-white bg-white text-cf-text hover:bg-cf-surface-soft"
            : ""
        }
      >
        {allowSelect ? "Use" : "Open"}
      </Button>
    </div>
  );
}

export function SelectedPatientPanel({
  patient,
  allowSelect,
  onUsePatient,
  onOpenPatientProfile,
}) {
  if (!patient) {
    return (
      <aside className="rounded-b-3xl border-x border-b border-cf-border bg-cf-surface px-5 py-5 lg:rounded-bl-none lg:rounded-r-3xl lg:border-y lg:border-l lg:border-r">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
          Selected chart
        </div>
        <div className="mt-3 rounded-3xl border border-dashed border-cf-border bg-cf-surface-muted/45 p-5 text-sm text-cf-text-muted">
          Select a result to review the chart before using it.
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-b-3xl border-x border-b border-cf-border bg-cf-surface px-5 py-5 lg:rounded-bl-none lg:rounded-r-3xl lg:border-y lg:border-l lg:border-r">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
        Selected chart
      </div>
      <div className="mt-3 rounded-3xl bg-cf-text p-4 text-white shadow-[var(--shadow-panel)]">
        <div className="flex items-center gap-3">
          <PatientAvatar patient={patient} selected />
          <div className="min-w-0">
            <PatientNameLine patient={patient} className="text-white" />
            <div className="mt-0.5 text-xs text-slate-300">
              {patient.chart_number ? `MRN ${patient.chart_number}` : "No MRN"}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <SelectedField
            label="DOB"
            value={
              patient.date_of_birth ? formatDOB(patient.date_of_birth) : ""
            }
          />
          <SelectedField label="Phone" value={patient.primary_phone_number} />
          <SelectedField label="Email" value={patient.email} />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Button
          type="button"
          variant="primary"
          onClick={() =>
            allowSelect
              ? onUsePatient(patient)
              : onOpenPatientProfile?.(patient)
          }
        >
          {allowSelect ? "Use Patient" : "Open Hub"}
        </Button>
        {allowSelect ? (
          <Button
            type="button"
            variant="default"
            onClick={() => onOpenPatientProfile?.(patient)}
          >
            Open Hub
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
