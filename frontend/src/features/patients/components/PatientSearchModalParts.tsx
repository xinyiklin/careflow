import {
  CalendarDays,
  CircleCheck,
  FileText,
  Hash,
  Mail,
  Phone,
  Search,
  UserRoundCheck,
} from "lucide-react";

import { PatientAvatar, PatientNameLine } from "./PatientIdentity";
import { Button } from "../../../shared/components/ui";
import { formatDOB } from "../../../shared/utils/dateTime";
import { getPrimaryPatientPhoneDisplay } from "../utils/contactValidation";

import type { KeyboardEvent, MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";
import type { PatientRecord } from "../types";

type SelectedFieldProps = {
  icon: LucideIcon;
  label: string;
  value?: string | number | null;
};

type PatientSearchEmptyStateProps = {
  canSearch: boolean;
  onOpenCreatePatient?: () => void;
};

type PatientResultRowProps = {
  patient: PatientRecord;
  isSelected: boolean;
  allowSelect: boolean;
  onSelect: () => void;
  onUsePatient: (patient: PatientRecord) => void;
  onOpenPatientProfile?: (patient: PatientRecord) => void;
};

type SelectedPatientPanelProps = {
  patient?: PatientRecord | null;
  allowSelect: boolean;
  onUsePatient: (patient: PatientRecord) => void;
  onOpenPatientProfile?: (patient: PatientRecord) => void;
};

export function PatientResultSkeleton() {
  return null;
}

function patientDetailLine(patient: PatientRecord): string {
  const details = [
    patient?.date_of_birth ? `DOB ${formatDOB(patient.date_of_birth)}` : null,
    patient?.chart_number ? `MRN ${patient.chart_number}` : null,
    getPrimaryPatientPhoneDisplay(patient) || null,
    patient?.email || null,
  ].filter(Boolean);

  return details.join(" · ") || "No demographic details";
}

function SelectedField({ icon: Icon, label, value }: SelectedFieldProps) {
  const displayValue = value || "—";

  return (
    <div className="flex min-w-0 items-start gap-2 border-t border-cf-border py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cf-text-subtle" />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
          {label}
        </div>
        <div
          className="mt-0.5 truncate text-sm font-semibold text-cf-text select-text"
          title={value ? String(value) : undefined}
        >
          {displayValue}
        </div>
      </div>
    </div>
  );
}

export function PatientSearchEmptyState({
  canSearch,
  onOpenCreatePatient,
}: PatientSearchEmptyStateProps) {
  return (
    <div className="flex min-h-[20rem] items-center justify-center px-5 py-10 text-center">
      <div className="mx-auto max-w-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cf-border bg-cf-surface text-cf-text-subtle">
          {canSearch ? (
            <Search className="h-5 w-5" />
          ) : (
            <UserRoundCheck className="h-5 w-5" />
          )}
        </div>
        <div className="mt-4 text-base font-semibold text-cf-text">
          {canSearch ? "No matching chart" : "Start a chart lookup"}
        </div>
        <div className="mt-2 text-sm leading-6 text-cf-text-muted">
          {canSearch
            ? "Confirm name and DOB before creating a new chart."
            : "Use name, MRN, DOB, or phone."}
        </div>
        {canSearch ? (
          <Button
            type="button"
            variant="primary"
            className="mt-5 !text-cf-page-bg"
            onClick={onOpenCreatePatient}
          >
            Create patient
          </Button>
        ) : null}
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
}: PatientResultRowProps) {
  const detailLine = patientDetailLine(patient);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={() => onOpenPatientProfile?.(patient)}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect();
      }}
      className={[
        "grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b border-l-4 px-4 py-3 text-left transition last:border-b-0",
        isSelected
          ? "border-cf-border border-l-cf-accent bg-cf-surface-soft"
          : "border-cf-border border-l-transparent bg-cf-surface hover:bg-cf-surface-muted/55",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <PatientAvatar patient={patient} selected={isSelected} size="sm" />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <PatientNameLine patient={patient} />
            {isSelected ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cf-border bg-cf-surface px-2 py-0.5 text-[11px] font-semibold text-cf-text-muted">
                <CircleCheck className="h-3 w-3" />
                Selected
              </span>
            ) : null}
          </div>
          <div
            className="mt-0.5 truncate text-xs text-cf-text-muted"
            title={detailLine}
          >
            {detailLine}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation();
          if (allowSelect) {
            onUsePatient(patient);
          } else {
            onOpenPatientProfile?.(patient);
          }
        }}
        className={
          isSelected
            ? "border-cf-border-strong bg-cf-surface text-cf-text hover:bg-cf-surface-muted"
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
}: SelectedPatientPanelProps) {
  if (!patient) {
    return (
      <aside className="border-t border-cf-border bg-cf-surface px-5 py-4 lg:border-t-0 lg:border-l">
        <div className="text-xs font-semibold uppercase text-cf-text-subtle">
          Chart snapshot
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cf-border bg-cf-surface-muted/45 text-cf-text-subtle">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-cf-text">
                No chart selected
              </div>
              <div className="mt-0.5 text-xs text-cf-text-muted">
                Select a result
              </div>
            </div>
          </div>

          <div className="mt-4">
            <SelectedField icon={CalendarDays} label="DOB" value="" />
            <SelectedField icon={Hash} label="MRN" value="" />
            <SelectedField icon={Phone} label="Phone" value="" />
            <SelectedField icon={Mail} label="Email" value="" />
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <Button
            type="button"
            variant="primary"
            className="!text-cf-page-bg"
            disabled
          >
            {allowSelect ? "Use Patient" : "Open Hub"}
          </Button>
          {allowSelect ? (
            <Button type="button" variant="default" disabled>
              Open Hub
            </Button>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside className="border-t border-cf-border bg-cf-surface px-5 py-4 lg:border-t-0 lg:border-l">
      <div className="text-xs font-semibold uppercase text-cf-text-subtle">
        Chart snapshot
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-3">
          <PatientAvatar patient={patient} selected />
          <div className="min-w-0">
            <PatientNameLine patient={patient} className="text-base" />
            <div className="mt-0.5 text-xs text-cf-text-muted">
              {patient.chart_number ? `MRN ${patient.chart_number}` : "No MRN"}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <SelectedField
            icon={CalendarDays}
            label="DOB"
            value={
              patient.date_of_birth ? formatDOB(patient.date_of_birth) : ""
            }
          />
          <SelectedField icon={Hash} label="MRN" value={patient.chart_number} />
          <SelectedField
            icon={Phone}
            label="Phone"
            value={getPrimaryPatientPhoneDisplay(patient)}
          />
          <SelectedField icon={Mail} label="Email" value={patient.email} />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Button
          type="button"
          variant="primary"
          className="!text-cf-page-bg"
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
