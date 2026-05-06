import { AlertTriangle, ClipboardList, Pencil, Pill, Plus } from "lucide-react";

import { Badge, Button } from "../../../shared/components/ui";
import { formatCoverageOrder, formatDateTime } from "./PatientHubSections";
import {
  getPatientChartName,
  getPatientFullName,
} from "../utils/patientDisplay";
import type { KeyboardEvent } from "react";
import type { AppointmentLike } from "../../../shared/types/domain";
import type {
  AppointmentGroup,
  PatientHubEmptyTab,
  PatientHubEmptyTabs,
  PatientHubInsurancePolicy,
  PatientRecord,
} from "../types";

type AppointmentListItem = AppointmentLike & {
  upcoming: boolean;
};

export function buildAppointmentPatientSnapshot(
  patient?: PatientRecord | null
) {
  if (!patient) return null;

  return {
    id: patient.id,
    full_name: getPatientFullName(patient),
    display_name: getPatientChartName(patient),
    date_of_birth: patient.date_of_birth || "",
    chart_number: patient.chart_number || "",
  };
}

export function InsuranceTab({
  insurancePolicies,
  onOpenPolicy,
  insurancePoliciesQuery,
}: {
  insurancePolicies: PatientHubInsurancePolicy[];
  onOpenPolicy: (policy?: PatientHubInsurancePolicy | null) => void;
  insurancePoliciesQuery: { isLoading: boolean };
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-cf-text">
          Insurance Policies
        </div>
        <Button size="sm" onClick={() => onOpenPolicy()}>
          <Plus className="h-4 w-4" />
          Add Policy
        </Button>
      </div>

      {insurancePoliciesQuery.isLoading ? (
        <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 text-sm text-cf-text-muted shadow-sm">
          Loading insurance policies...
        </div>
      ) : insurancePolicies.length ? (
        insurancePolicies.map((policy) => (
          <div
            key={policy.id}
            className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-cf-text">
                    {policy.carrier_name || "Insurance policy"}
                  </span>
                  <Badge variant={policy.is_primary ? "success" : "neutral"}>
                    {formatCoverageOrder(
                      policy.coverage_order,
                      policy.is_primary
                    )}
                  </Badge>
                </div>
                <div className="mt-1 text-sm text-cf-text-muted">
                  {[
                    policy.plan_name,
                    policy.member_id && `Member: ${policy.member_id}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Policy details not recorded"}
                </div>
                <div className="text-sm text-cf-text-muted">
                  {[
                    policy.group_number && `Group: ${policy.group_number}`,
                    policy.subscriber_name &&
                      `Subscriber: ${policy.subscriber_name}`,
                    policy.relationship_to_subscriber &&
                      `Relationship: ${policy.relationship_to_subscriber}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <Button size="sm" onClick={() => onOpenPolicy(policy)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-8 text-center text-sm text-cf-text-muted shadow-sm">
          No insurance policies saved.
        </div>
      )}
    </div>
  );
}

export function EmptyClinicalTab({
  title,
  description,
  action,
  icon: Icon,
  variant = "default",
}: PatientHubEmptyTab) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-cf-text">{title}</div>
          <div className="text-sm text-cf-text-muted">{description}</div>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          {action}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-cf-text-subtle",
              variant === "warning"
                ? "border-cf-warning-text/35 bg-cf-warning-bg text-cf-warning-text"
                : "border-cf-border bg-cf-surface-soft",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-cf-text">
              No records yet
            </div>
            <div className="text-sm text-cf-text-muted">
              This section is ready for the future clinical workflow.
            </div>
          </div>
        </div>
        <Badge variant="muted">Not connected</Badge>
      </div>
    </div>
  );
}

export function AppointmentsTab({
  appointmentGroups,
  onOpenAppointment,
  onSchedule,
}: {
  appointmentGroups: AppointmentGroup;
  onOpenAppointment?: (appointment: AppointmentLike) => void;
  onSchedule: () => void;
}) {
  const appointments: AppointmentListItem[] = [
    ...appointmentGroups.upcoming.map((appointment) => ({
      ...appointment,
      upcoming: true,
    })),
    ...appointmentGroups.recent.map((appointment) => ({
      ...appointment,
      upcoming: false,
    })),
  ].sort(
    (a, b) =>
      new Date(b.appointment_time || "").getTime() -
      new Date(a.appointment_time || "").getTime()
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-cf-text">Encounters</div>
        <Button size="sm" onClick={onSchedule}>
          <Plus className="h-4 w-4" />
          Schedule
        </Button>
      </div>

      {appointments.length ? (
        appointments.map((appointment) => (
          <div
            key={appointment.id || appointment.appointment_time}
            role="button"
            tabIndex={0}
            onDoubleClick={() => onOpenAppointment?.(appointment)}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter") onOpenAppointment?.(appointment);
            }}
            className="flex cursor-default flex-wrap items-center justify-between gap-2 rounded-2xl border border-cf-border bg-cf-surface px-5 py-4 shadow-sm transition hover:border-cf-border-strong hover:bg-cf-surface-muted/60 focus:outline-none focus:ring-2 focus:ring-cf-accent/25"
            title="Double-click to open encounter"
          >
            <div>
              <div className="text-xs font-semibold text-cf-text-subtle">
                {formatDateTime(appointment.appointment_time)}
              </div>
              <div className="text-sm font-semibold text-cf-text">
                {appointment.appointment_type_name || "Encounter"}
              </div>
              <div className="text-sm text-cf-text-muted">
                {[appointment.rendering_provider_name, appointment.room]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
            </div>
            <Badge variant={appointment.upcoming ? "success" : "neutral"}>
              {appointment.status_name ||
                (appointment.upcoming ? "Scheduled" : "Past")}
            </Badge>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-cf-border bg-cf-surface px-5 py-8 text-center text-sm text-cf-text-muted shadow-sm">
          No encounters found.
        </div>
      )}
    </div>
  );
}

export const PATIENT_HUB_EMPTY_TABS: PatientHubEmptyTabs = {
  allergies: {
    title: "Allergies & Adverse Reactions",
    description: "No allergies recorded",
    action: "Add",
    icon: AlertTriangle,
    variant: "warning",
  },
  medications: {
    title: "Medications",
    description: "0 medications",
    action: "Add",
    icon: Pill,
  },
  notes: {
    title: "Progress Notes",
    description: "0 notes on file",
    action: "New Note",
    icon: ClipboardList,
  },
};
