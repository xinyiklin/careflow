import {
  HeartPulse,
  IdCard,
  Mail,
  MapPin,
  ShieldCheck,
  Siren,
} from "lucide-react";

import { Badge } from "../../../shared/components/ui";
import {
  getAddressPreview,
  getPrimaryPhone,
  getProviderName,
} from "./patientModalData";

import type { LucideIcon } from "lucide-react";
import type { FieldErrors } from "react-hook-form";
import type {
  EmergencyContactFormValues,
  PatientCareProvider,
  PatientFormValues,
  PatientRecord,
} from "../types";

export type RegistrationStep = {
  key: string;
  label: string;
  meta: string;
  icon: LucideIcon;
  complete: boolean;
};

export function getStepErrors(
  stepKey: string,
  errors: FieldErrors<PatientFormValues>
): boolean {
  switch (stepKey) {
    case "identity":
      return Boolean(
        errors.first_name ||
        errors.last_name ||
        errors.date_of_birth ||
        errors.ssn
      );
    case "contact":
      return Boolean(
        errors.email ||
        errors.phone_cell ||
        errors.phone_home ||
        errors.phone_work
      );
    case "address":
      return Boolean(
        errors.address_line_1 ||
        errors.address_line_2 ||
        errors.address_city ||
        errors.address_state ||
        errors.address_zip_code
      );
    case "clinical":
      return Boolean(
        errors.gender ||
        errors.sex_at_birth ||
        errors.race ||
        errors.ethnicity ||
        errors.preferred_language ||
        errors.pronouns ||
        errors.pcp ||
        errors.referring_provider
      );
    case "contacts":
      return Boolean(errors.emergency_contacts);
    default:
      return false;
  }
}

type PreviewMetricProps = {
  label: string;
  value?: string | number | null;
  tone?: "default" | "success" | "warning";
};

type RegistrationProgressRibbonProps = {
  steps: RegistrationStep[];
  completionPercent: number;
};

type RegistrationRailProps = {
  steps: RegistrationStep[];
  activeStep: string;
  onStepClick: (stepKey: string) => void;
  errors: FieldErrors<PatientFormValues>;
};

type RegistrationLensProps = {
  patientName: string;
  patientInitials: string;
  patient?: PatientRecord | null;
  values: Partial<PatientFormValues>;
  maskedSsn: string;
  careProviders: PatientCareProvider[];
  primaryEmergencyContact?: EmergencyContactFormValues | null;
};

export function buildRegistrationSteps(
  values: Partial<PatientFormValues>
): RegistrationStep[] {
  const hasName = Boolean(
    values?.first_name?.trim() && values?.last_name?.trim()
  );
  const hasDob = Boolean(values?.date_of_birth);
  const hasPhone = Boolean(getPrimaryPhone(values));
  const hasAddress = Boolean(values?.address_line_1?.trim());
  const hasGender = Boolean(values?.gender);
  const hasEmergencyContact = (values?.emergency_contacts || []).some(
    (contact) =>
      contact?.name?.trim() ||
      contact?.relationship?.trim() ||
      contact?.phone_number?.trim()
  );

  return [
    {
      key: "identity",
      label: "Identity",
      meta: hasName && hasDob ? "Name and DOB ready" : "Name and DOB needed",
      icon: IdCard,
      complete: hasName && hasDob,
    },
    {
      key: "contact",
      label: "Contact",
      meta: hasPhone ? "Reachable phone on file" : "Phone needed",
      icon: Mail,
      complete: hasPhone,
    },
    {
      key: "address",
      label: "Address",
      meta: hasAddress ? "Address captured" : "Address optional",
      icon: MapPin,
      complete: hasAddress,
    },
    {
      key: "clinical",
      label: "Clinical",
      meta: hasGender ? "Profile started" : "Gender required",
      icon: HeartPulse,
      complete: hasGender,
    },
    {
      key: "contacts",
      label: "Safety",
      meta: hasEmergencyContact ? "Emergency contact ready" : "Add contact",
      icon: Siren,
      complete: hasEmergencyContact,
    },
  ];
}

function PreviewMetric({ label, value, tone = "default" }: PreviewMetricProps) {
  const toneClass =
    tone === "success"
      ? "border-cf-success-text/20 bg-cf-success-bg text-cf-success-text"
      : tone === "warning"
        ? "border-cf-warning-text/20 bg-cf-warning-bg text-cf-warning-text"
        : "border-cf-border bg-cf-surface text-cf-text";

  return (
    <div className={["rounded-xl border px-2.5 py-2", toneClass].join(" ")}>
      <div className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-75">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-bold tracking-tight">
        {value || "—"}
      </div>
    </div>
  );
}

