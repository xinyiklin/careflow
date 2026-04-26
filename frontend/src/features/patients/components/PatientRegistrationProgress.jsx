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

export function buildRegistrationSteps(values) {
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

function PreviewMetric({ label, value, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-cf-border bg-cf-surface text-cf-text";

  return (
    <div className={["rounded-2xl border px-3 py-3", toneClass].join(" ")}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-semibold tracking-tight">
        {value || "—"}
      </div>
    </div>
  );
}

export function RegistrationProgressRibbon({ steps, completionPercent }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-cf-border bg-gradient-to-br from-cf-surface via-cf-surface to-cf-surface-muted/60 p-4 shadow-[var(--shadow-panel)]">
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
                  ? "border-cf-text bg-cf-text text-white"
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

export function RegistrationRail({ steps }) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-0 rounded-3xl border border-cf-border bg-cf-surface p-3 shadow-[var(--shadow-panel)]">
        <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
          Registration
        </div>
        <div className="space-y-1">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className={[
                  "flex items-start gap-3 rounded-2xl px-3 py-3",
                  step.complete
                    ? "bg-cf-text text-white shadow-[var(--shadow-panel)]"
                    : "text-cf-text-muted hover:bg-cf-surface-muted/70",
                ].join(" ")}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{step.label}</div>
                  <div
                    className={[
                      "mt-0.5 text-xs",
                      step.complete ? "text-white/70" : "text-cf-text-subtle",
                    ].join(" ")}
                  >
                    {step.meta}
                  </div>
                </div>
              </div>
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
}) {
  const primaryPhone = getPrimaryPhone(values);
  const addressPreview = getAddressPreview(values);
  const pcpName = getProviderName(careProviders, values?.pcp);
  const referringName = getProviderName(
    careProviders,
    values?.referring_provider
  );

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-0 overflow-hidden rounded-3xl border border-cf-border bg-cf-surface shadow-[var(--shadow-panel)]">
        <div className="bg-gradient-to-b from-cf-surface-muted/75 to-cf-surface px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
              Registration lens
            </div>
            <ShieldCheck className="h-4 w-4 text-cf-text-subtle" />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-sm font-semibold tracking-[0.12em] text-blue-900 ring-1 ring-blue-200/70">
              {patientInitials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-cf-text">
                {patientName}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-cf-text-subtle">
                {patient?.chart_number || "MRN pending"}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-2">
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

          <section>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
              Address
            </div>
            <div className="mt-2 rounded-2xl border border-cf-border bg-cf-surface-muted/55 px-3 py-3 text-sm font-medium leading-snug text-cf-text">
              {addressPreview || "No address entered"}
            </div>
          </section>

          <section>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
              Care routing
            </div>
            <div className="mt-2 space-y-2">
              <div className="rounded-2xl border border-cf-border bg-cf-surface px-3 py-3">
                <div className="text-xs text-cf-text-subtle">PCP</div>
                <div className="mt-0.5 truncate text-sm font-semibold text-cf-text">
                  {pcpName || "Not selected"}
                </div>
              </div>
              <div className="rounded-2xl border border-cf-border bg-cf-surface px-3 py-3">
                <div className="text-xs text-cf-text-subtle">Referring</div>
                <div className="mt-0.5 truncate text-sm font-semibold text-cf-text">
                  {referringName || "Not selected"}
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
              Safety contact
            </div>
            <div className="mt-2 rounded-2xl border border-cf-border bg-cf-surface px-3 py-3">
              <div className="text-sm font-semibold text-cf-text">
                {primaryEmergencyContact?.name?.trim() || "Not added"}
              </div>
              <div className="mt-1 text-xs text-cf-text-muted">
                {[
                  primaryEmergencyContact?.relationship,
                  primaryEmergencyContact?.phone_number,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Emergency contact improves intake readiness"}
              </div>
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
}
