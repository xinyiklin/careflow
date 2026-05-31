import {
  Cake,
  Mail,
  Phone,
  Stethoscope,
  Shield,
  Siren,
  Clock,
  CalendarClock,
  Copy,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatCoverageOrder, formatDateTime } from "./PatientHubSections";
import { formatDOB } from "../../../shared/utils/dateTime";
import { useCopyToClipboard } from "../../../shared/hooks/useCopyToClipboard";
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
  PatientRecord,
} from "../types";

export function getPrimaryPhone(patient: PatientRecord) {
  return getPrimaryPatientPhoneDisplay(patient);
}

function SidebarFact({
  icon: Icon = null,
  prefix = null,
  value,
  copyValue,
}: PatientHubSidebarFactProps) {
  const { copied, copy } = useCopyToClipboard();
  if (!value) return null;

  const fullValue = typeof value === "string" ? value : String(value);
  const textToCopy = copyValue ?? fullValue;

  return (
    <div className="group/fact flex items-center gap-2 text-[12px] text-[var(--color-cf-sidebar-text-muted)]">
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-50" />
      ) : (
        <span className="w-3.5 shrink-0 text-center text-[10px] font-semibold opacity-50">
          {prefix}
        </span>
      )}
      <button
        type="button"
        onClick={() => copy(textToCopy)}
        title={copied ? "Copied" : fullValue}
        className="min-w-0 flex-1 cursor-pointer truncate text-left text-[var(--color-cf-sidebar-text)] transition-colors hover:text-[var(--color-cf-sidebar-accent)]"
      >
        {value}
      </button>
      <span
        aria-hidden
        className="shrink-0 text-[var(--color-cf-sidebar-text-muted)] opacity-0 transition-opacity group-hover/fact:opacity-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Copy className="h-3 w-3 opacity-60" />
        )}
      </span>
    </div>
  );
}

type SidebarSectionProps = {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
};

function SidebarSection({ title, icon: Icon, children }: SidebarSectionProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-cf-sidebar-text-muted)]">
        {Icon ? <Icon className="h-3 w-3 shrink-0 opacity-60" /> : null}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function getMiniCardGradient(
  coverageOrder: string | null | undefined,
  isPrimary: boolean | null | undefined
) {
  const order = coverageOrder || (isPrimary ? "primary" : "secondary");
  switch (order) {
    case "primary":
      return "from-[#1e293b]/70 via-[#1e1b4b]/70 to-[#0f172a]/70";
    case "secondary":
      return "from-[#1e293b]/70 via-[#064e3b]/70 to-[#0f172a]/70";
    case "tertiary":
      return "from-[#1e293b]/70 via-[#581c87]/70 to-[#0f172a]/70";
    default:
      return "from-[#1e293b]/70 via-[#334155]/70 to-[#0f172a]/70";
  }
}

