import { CalendarClock, Pencil, Plus } from "lucide-react";

import { Badge, Button } from "../../../shared/components/ui";
import {
  formatCoverageOrder,
  formatDateTime,
  formatDate,
} from "./PatientHubSections";
import { getCarrierBranding } from "../utils/insuranceCardBranding";
import {
  getPatientChartName,
  getPatientFullName,
} from "../utils/patientDisplay";
import type { KeyboardEvent } from "react";
import type { AppointmentLike } from "../../../shared/types/domain";
import type {
  AppointmentGroup,
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
  canManage,
}: {
  insurancePolicies: PatientHubInsurancePolicy[];
  onOpenPolicy: (policy?: PatientHubInsurancePolicy | null) => void;
  insurancePoliciesQuery: { isLoading: boolean };
  canManage: boolean;
}) {
  const formatMemberId = (id: string) => {
    if (!id) return "•••• •••• ••••";
    return id.replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-cf-text">
            Insurance Coverage
          </div>
          <div className="text-xs text-cf-text-muted mt-0.5">
            {canManage
              ? "Manage the patient's billing cards, coverage tiers, and policy verification details."
              : "View the patient's billing cards, coverage tiers, and policy verification details."}
          </div>
        </div>
        {canManage ? (
          <Button size="sm" onClick={() => onOpenPolicy()}>
            <Plus className="h-4 w-4" />
            Add Policy
          </Button>
        ) : null}
      </div>

      {insurancePoliciesQuery.isLoading ? null : insurancePolicies.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insurancePolicies.map((policy) => {
            const isPrimary = policy.is_primary;
            const branding = getCarrierBranding(policy.carrier_name);

            return (
              <div
                key={policy.id}
                role={canManage ? "button" : undefined}
                tabIndex={canManage ? 0 : undefined}
                onClick={() => {
                  if (canManage) onOpenPolicy(policy);
                }}
                onKeyDown={(e) => {
                  if (!canManage) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenPolicy(policy);
                  }
                }}
                className={`relative overflow-hidden rounded-[1.25rem] border border-white/[0.08] shadow-md group flex flex-col justify-between aspect-[1.586/1] min-h-[230px] p-6 text-white bg-gradient-to-br ${branding.gradient} transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cf-accent/25 ${
                  canManage
                    ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl"
                    : ""
                }`}
              >
                {/* Subtle glass sheen overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.04] to-white/[0.08] pointer-events-none" />

                {/* Background watermark monogram */}
                <span
                  className="absolute right-[-4%] bottom-[-8%] text-[8rem] font-black leading-none tracking-tighter pointer-events-none select-none group-hover:scale-105 transition-transform duration-500"
                  style={{ color: branding.accentHex, opacity: 0.06 }}
                >
                  {branding.monogram}
                </span>

                {/* Header: Carrier Info & Monogram Badge */}
                <div className="flex items-start justify-between gap-4 z-10">
                  <div className="min-w-0">
                    <span
                      className="block font-bold tracking-wider text-base md:text-lg uppercase truncate max-w-[190px] text-white"
                      title={policy.carrier_name || "Insurance Policy"}
                    >
                      {policy.carrier_name || "Insurance Policy"}
                    </span>
                    <span className="block text-xs text-white/70 font-medium truncate max-w-[190px]">
                      {policy.plan_name || "Standard Plan"}
                    </span>
                  </div>

                  {/* Carrier Monogram */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tracking-tight text-white shadow-sm border border-white/10"
                    style={{ backgroundColor: branding.accentHex + "38" }}
                  >
                    {branding.monogram}
                  </div>
                </div>

                {/* Middle: Member ID */}
                <div className="my-2 z-10">
                  <span className="block text-[9px] uppercase font-semibold text-white/50 tracking-widest">
                    Member ID
                  </span>
                  <span className="block font-mono text-lg md:text-xl font-bold tracking-widest text-white drop-shadow-sm truncate">
                    {formatMemberId(policy.member_id || "")}
                  </span>
                </div>

                {/* Bottom Row: Metadata & Badges */}
                <div className="z-10 mt-auto">
                  <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-left">
                    <div className="min-w-0">
                      <span className="block text-[8px] uppercase tracking-wider text-white/40">
                        Group
                      </span>
                      <span className="block text-xs font-semibold truncate text-white/90">
                        {policy.group_number || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[8px] uppercase tracking-wider text-white/40">
                        Subscriber
                      </span>
                      <span className="block text-xs font-semibold truncate text-white/90">
                        {policy.subscriber_name || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[8px] uppercase tracking-wider text-white/40">
                        Relationship
                      </span>
                      <span className="block text-xs font-semibold truncate text-white/90 font-medium">
                        {policy.relationship_to_subscriber || "self"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3.5 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {policy.is_active ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-semibold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Terminated
                        </div>
                      )}

                      <div className="text-[10px] text-white/60 font-medium">
                        {policy.effective_date
                          ? formatDate(policy.effective_date)
                          : "—"}
                        {policy.termination_date
                          ? ` to ${formatDate(policy.termination_date)}`
                          : ""}
                      </div>
                    </div>

                    <div
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${branding.badgeBg} ${branding.badgeText} ${branding.badgeBorder}`}
                    >
                      {formatCoverageOrder(policy.coverage_order, isPrimary)}
                    </div>
                  </div>
                </div>

                {/* Creative Hover Overlay */}
                {canManage ? (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center pointer-events-none z-20">
                    <span className="bg-white/20 border border-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 shadow-lg">
                      <Pencil className="h-4 w-4" />
                      Edit Policy Card
                    </span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-cf-border bg-cf-surface px-6 py-12 text-center shadow-sm">
          <div className="relative w-48 h-32 rounded-[1rem] border-2 border-dashed border-cf-border-strong/50 bg-cf-surface-muted/30 p-5 flex flex-col justify-between mb-4 pointer-events-none opacity-60">
            <div className="flex justify-between items-start">
              <div className="h-4 w-16 bg-cf-border-strong/30 rounded" />
              <div className="h-5 w-8 bg-cf-border-strong/40 rounded-md" />
            </div>
            <div className="h-3 w-32 bg-cf-border-strong/30 rounded" />
            <div className="h-2 w-24 bg-cf-border-strong/20 rounded" />
          </div>
          <div className="text-sm font-semibold text-cf-text">
            No Insurance Policies Recorded
          </div>
          <div className="mt-1 max-w-sm text-xs text-cf-text-muted leading-relaxed">
            Attach primary or secondary insurance coverage cards to coordinate
            benefits and process encounter claims.
          </div>
          {canManage ? (
            <Button size="sm" className="mt-4" onClick={() => onOpenPolicy()}>
              <Plus className="h-4 w-4" />
              Add First Policy
            </Button>
          ) : null}
        </div>
      )}
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
        <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
          <CalendarClock className="h-4 w-4 text-cf-text-subtle" />
          Appointments
        </div>
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
            title="Double-click to open appointment"
          >
            <div>
              <div className="text-xs font-semibold text-cf-text-subtle">
                {formatDateTime(appointment.appointment_time)}
              </div>
              <div className="text-sm font-semibold text-cf-text">
                {appointment.appointment_type_name || "Appointment"}
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
          No appointments found.
        </div>
      )}
    </div>
  );
}
