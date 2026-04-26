import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  IdCard,
  MapPin,
  Phone,
  Pill,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { Badge } from "../../../shared/components/ui";

export const HUB_TABS = [
  { key: "registration", label: "Registration", icon: IdCard },
  { key: "insurance", label: "Insurance", icon: ShieldCheck },
  { key: "medications", label: "Medications", icon: Pill },
  { key: "allergies", label: "Allergies", icon: AlertTriangle },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "notes", label: "Progress Notes", icon: ClipboardList },
  { key: "appointments", label: "Encounters", icon: CalendarClock },
];

export const RACE_LABELS = {
  american_indian_or_alaska_native: "American Indian or Alaska Native",
  asian: "Asian",
  black_or_african_american: "Black or African American",
  native_hawaiian_or_other_pacific_islander:
    "Native Hawaiian or Other Pacific Islander",
  white: "White",
  other: "Other",
  unknown: "Unknown",
};

export const ETHNICITY_LABELS = {
  hispanic_or_latino: "Hispanic or Latino",
  not_hispanic_or_latino: "Not Hispanic or Latino",
  unknown: "Unknown",
};

export function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString();
  } catch {
    return value;
  }
}

export function formatCoverageOrder(value, isPrimary = false) {
  if (isPrimary) return "Primary";

  const labels = {
    secondary: "Secondary",
    tertiary: "Tertiary",
    other: "Other",
  };

  return labels[value] || "Secondary";
}

export function getCoverageOrder(value, isPrimary = false) {
  if (value) return value;
  return isPrimary ? "primary" : "secondary";
}

function parsePolicyBoundary(value, fallback) {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function policyTimeframesOverlap(left, right) {
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
  policies,
  values,
  editingPolicyId = null
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

export function formatPolicyDateRange(policy) {
  return `${formatDate(policy.effective_date)} to ${
    policy.termination_date ? formatDate(policy.termination_date) : "ongoing"
  }`;
}

export function formatDateTime(value) {
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
    return value;
  }
}

export function formatAddress(address) {
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

export function formatMaskedSsn(patient) {
  const digits = String(patient?.ssn || "").replace(/\D/g, "");
  const last4 = digits.slice(-4) || patient?.ssn_last4 || "";

  return last4 ? `***-**-${last4}` : "—";
}

export function formatFullSsn(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 9) return "";

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function formatDeclinableValue(value, declined, labels = null) {
  if (declined) return "Declined";
  if (!value) return "";
  return labels?.[value] || value;
}

export function DetailRow({ label, value, icon: Icon = null, className = "" }) {
  const hasValue = value !== null && value !== undefined && value !== "";

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
      <div className="mt-1.5 min-w-0 whitespace-pre-wrap break-words text-sm font-medium leading-5 text-cf-text">
        {hasValue ? value : "—"}
      </div>
    </div>
  );
}

export function SectionHeader({ title, description }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-cf-text">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-cf-text-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function SummaryTile({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-cf-text-subtle">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-cf-text">
        {value || "—"}
      </div>
    </div>
  );
}

export function TabButton({ tab, isActive, onClick }) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={() => onClick(tab.key)}
      className={[
        "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition",
        isActive
          ? "border-cf-accent text-cf-text"
          : "border-transparent text-cf-text-muted hover:text-cf-text",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {tab.label}
    </button>
  );
}

export function AppointmentCard({ appointment }) {
  const appointmentDate = formatDateTime(appointment.appointment_time);

  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-3 transition hover:border-cf-border-strong hover:bg-cf-surface-muted/60">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <Clock className="h-4 w-4 shrink-0 text-cf-text-subtle" />
            <span className="truncate">{appointmentDate}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {appointment.appointment_type_name ? (
              <Badge variant="outline">
                {appointment.appointment_type_name}
              </Badge>
            ) : null}
            {appointment.status_name ? (
              <Badge variant="muted">{appointment.status_name}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm text-cf-text-muted">
        {appointment.rendering_provider_name || "—"}
        {appointment.room ? ` • ${appointment.room}` : ""}
      </div>

      {appointment.reason ? (
        <div className="mt-1.5 line-clamp-2 text-sm text-cf-text-muted">
          {appointment.reason}
        </div>
      ) : null}
    </div>
  );
}

export function InsurancePolicyCard({ policy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-cf-border bg-cf-surface px-4 py-4 text-left transition hover:border-cf-border-strong hover:bg-cf-surface-muted/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <ShieldCheck className="h-4 w-4 shrink-0 text-cf-text-subtle" />
            <span className="truncate">{policy.carrier_name}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={policy.is_primary ? "success" : "muted"}>
              {formatCoverageOrder(policy.coverage_order, policy.is_primary)}
            </Badge>
            <Badge variant={policy.is_active ? "outline" : "warning"}>
              {policy.is_active ? "Active" : "Terminated"}
            </Badge>
          </div>
        </div>
        <Badge variant="muted">
          {policy.relationship_to_subscriber || "self"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailRow
          icon={CreditCard}
          label="Member ID"
          value={policy.member_id}
        />
        <DetailRow icon={IdCard} label="Group" value={policy.group_number} />
        <DetailRow icon={FileText} label="Plan" value={policy.plan_name} />
        <DetailRow
          icon={UserRoundCheck}
          label="Subscriber"
          value={policy.subscriber_name}
        />
      </div>

      <div className="mt-3 text-xs text-cf-text-subtle">
        Effective {formatDate(policy.effective_date)}
        {policy.termination_date
          ? ` • Ends ${formatDate(policy.termination_date)}`
          : ""}
      </div>
    </button>
  );
}

export function PharmacyPreferenceCard({ preference }) {
  const pharmacy = preference.pharmacy || {};

  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <Pill className="h-4 w-4 shrink-0 text-cf-text-subtle" />
            <span className="truncate">
              {preference.pharmacy_name || pharmacy.name}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {preference.is_default ? (
              <Badge variant="success">Default</Badge>
            ) : null}
            {pharmacy.accepts_erx ? <Badge variant="outline">eRx</Badge> : null}
            {pharmacy.service_type ? (
              <Badge variant="muted">{pharmacy.service_type}</Badge>
            ) : null}
          </div>
        </div>
        <Badge variant={preference.is_active === false ? "warning" : "outline"}>
          {preference.is_active === false ? "Inactive" : "Active"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <DetailRow icon={IdCard} label="NCPDP" value={pharmacy.ncpdp_id} />
        <DetailRow icon={IdCard} label="NPI" value={pharmacy.npi} />
        <DetailRow icon={Phone} label="Phone" value={pharmacy.phone_number} />
        <DetailRow icon={Phone} label="Fax" value={pharmacy.fax_number} />
        <DetailRow
          icon={MapPin}
          label="Address"
          value={formatAddress(pharmacy.address)}
        />
      </div>

      {preference.notes ? (
        <div className="mt-3 rounded-xl border border-cf-border bg-cf-surface-muted/50 px-3 py-2 text-sm text-cf-text-muted">
          {preference.notes}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-cf-border bg-cf-surface-muted px-6 py-6 text-center">
      <div>
        <div className="text-sm font-medium text-cf-text">{title}</div>
        <div className="mt-1 text-sm text-cf-text-muted">{body}</div>
      </div>
    </div>
  );
}