function InsuranceMiniCard({ policy }: { policy: PatientHubInsurancePolicy }) {
  const { copied, copy } = useCopyToClipboard();
  const cardBg = getMiniCardGradient(policy.coverage_order, policy.is_primary);

  return (
    <div
      className={`mb-2 rounded-xl border border-white/[0.05] bg-gradient-to-br ${cardBg} group/mini-card relative overflow-hidden p-2.5 shadow-sm transition duration-200 hover:border-white/[0.12]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/[0.06]" />
      <div className="relative z-10 flex items-center justify-between gap-1.5">
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-white">
          {policy.carrier_name || "Insurance"}
        </span>
        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/90">
          {formatCoverageOrder(policy.coverage_order, policy.is_primary)}
        </span>
      </div>
      <div className="relative z-10 mt-1 truncate text-[10px] font-medium text-white/70">
        {policy.plan_name || "Standard Plan"}
      </div>
      {policy.member_id ? (
        <button
          type="button"
          onClick={() => copy(policy.member_id)}
          title={copied ? "Copied" : "Copy member ID"}
          className="relative z-10 mt-0.5 flex w-full cursor-pointer items-center gap-1 truncate text-left font-mono text-[10px] tracking-wider text-white/50 transition-colors hover:text-white/80"
        >
          <span className="truncate">ID: {policy.member_id}</span>
          {copied ? (
            <Check className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
          ) : (
            <Copy className="h-2.5 w-2.5 shrink-0 opacity-0 transition-opacity group-hover/mini-card:opacity-60" />
          )}
        </button>
      ) : (
        <div className="relative z-10 mt-0.5 truncate font-mono text-[10px] tracking-wider text-white/50">
          —
        </div>
      )}
    </div>
  );
}

function CareTeamRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="group/row flex items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-white/[0.03] px-2.5 py-1.5">
      <span className="shrink-0 font-medium text-[var(--color-cf-sidebar-text-muted)]">
        {label}
      </span>
      {value ? (
        <button
          type="button"
          onClick={() => copy(value)}
          title={copied ? "Copied" : value}
          className="flex min-w-0 cursor-pointer items-center justify-end gap-1.5 font-semibold text-[var(--color-cf-sidebar-text)] transition-colors hover:text-[var(--color-cf-sidebar-accent)]"
        >
          <span className="truncate">{value}</span>
          {copied ? (
            <Check className="h-3 w-3 shrink-0 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/row:opacity-60" />
          )}
        </button>
      ) : (
        <span className="min-w-0 truncate text-right font-semibold text-[var(--color-cf-sidebar-text)]">
          —
        </span>
      )}
    </div>
  );
}

function EmergencyContactCard({
  name,
  relationship,
  phone,
}: {
  name?: string | null;
  relationship?: string | null;
  phone: string;
}) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="group/ec space-y-1 rounded-xl border border-white/[0.04] bg-white/[0.03] p-2.5">
      <div
        className="truncate font-semibold text-[var(--color-cf-sidebar-text)] select-text"
        title={name || undefined}
      >
        {name || "Emergency contact"}
      </div>
      {relationship || phone ? (
        <div className="flex min-w-0 items-center gap-1 text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
          {relationship ? (
            <span className="min-w-0 truncate">{relationship}</span>
          ) : null}
          {relationship && phone ? (
            <span className="shrink-0 opacity-50">·</span>
          ) : null}
          {phone ? (
            <button
              type="button"
              onClick={() => copy(phone)}
              title={copied ? "Copied" : phone}
              className="flex shrink-0 cursor-pointer items-center gap-1 transition-colors hover:text-[var(--color-cf-sidebar-text)]"
            >
              <span>{phone}</span>
              {copied ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/ec:opacity-60" />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
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
  const { copied: mrnCopied, copy: copyMrn } = useCopyToClipboard({
    resetDelayMs: 2000,
  });
  const lastVisit = appointmentGroups.recent[0] || null;
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 text-sm font-bold text-[var(--color-cf-sidebar-accent)] shadow-sm">
            {getPatientInitials(patient)}
          </div>
          <div className="min-w-0">
            <div
              className="truncate text-sm font-semibold text-[var(--color-cf-sidebar-accent)] select-text"
              title={patientName}
            >
              {patientName}
            </div>
            <div className="flex items-center gap-1 mt-0.5 group/mrn">
              <span className="text-[11px] text-[var(--color-cf-sidebar-text-muted)] select-all font-medium">
                MRN {patient.chart_number || "—"}
              </span>
              {patient.chart_number ? (
                <button
                  type="button"
                  onClick={() => copyMrn(patient.chart_number)}
                  className="opacity-0 group-hover/mrn:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10 text-[var(--color-cf-sidebar-text-muted)] hover:text-white cursor-pointer"
                  title={mrnCopied ? "Copied" : "Copy MRN"}
                >
                  {mrnCopied ? (
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-1">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            <span className="h-1 w-1 rounded-full bg-emerald-400 mr-1.5" />
            {patient.is_active === false ? "Inactive" : "Active"}
          </span>
          {pronouns ? (
            <span className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[var(--color-cf-sidebar-text-muted)]">
              {pronouns}
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-2 border-t border-[var(--color-cf-sidebar-border)] pt-3">
          <SidebarFact
            icon={Cake}
            value={
              patient.date_of_birth ? formatDOB(patient.date_of_birth) : ""
            }
          />
          {phoneEntries.map((phone) => (
            <SidebarFact
              key={`${phone.label}-${phone.number}`}
              icon={Phone}
              value={formatPhoneEntryDisplay(phone)}
              copyValue={phone.formattedNumber}
            />
          ))}
          <SidebarFact icon={Mail} value={patient.email} />
        </div>
      </div>

      <div className="mx-4 border-t border-[var(--color-cf-sidebar-border)]" />

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-[12px]">
        <SidebarSection title="Care Team" icon={Stethoscope}>
          <div className="space-y-1.5">
            <CareTeamRow label="PCP" value={patient.pcp_name} />
            <CareTeamRow label="Ref." value={patient.referring_provider_name} />
          </div>
        </SidebarSection>

        <SidebarSection title="Insurance" icon={Shield}>
          {insurancePolicies.length ? (
            insurancePolicies
              .slice(0, 2)
              .map((policy) => (
                <InsuranceMiniCard key={policy.id} policy={policy} />
              ))
          ) : (
            <div className="text-[11px] text-[var(--color-cf-sidebar-text-muted)] italic px-1">
              No active policies
            </div>
          )}
        </SidebarSection>

        <SidebarSection title="Emergency" icon={Siren}>
          {patient.emergency_contact_name ||
          patient.emergency_contact_relationship ||
          patient.emergency_contact_phone ? (
            <EmergencyContactCard
              name={patient.emergency_contact_name}
              relationship={patient.emergency_contact_relationship}
              phone={emergencyPhone}
            />
          ) : (
            <div className="text-[11px] text-[var(--color-cf-sidebar-text-muted)] italic px-1">
              No contact saved
            </div>
          )}
        </SidebarSection>

        <SidebarSection title="Last Visit" icon={Clock}>
          {lastVisit ? (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.03] p-2.5 space-y-1">
              <div className="font-semibold text-[var(--color-cf-sidebar-text)] leading-tight">
                {formatDateTime(lastVisit.appointment_time)}
              </div>
              <div className="truncate text-[11px] text-[var(--color-cf-sidebar-text-muted)]">
                {[
                  lastVisit.appointment_type_name,
                  lastVisit.rendering_provider_name,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Appointment"}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-[var(--color-cf-sidebar-text-muted)] italic px-1">
              No past visits
            </div>
          )}
        </SidebarSection>

        <SidebarSection title="Next Visit" icon={CalendarClock}>
          {nextVisit ? (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.03] p-2.5 space-y-1">
              <div className="font-semibold text-[var(--color-cf-sidebar-text)] leading-tight">
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
            <div className="text-[11px] text-[var(--color-cf-sidebar-text-muted)] italic px-1">
              No upcoming visit
            </div>
          )}
        </SidebarSection>
      </div>
    </aside>
  );
}
