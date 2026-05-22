import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Pencil,
  Plus,
} from "lucide-react";

import { Badge, Button } from "../../../shared/components/ui";
import { formatDateTime } from "./PatientHubSections";

import type { AppointmentLike } from "../../../shared/types/domain";
import type { AppointmentGroup, ClinicalEncounter } from "../types";

type ClinicalTabQueryState = {
  isLoading?: boolean;
  error?: unknown;
  refetch?: () => void;
};

type ClinicalEncountersTabProps = {
  encounters: ClinicalEncounter[];
  appointmentGroups: AppointmentGroup;
  queryState: ClinicalTabQueryState;
  canCreate: boolean;
  onOpenEncounter: (encounter: ClinicalEncounter) => void;
  onStartEncounter: (appointment?: AppointmentLike | null) => void;
  onOpenAppointment?: (appointment: AppointmentLike) => void;
};

type ProgressNotesTabProps = {
  encounters: ClinicalEncounter[];
  queryState: ClinicalTabQueryState;
  canCreate: boolean;
  onOpenEncounter: (encounter: ClinicalEncounter) => void;
  onNewNote: () => void;
};

function getEncounterStatusLabel(status?: string | null) {
  if (status === "signed") return "Signed";
  if (status === "cancelled") return "Cancelled";
  return "In Progress";
}

function getEncounterStatusVariant(
  status?: string | null
): "success" | "muted" | "outline" {
  if (status === "signed") return "success";
  if (status === "cancelled") return "muted";
  return "outline";
}

function getProgressNotePreview(encounter: ClinicalEncounter) {
  const note = encounter.progress_note;
  const preview = [
    note?.assessment,
    note?.plan,
    note?.subjective,
    note?.objective,
  ]
    .find((value) => String(value || "").trim())
    ?.trim();

  return preview || encounter.reason || "Draft note";
}

function getAppointmentItems(appointmentGroups: AppointmentGroup) {
  return [...appointmentGroups.upcoming, ...appointmentGroups.recent].sort(
    (a, b) =>
      new Date(b.appointment_time || "").getTime() -
      new Date(a.appointment_time || "").getTime()
  );
}

function ClinicalQueryState({
  queryState,
  label,
}: {
  queryState: ClinicalTabQueryState;
  label: string;
}) {
  if (queryState.isLoading) {
    return (
      <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 text-sm text-cf-text-muted shadow-sm">
        Loading {label}...
      </div>
    );
  }

  if (queryState.error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 shadow-sm">
        <div>
          <div className="text-sm font-semibold text-cf-text">
            Couldn&apos;t load {label}
          </div>
          <div className="text-sm text-cf-text-muted">
            Check your connection and try again.
          </div>
        </div>
        <Button type="button" size="sm" onClick={() => queryState.refetch?.()}>
          Retry
        </Button>
      </div>
    );
  }

  return null;
}

export function ProgressNotesTab({
  encounters,
  queryState,
  canCreate,
  onOpenEncounter,
  onNewNote,
}: ProgressNotesTabProps) {
  const progressNoteEncounters = encounters.filter(
    (encounter) => encounter.progress_note
  );
  const showQueryState = queryState.isLoading || queryState.error;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-cf-text">Progress Notes</div>
        <Button size="sm" onClick={onNewNote} disabled={!canCreate}>
          <Plus className="h-4 w-4" />
          New Note
        </Button>
      </div>

      {showQueryState ? (
        <ClinicalQueryState queryState={queryState} label="progress notes" />
      ) : progressNoteEncounters.length ? (
        progressNoteEncounters.map((encounter) => (
          <div
            key={encounter.id}
            className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-cf-text-subtle">
                    {formatDateTime(
                      encounter.progress_note?.signed_at ||
                        encounter.updated_at ||
                        encounter.started_at
                    )}
                  </span>
                  <Badge
                    variant={
                      encounter.progress_note?.status === "signed"
                        ? "success"
                        : "outline"
                    }
                  >
                    {encounter.progress_note?.status === "signed"
                      ? "Signed"
                      : "Draft"}
                  </Badge>
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-cf-text">
                  {encounter.reason ||
                    encounter.appointment_type_name ||
                    "Progress note"}
                </div>
                <div className="mt-1 line-clamp-2 text-sm text-cf-text-muted">
                  {getProgressNotePreview(encounter)}
                </div>
              </div>
              <Button size="sm" onClick={() => onOpenEncounter(encounter)}>
                <Pencil className="h-3.5 w-3.5" />
                Open
              </Button>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-8 text-center text-sm text-cf-text-muted shadow-sm">
          No progress notes on file.
        </div>
      )}
    </div>
  );
}

export function ClinicalEncountersTab({
  encounters,
  appointmentGroups,
  queryState,
  canCreate,
  onOpenEncounter,
  onStartEncounter,
  onOpenAppointment,
}: ClinicalEncountersTabProps) {
  const encounterAppointmentIds = new Set(
    encounters
      .map((encounter) => encounter.appointment)
      .filter(Boolean)
      .map((id) => String(id))
  );
  const appointmentItems = getAppointmentItems(appointmentGroups).filter(
    (appointment) =>
      appointment.id && !encounterAppointmentIds.has(String(appointment.id))
  );
  const showQueryState = queryState.isLoading || queryState.error;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-cf-text">
            Clinical Encounters
          </div>
          <Button
            size="sm"
            onClick={() => onStartEncounter()}
            disabled={!canCreate}
          >
            <Plus className="h-4 w-4" />
            Start Encounter
          </Button>
        </div>

        {showQueryState ? (
          <ClinicalQueryState
            queryState={queryState}
            label="clinical encounters"
          />
        ) : encounters.length ? (
          encounters.map((encounter) => (
            <div
              key={encounter.id}
              className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-cf-text-subtle">
                      {formatDateTime(encounter.started_at)}
                    </span>
                    <Badge
                      variant={getEncounterStatusVariant(encounter.status)}
                    >
                      {getEncounterStatusLabel(encounter.status)}
                    </Badge>
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-cf-text">
                    {encounter.reason ||
                      encounter.appointment_type_name ||
                      "Clinical encounter"}
                  </div>
                  <div className="text-sm text-cf-text-muted">
                    {[
                      encounter.rendering_provider_name,
                      encounter.appointment_type_name,
                    ]
                      .filter(Boolean)
                      .join(" - ") || "Clinical visit"}
                  </div>
                </div>
                <Button size="sm" onClick={() => onOpenEncounter(encounter)}>
                  <ClipboardList className="h-3.5 w-3.5" />
                  Open Note
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-8 text-center text-sm text-cf-text-muted shadow-sm">
            No clinical encounters yet.
          </div>
        )}
      </section>

      {appointmentItems.length ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <CalendarClock className="h-4 w-4 text-cf-text-subtle" />
            Appointments Ready For Charting
          </div>
          {appointmentItems.slice(0, 6).map((appointment) => (
            <div
              key={appointment.id || appointment.appointment_time}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 shadow-sm"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-cf-text-subtle">
                  {formatDateTime(appointment.appointment_time)}
                </div>
                <div className="truncate text-sm font-semibold text-cf-text">
                  {appointment.appointment_type_name || "Appointment"}
                </div>
                <div className="text-sm text-cf-text-muted">
                  {[
                    appointment.rendering_provider_name,
                    appointment.status_name,
                  ]
                    .filter(Boolean)
                    .join(" - ") || "Scheduled visit"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onOpenAppointment ? (
                  <Button
                    size="sm"
                    onClick={() => onOpenAppointment(appointment)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Details
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!canCreate}
                  onClick={() => onStartEncounter(appointment)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Start
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