export function RegistrationProgressRibbon({
  steps,
  completionPercent,
}: RegistrationProgressRibbonProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
            Intake progress
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight text-cf-text">
              {completionPercent}%
            </span>
            <span className="text-sm text-cf-text-muted">ready to file</span>
          </div>
        </div>
        <Badge variant={completionPercent >= 80 ? "success" : "muted"}>
          {steps.filter((step) => step.complete).length} of {steps.length}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              className={[
                "min-h-16 rounded-xl border px-2 py-2",
                step.complete
                  ? "border-cf-accent bg-cf-accent text-cf-page-bg"
                  : "border-cf-border bg-cf-surface-muted/70 text-cf-text-muted",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              <div className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.12em]">
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function RegistrationRail({
  steps,
  activeStep,
  onStepClick,
  errors,
}: RegistrationRailProps) {
  return (
    <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-cf-border bg-cf-surface-muted/55">
      <div className="flex-grow p-4 space-y-1.5 overflow-y-auto">
        <div className="px-2 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-cf-text-subtle">
          Registration Steps
        </div>
        <div className="space-y-1 relative">
          {/* Vertical line running behind stepper circles */}
          <div className="absolute left-[21px] top-6 bottom-6 w-[1.5px] bg-cf-border pointer-events-none" />

          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = step.key === activeStep;
            const hasError = getStepErrors(step.key, errors);

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onStepClick(step.key)}
                className={[
                  "w-full flex items-start gap-3.5 rounded-xl px-2.5 py-3 text-left transition-all duration-150 cursor-pointer relative z-10",
                  isActive
                    ? "bg-cf-accent text-cf-page-bg shadow-sm"
                    : "text-cf-text-muted hover:bg-cf-surface-soft hover:text-cf-text",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition-colors duration-150",
                    isActive
                      ? "border-white/20 bg-white/10 text-white"
                      : hasError
                        ? "border-cf-danger-text/25 bg-cf-danger-bg text-cf-danger-text"
                        : step.complete
                          ? "border-cf-success-text/25 bg-cf-success-bg text-cf-success-text"
                          : "border-cf-border bg-cf-surface text-cf-text-subtle",
                  ].join(" ")}
                >
                  {hasError && !isActive ? (
                    <span className="text-xs font-bold font-mono">!</span>
                  ) : step.complete && !isActive ? (
                    <span className="text-xs">✓</span>
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={[
                      "text-xs font-bold leading-snug",
                      isActive ? "text-white" : "text-cf-text",
                    ].join(" ")}
                  >
                    {step.label}
                  </div>
                  <div
                    className={[
                      "mt-0.5 text-[11px] truncate leading-none",
                      isActive
                        ? "text-white/70"
                        : hasError
                          ? "text-cf-danger-text font-medium"
                          : step.complete
                            ? "text-cf-success-text"
                            : "text-cf-text-subtle",
                    ].join(" ")}
                  >
                    {hasError ? "Fix required fields" : step.meta}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export function RegistrationLens({
  patientName,
  patientInitials,
  patient,
  values,
  maskedSsn,
  careProviders,
  primaryEmergencyContact,
}: RegistrationLensProps) {
  const primaryPhone = getPrimaryPhone(values);
  const addressPreview = getAddressPreview(values);
  const pcpName = getProviderName(careProviders, values?.pcp);
  const referringName = getProviderName(
    careProviders,
    values?.referring_provider
  );

  return (
    <aside className="hidden xl:flex flex-col w-[300px] shrink-0 border-l border-cf-border bg-cf-surface-muted/30">
      <div className="border-b border-cf-border bg-cf-surface-muted/55 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cf-accent/10 text-xs font-bold tracking-[0.08em] text-cf-accent ring-1 ring-cf-accent/15">
            {patientInitials}
          </div>
          <div className="min-w-0">
            <div
              className="truncate text-xs font-semibold text-cf-text"
              title={patientName}
            >
              {patientName || "Unnamed Patient"}
            </div>
            <div className="font-mono text-[10px] text-cf-text-subtle leading-none mt-0.5">
              {patient?.chart_number || "MRN pending"}
            </div>
          </div>
        </div>
        <ShieldCheck className="h-4 w-4 text-cf-text-subtle" />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="grid grid-cols-2 gap-2.5">
          <PreviewMetric label="DOB" value={values?.date_of_birth} />
          <PreviewMetric label="Phone" value={primaryPhone} />
          <PreviewMetric
            label="SSN"
            value={maskedSsn}
            tone={maskedSsn === "Not recorded" ? "warning" : "success"}
          />
          <PreviewMetric
            label="Status"
            value={values?.is_active === false ? "Inactive" : "Active"}
            tone={values?.is_active === false ? "warning" : "success"}
          />
        </div>

        <div className="space-y-4 pt-2">
          <section className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
              Address
            </div>
            <div className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2.5 text-xs font-medium leading-relaxed text-cf-text">
              {addressPreview || (
                <span className="text-cf-text-subtle/70 italic">
                  No address entered
                </span>
              )}
            </div>
          </section>

          <section className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
              Care routing
            </div>
            <div className="grid gap-2">
              <div className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-cf-text-subtle">PCP</span>
                <span
                  className="text-xs font-semibold text-cf-text truncate max-w-[150px]"
                  title={pcpName || "None"}
                >
                  {pcpName || "None"}
                </span>
              </div>
              <div className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-cf-text-subtle">Referring</span>
                <span
                  className="text-xs font-semibold text-cf-text truncate max-w-[150px]"
                  title={referringName || "None"}
                >
                  {referringName || "None"}
                </span>
              </div>
            </div>
          </section>

          <section className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cf-text-subtle">
              Safety contact
            </div>
            <div className="rounded-xl border border-cf-border bg-cf-surface px-3 py-2.5 space-y-1">
              <div className="text-xs font-semibold text-cf-text truncate">
                {primaryEmergencyContact?.name?.trim() || (
                  <span className="text-cf-text-subtle/70 font-normal italic">
                    None added
                  </span>
                )}
              </div>
              {primaryEmergencyContact?.name?.trim() ? (
                <div className="text-[11px] text-cf-text-muted leading-none">
                  {[
                    primaryEmergencyContact?.relationship,
                    primaryEmergencyContact?.phone_number,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
