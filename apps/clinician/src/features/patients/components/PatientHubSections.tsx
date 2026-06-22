import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  CreditCard,
  FileText,
  IdCard,
  Pill,
  RotateCw,
  ShieldCheck,
} from "lucide-react";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { PatientAddress } from "../../../shared/types/domain";
import type {
  InsurancePolicyFormValues,
  PatientHubInsurancePolicy,
  PatientHubTab,
  PatientRecord,
} from "../types";

export const HUB_TABS: PatientHubTab[] = [
  { key: "registration", label: "Registration", icon: IdCard },
  { key: "insurance", label: "Insurance", icon: ShieldCheck },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "medications", label: "Medications", icon: Pill },
  { key: "refills", label: "Refills", icon: RotateCw },
  { key: "allergies", label: "Allergies", icon: AlertTriangle },
  { key: "appointments", label: "Appointments", icon: CalendarClock },
  { key: "timeline", label: "Timeline", icon: Activity },
  { key: "notes", label: "Clinical", icon: ClipboardList },
  { key: "billing", label: "Billing", icon: CreditCard },
];

export const RACE_LABELS: Record<string, string> = {
  american_indian_or_alaska_native: "American Indian or Alaska Native",
  asian: "Asian",
  black_or_african_american: "Black or African American",
  native_hawaiian_or_other_pacific_islander:
    "Native Hawaiian or Other Pacific Islander",
  white: "White",
  other: "Other",
  unknown: "Unknown",
};

export const ETHNICITY_LABELS: Record<string, string> = {
  hispanic_or_latino: "Hispanic or Latino",
  not_hispanic_or_latino: "Not Hispanic or Latino",
  unknown: "Unknown",
};

export function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString();
  } catch {
    return value;
  }
}

export function formatCoverageOrder(
  value?: string | null,
  isPrimary?: boolean | null
) {
  if (isPrimary) return "Primary";

  const labels: Record<string, string> = {
    secondary: "Secondary",
    tertiary: "Tertiary",
    other: "Other",
  };

  return value ? labels[value] || "Secondary" : "Secondary";
}

function getCoverageOrder(value?: string | null, isPrimary?: boolean | null) {
  if (value) return value;
  return isPrimary ? "primary" : "secondary";
}

function parsePolicyBoundary(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function policyTimeframesOverlap(
  left: Pick<PatientHubInsurancePolicy, "effective_date" | "termination_date">,
  right: Pick<InsurancePolicyFormValues, "effective_date" | "termination_date">
) {
  const leftStart = parsePolicyBoundary(
    left.effective_date,
    new Date(-8640000000000000)
  );
  const leftEnd = parsePolicyBoundary(
    left.termination_date,
    new Date(8640000000000000)
  );
  const rightStart = parsePolicyBoundary(
    right.effective_date,
    new Date(-8640000000000000)
  );
  const rightEnd = parsePolicyBoundary(
    right.termination_date,
    new Date(8640000000000000)
  );

  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function findConflictingInsurancePolicy(
  policies: PatientHubInsurancePolicy[],
  values: InsurancePolicyFormValues,
  editingPolicyId: PatientHubInsurancePolicy["id"] | null = null
) {
  const coverageOrder = getCoverageOrder(
    values.coverage_order,
    values.is_primary
  );
  if (coverageOrder === "other" || values.is_active === false) return null;

  return (
    policies.find((policy) => {
      if (editingPolicyId && policy.id === editingPolicyId) return false;
      if (policy.is_active === false) return false;
      if (
        getCoverageOrder(policy.coverage_order, policy.is_primary) !==
        coverageOrder
      ) {
        return false;
      }

      return policyTimeframesOverlap(policy, values);
    }) || null
  );
}

export function formatPolicyDateRange(policy: PatientHubInsurancePolicy) {
  return `${formatDate(policy.effective_date)} to ${
    policy.termination_date ? formatDate(policy.termination_date) : "ongoing"
  }`;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

export function formatAddress(address?: PatientAddress | null) {
  if (!address?.line_1) return "";

  const cityStateZip = [
    address.city,
    [address.state, address.zip_code].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return [address.line_1, address.line_2, cityStateZip]
    .filter(Boolean)
    .join(" • ");
}

export function formatMaskedSsn(patient?: PatientRecord | null) {
  const digits = String(patient?.ssn || "").replace(/\D/g, "");
  const last4 = digits.slice(-4) || patient?.ssn_last4 || "";

  return last4 ? `***-**-${last4}` : "—";
}

export function formatDeclinableValue(
  value?: string | null,
  declined?: boolean | null,
  labels: Record<string, string> | null = null
) {
  if (declined) return "Declined";
  if (!value) return "";
  return labels?.[value] || value;
}

export function DetailRow({
  label,
  value,
  icon: Icon = null,
  className = "",
}: {
  label: string;
  value?: ReactNode;
  icon?: LucideIcon | null;
  className?: string;
}) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const displayValue = hasValue ? value : "—";
  const titleValue =
    typeof displayValue === "string" || typeof displayValue === "number"
      ? String(displayValue)
      : undefined;

  return (
    <div
      className={[
        "min-w-0 rounded-xl border border-cf-border bg-cf-surface px-3 py-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cf-text-subtle">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div
        className="mt-1.5 min-w-0 whitespace-pre-wrap break-words text-sm font-medium leading-5 text-cf-text select-text"
        title={titleValue}
      >
        {displayValue}
      </div>
    </div>
  );
}

export { EmptyState } from "../../../shared/components/ui";
