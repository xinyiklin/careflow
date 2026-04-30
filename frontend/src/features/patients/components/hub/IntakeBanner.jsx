import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "../../../../shared/components/ui";

// Sections are listed in display priority. USCDI v3 demographics (race,
// ethnicity, preferred language) accept "Declined" as a valid filled value;
// the corresponding `*_declined` boolean satisfies the requirement.
const SECTIONS = [
  {
    key: "address",
    label: "Add address",
    tone: "billing",
    isMissing: (patient) => !patient?.address?.line_1,
  },
  {
    key: "emergency",
    label: "Add emergency contact",
    tone: "safety",
    isMissing: (patient, ctx) =>
      !(ctx.emergencyContacts || []).some(
        (contact) =>
          (contact?.name || "").trim() || (contact?.phone_number || "").trim()
      ) &&
      !(patient?.emergency_contact_name || patient?.emergency_contact_phone),
  },
  {
    key: "insurance",
    label: "Add primary insurance",
    tone: "billing",
    isMissing: (_patient, ctx) =>
      !(ctx.insurancePolicies || []).some(
        (policy) => policy?.is_primary || policy?.coverage_order === "primary"
      ),
  },
  {
    key: "sexAtBirth",
    label: "Record sex at birth",
    tone: "clinical",
    isMissing: (patient) => !patient?.sex_at_birth,
  },
  {
    key: "race",
    label: "Record race",
    tone: "uscdi",
    isMissing: (patient) => !patient?.race && !patient?.race_declined,
  },
  {
    key: "ethnicity",
    label: "Record ethnicity",
    tone: "uscdi",
    isMissing: (patient) => !patient?.ethnicity && !patient?.ethnicity_declined,
  },
  {
    key: "language",
    label: "Note preferred language",
    tone: "uscdi",
    isMissing: (patient) =>
      !patient?.preferred_language && !patient?.preferred_language_declined,
  },
  {
    key: "pcp",
    label: "Set PCP",
    tone: "care",
    isMissing: (patient) => !patient?.pcp,
  },
];

export default function IntakeBanner({
  patient,
  insurancePolicies,
  emergencyContacts,
  onJumpTo,
}) {
  const missingSections = useMemo(() => {
    if (!patient) return [];
    return SECTIONS.filter((section) =>
      section.isMissing(patient, {
        insurancePolicies: insurancePolicies || [],
        emergencyContacts: emergencyContacts || [],
      })
    );
  }, [patient, insurancePolicies, emergencyContacts]);

  const completionPercent = Math.round(
    ((SECTIONS.length - missingSections.length) / SECTIONS.length) * 100
  );

  if (!missingSections.length) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-cf-warning-text/35 bg-cf-warning-bg shadow-[var(--shadow-panel)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cf-surface/60 ring-1 ring-cf-warning-text/30">
            <AlertTriangle className="h-4 w-4 text-cf-warning-text" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cf-warning-text/75">
              Intake completeness · {completionPercent}%
            </div>
            <div className="mt-0.5 text-sm font-semibold text-cf-warning-text">
              {missingSections.length} thing
              {missingSections.length === 1 ? " is" : "s are"} missing before
              the next visit
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {missingSections.map((section, index) => (
            <Button
              key={section.key}
              type="button"
              size="sm"
              shape="pill"
              variant={index === 0 ? "primary" : "default"}
              onClick={() => onJumpTo?.(section.key)}
            >
              {section.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
