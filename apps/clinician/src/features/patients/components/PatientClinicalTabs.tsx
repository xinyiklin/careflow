import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Pencil,
} from "lucide-react";

import { Badge, Button } from "../../../shared/components/ui";
import { formatDateTime } from "./PatientHubSections";

import type { AppointmentLike } from "../../../shared/types/domain";
import type { AppointmentGroup } from "../types";
import type { ClinicalEncounter } from "../../billing/types";

type ClinicalTabQueryState = {
  isLoading?: boolean;
  error?: unknown;
  refetch?: () => void;
};

type ClinicalChartingTabProps = {
  encounters: ClinicalEncounter[];
  appointmentGroups: AppointmentGroup;
  queryState: ClinicalTabQueryState;
  canCreate: boolean;
  onOpenEncounter: (encounter: ClinicalEncounter) => void;
  onOpenVitals?: (encounter: ClinicalEncounter) => void;
  onStartEncounter: (appointment?: AppointmentLike | null) => void;
  onOpenAppointment?: (appointment: AppointmentLike) => void;
};

const clinicalRowClassName =
  "rounded-xl border border-cf-border bg-cf-surface px-4 py-3 transition hover:border-cf-border-strong hover:bg-cf-surface-muted/60";

const clinicalEmptyStateClassName =
  "rounded-xl border border-cf-border bg-cf-surface px-4 py-6 text-center text-sm text-cf-text-muted";

function joinClinicalMeta(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" - ") || "Not set";
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

function isProgressNoteSigned(encounter: ClinicalEncounter) {
  return (
    encounter.status === "signed" ||
    encounter.progress_note?.status === "signed"
  );
}

function getClinicalRecordStatusLabel(encounter: ClinicalEncounter) {
  if (isProgressNoteSigned(encounter)) return "Signed";
  if (encounter.progress_note) return "Draft";
  return "No Note";
}

function getClinicalRecordStatusVariant(
  encounter: ClinicalEncounter
): "success" | "muted" | "outline" {
  if (isProgressNoteSigned(encounter)) return "success";
  if (encounter.progress_note) return "outline";
  return "muted";
}

function getProgressNoteDate(encounter: ClinicalEncounter) {
  return (
    encounter.progress_note?.signed_at ||
    encounter.progress_note?.updated_at ||
    encounter.updated_at ||
    encounter.started_at
  );
}

function isNonChartableAppointment(appointment: AppointmentLike) {
  const statusText = [appointment.status_code, appointment.status_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    statusText.includes("cancel") ||
    statusText.includes("no show") ||
    statusText.includes("no-show") ||
    statusText.includes("no_show")
  );
}

function getAppointmentItems(appointmentGroups: AppointmentGroup) {
  return appointmentGroups.recent
    .filter((appointment) => !isNonChartableAppointment(appointment))
    .sort(
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
    return null;
  }

  if (queryState.error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
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

export function ClinicalChartingTab({
  encounters,
  appointmentGroups,
  queryState,
  canCreate,
  onOpenEncounter,
  onOpenVitals,
  onStartEncounter,
  onOpenAppointment,
}: ClinicalChartingTabProps) {
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
  const showAppointmentItems = !showQueryState && appointmentItems.length > 0;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <ClipboardList className="h-4 w-4 text-cf-text-subtle" />
            Clinical Charting
          </div>
        </div>

        {showQueryState ? (
          <ClinicalQueryState
            queryState={queryState}
            label="clinical records"
          />
        ) : encounters.length ? (
          encounters.map((encounter) => {
            const isSigned = isProgressNoteSigned(encounter);

            return (
              <div key={encounter.id} className={clinicalRowClassName}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-cf-text-subtle">
                        {formatDateTime(getProgressNoteDate(encounter))}
                      </span>
                      <Badge
                        variant={getClinicalRecordStatusVariant(encounter)}
                      >
                        {getClinicalRecordStatusLabel(encounter)}
                      </Badge>
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-cf-text">
                      {encounter.reason ||
                        encounter.appointment_type_name ||
                        "Clinical note"}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-cf-text-muted">
                      {joinClinicalMeta([
                        encounter.rendering_provider_name || "Provider not set",
                        encounter.appointment_type_name,
                      ])}
                    </div>
                    <div className="mt-1 line-clamp-2 text-sm text-cf-text-muted">
                      {getProgressNotePreview(encounter)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {onOpenVitals ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onOpenVitals(encounter)}
                      >
                        <Activity className="h-3.5 w-3.5" />
                        Vitals
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => onOpenEncounter(encounter)}
                    >
                      {isSigned ? (
                        <FileText className="h-3.5 w-3.5" />
                      ) : (
                        <Pencil className="h-3.5 w-3.5" />
                      )}
                      {isSigned ? "View" : "Open"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className={clinicalEmptyStateClassName}>
            No clinical records yet.
          </div>
        )}
      </section>

      {showAppointmentItems ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <CalendarClock className="h-4 w-4 text-cf-text-subtle" />
            Appointments Ready for Charting
          </div>
          {appointmentItems.slice(0, 6).map((appointment) => (
            <div
              key={appointment.id || appointment.appointment_time}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3 transition hover:border-cf-border-strong hover:bg-cf-surface-muted/60"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-cf-text-subtle">
                  {formatDateTime(appointment.appointment_time)}
                </div>
                <div className="truncate text-sm font-semibold text-cf-text">
                  {appointment.appointment_type_name || "Appointment"}
                </div>
                <div className="text-sm text-cf-text-muted">
                  {joinClinicalMeta([
                    appointment.rendering_provider_name,
                    appointment.status_name,
                  ])}
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
                  Start Note
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
