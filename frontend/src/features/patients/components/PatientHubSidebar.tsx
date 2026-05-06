import { Mail, Phone } from "lucide-react";

import { formatCoverageOrder, formatDateTime } from "./PatientHubSections";
import { formatDOB } from "../../../shared/utils/dateTime";
import {
  formatPhoneDisplay,
  formatPhoneEntryDisplay,
  getPatientPhoneEntries,
  getPrimaryPatientPhoneDisplay,
} from "../utils/contactValidation";
import { getPatientInitials } from "../utils/patientDisplay";
import type {
  AppointmentGroup,
  PatientHubInsurancePolicy,
  PatientHubSidebarFactProps,
  PatientHubSidebarSectionProps,
  PatientRecord,
} from "../types";

export function getPrimaryPhone(patient: PatientRecord) {
  return getPrimaryPatientPhoneDisplay(patient);
}

function SidebarFact({
  icon: Icon = null,
  prefix = null,
  value,
}: PatientHubSidebarFactProps) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-2 text-[12px] text-[var(--color-cf-sidebar-text-muted)]">
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-50" />
      ) : (
        <span className="w-3.5 shrink-0 text-center text-[10px] opacity-50">
          {prefix}
        </span>
      )}
      <span
        className="min-w-0 truncate text-[var(--color-cf-sidebar-text)] select-text"
        title={String(value)}
      >
        {value}
      </span>
    </div>
  );
}

function SidebarSection({ title, children }: PatientHubSidebarSectionProps) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-cf-sidebar-text-muted)]">
        {title}
      </div>
      {children}
    </div>
  );
}

export default function PatientIdentitySidebar({
  patient,
  patientName,
  insurancePolicies,
  appointmentGroups,
}: {
  patient: PatientRecord;
  patientName: string;
  insurancePolicies: PatientHubInsurancePolicy[];
  appointmentGroups: AppointmentGroup;
}) {
  const nextVisit = appointmentGroups.upcoming[0] || null;
  const pronouns = patient.pronouns || patient.gender_name || "";
  const emergencyPhone = formatPhoneDisplay(patient.emergency_contact_phone);
  const phoneEntries = getPatientPhoneEntries(patient);

  return (
    <aside
      className="flex h-full w-52 shrink-0 flex-col overflow-auto border-r"
      style={{
        background: "var(--color-cf-sidebar-bg)",
        borderColor: "var(--color-cf-sidebar-border)",
      }}
    >
      <div className="flex-none px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold text-[var(--color-cf-sidebar-accent)]">
            {getPatientInitials(patient)}
          </div>
          <div className="min-w-0">
            <div
              className="truncate text-sm font-semibold text-[var(--color-cf-sidebar-accent)] select-text"
              title={patientName}
            >
              {patientName}
            </div>
            <div className="text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
              {patient.chart_number || "No MRN"}
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-cf-sidebar-text)]">
            {patient.is_active === false ? "Inactive" : "Active"}
          </span>
          {pronouns ? (
            <span className="inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
              {pronouns}
            </span>
          ) : null}
        </div>

        <div className="mt-3 space-y-1.5">
          <SidebarFact
            prefix="DOB"
            value={
              patient.date_of_birth ? formatDOB(patient.date_of_birth) : ""
            }
          />
          {phoneEntries.map((phone) => (
            <SidebarFact
              key={`${phone.label}-${phone.number}`}
              icon={Phone}
              value={formatPhoneEntryDisplay(phone)}
            />
          ))}
          <SidebarFact icon={Mail} value={patient.email} />
        </div>
      </div>

      <div className="mx-4 border-t border-[var(--color-cf-sidebar-border)]" />

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-[12px]">
        <SidebarSection title="Care Team">
          <div className="space-y-1">
            <div className="flex gap-1.5">
              <span className="w-8 shrink-0 text-[var(--color-cf-sidebar-text-muted)]">
                PCP
              </span>
              <span className="text-[var(--color-cf-sidebar-text)]">
                {patient.pcp_name || "—"}
              </span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-8 shrink-0 text-[var(--color-cf-sidebar-text-muted)]">
                Ref.
              </span>
              <span className="text-[var(--color-cf-sidebar-text)]">
                {patient.referring_provider_name || "—"}
              </span>
            </div>
          </div>
        </SidebarSection>

        <SidebarSection title="Insurance">
          {insurancePolicies.length ? (
            insurancePolicies.slice(0, 2).map((policy) => (
              <div
                key={policy.id}
                className="mb-1.5 rounded-lg bg-white/[0.06] px-2.5 py-2"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-semibold text-[var(--color-cf-sidebar-text)]">
                    {policy.carrier_name || "Insurance"}
                  </span>
                  <span className="shrink-0 text-[10px] text-[var(--color-cf-sidebar-text-muted)]">
                    {formatCoverageOrder(
                      policy.coverage_order,
                      policy.is_primary
                    )}
                  </span>
                </div>
                <div className="truncate text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
                  {[
                    policy.plan_name,
                    policy.member_id && `ID ${policy.member_id}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Policy details"}
                </div>
              </div>
            ))
          ) : (
            <div className="text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
              No active policies
            </div>
          )}
        </SidebarSection>

        <SidebarSection title="Emergency">
          {patient.emergency_contact_name ||
          patient.emergency_contact_relationship ||
          patient.emergency_contact_phone ? (
            <div className="rounded-lg bg-white/[0.06] px-2.5 py-2">
              <div
                className="truncate text-[11px] font-semibold text-[var(--color-cf-sidebar-text)] select-text"
                title={patient.emergency_contact_name || undefined}
              >
                {patient.emergency_contact_name || "Emergency contact"}
              </div>
              <div
                className="truncate text-[11px] text-[var(--color-cf-sidebar-text-muted)] select-text"
                title={
                  [patient.emergency_contact_relationship, emergencyPhone]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
              >
                {[patient.emergency_contact_relationship, emergencyPhone]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
              No contact saved
            </div>
          )}
        </SidebarSection>

        <SidebarSection title="Next Visit">
          {nextVisit ? (
            <div className="rounded-lg bg-white/[0.06] px-2.5 py-2">
              <div className="text-[11px] font-semibold text-[var(--color-cf-sidebar-text)]">
                {formatDateTime(nextVisit.appointment_time)}
              </div>
              <div className="truncate text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
                {[
                  nextVisit.appointment_type_name,
                  nextVisit.rendering_provider_name,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Appointment"}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
              No upcoming visit
            </div>
          )}
        </SidebarSection>
      </div>
    </aside>
  );
}
