import { useMemo } from "react";
import { ChevronDown, ChevronUp, DollarSign, FileBarChart } from "lucide-react";

import { Badge } from "../../../shared/components/ui";
import { formatDateTime } from "../../patients/components/PatientHubSections";

import type { ReactNode } from "react";
import type {
  BillingChargeLine,
  BillingDiagnosis,
  BillingRecordStatus,
  EncounterBillingRecord,
} from "../types";

/* ---------- status helpers ---------- */

type StatusMeta = {
  label: string;
  variant: "success" | "muted" | "outline" | "warning";
};

const STATUS_META: Record<string, StatusMeta> = {
  coding_needed: { label: "Coding Needed", variant: "outline" },
  ready_to_submit: { label: "Ready to Submit", variant: "success" },
  claim_created: { label: "Claim Created", variant: "muted" },
};

export function getStatusMeta(
  status?: BillingRecordStatus | string | null
): StatusMeta {
  return STATUS_META[status || ""] || STATUS_META.coding_needed;
}

/* ---------- formatting ---------- */

function formatCurrency(value?: string | number | null) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

/* ---------- BillingSummaryHeader ---------- */

type SummaryMetric = {
  label: string;
  value: ReactNode;
};

export function BillingSummaryHeader({
  records,
}: {
  records: EncounterBillingRecord[];
}) {
  const metrics = useMemo<SummaryMetric[]>(() => {
    const total = records.reduce(
      (sum, r) => sum + Number(r.total_charge_amount || 0),
      0
    );
    const byStatus: Record<string, number> = {};
    for (const record of records) {
      const key = record.status || "coding_needed";
      byStatus[key] = (byStatus[key] || 0) + 1;
    }

    const statusParts = Object.entries(STATUS_META)
      .filter(([key]) => byStatus[key])
      .map(([key, meta]) => `${byStatus[key]} ${meta.label}`)
      .join(" · ");

    return [
      { label: "Records", value: String(records.length) },
      { label: "Total Charges", value: formatCurrency(total) },
      { label: "Status", value: statusParts || "—" },
    ];
  }, [records]);

  if (!records.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
      <div className="flex items-center gap-2 text-cf-text-subtle">
        <FileBarChart className="h-4 w-4" />
      </div>
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-cf-text-subtle">
            {metric.label}
          </div>
          <div className="truncate text-sm font-semibold text-cf-text">
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- StatusFilterChips ---------- */

export type BillingStatusFilter = BillingRecordStatus | "all";

export function StatusFilterChips({
  records,
  activeFilter,
  onFilter,
}: {
  records: EncounterBillingRecord[];
  activeFilter: BillingStatusFilter;
  onFilter: (filter: BillingStatusFilter) => void;
}) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: records.length };
    for (const record of records) {
      const key = record.status || "coding_needed";
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [records]);

  const chips: { key: BillingStatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "coding_needed", label: "Coding Needed" },
    { key: "ready_to_submit", label: "Ready to Submit" },
    { key: "claim_created", label: "Claim Created" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const count = counts[chip.key] || 0;
        const isActive = activeFilter === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => onFilter(chip.key)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25",
              isActive
                ? "bg-cf-accent text-cf-page-bg shadow-sm"
                : "border border-cf-border bg-cf-surface text-cf-text-muted hover:border-cf-border-strong hover:text-cf-text",
            ].join(" ")}
          >
            {chip.label}
            <span
              className={[
                "tabular-nums",
                isActive ? "text-cf-page-bg/70" : "text-cf-text-subtle",
              ].join(" ")}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Compact code chips ---------- */

export function DiagnosisChips({
  diagnoses,
  max = 4,
}: {
  diagnoses?: BillingDiagnosis[];
  max?: number;
}) {
  if (!diagnoses?.length) return null;

  const shown = diagnoses.slice(0, max);
  const remaining = diagnoses.length - shown.length;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((dx, i) => (
        <Badge
          key={dx.id || i}
          variant="outline"
          size="sm"
          className="font-mono text-[10px]"
        >
          {dx.code}
        </Badge>
      ))}
      {remaining > 0 ? (
        <span className="text-[10px] text-cf-text-subtle">+{remaining}</span>
      ) : null}
    </span>
  );
}

export function ServiceCodeChips({
  chargeLines,
  max = 4,
}: {
  chargeLines?: BillingChargeLine[];
  max?: number;
}) {
  if (!chargeLines?.length) return null;

  const shown = chargeLines.slice(0, max);
  const remaining = chargeLines.length - shown.length;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((line, i) => (
        <Badge
          key={line.id || i}
          variant="neutral"
          size="sm"
          className="font-mono text-[10px]"
        >
          {line.service_code}
        </Badge>
      ))}
      {remaining > 0 ? (
        <span className="text-[10px] text-cf-text-subtle">+{remaining}</span>
      ) : null}
    </span>
  );
}

/* ---------- ExpandToggle ---------- */

export function ExpandToggle({
  isExpanded,
  onClick,
}: {
  isExpanded: boolean;
  onClick: () => void;
}) {
  const Icon = isExpanded ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-cf-text-subtle transition hover:bg-cf-surface-soft hover:text-cf-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25"
      aria-label={isExpanded ? "Collapse detail" : "Expand detail"}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/* ---------- BillingRecordExpandedDetail ---------- */

export function BillingRecordExpandedDetail({
  record,
}: {
  record: EncounterBillingRecord;
}) {
  const diagnoses = record.diagnoses || [];
  const chargeLines = record.charge_lines || [];

  return (
    <div className="space-y-4 border-t border-cf-border pt-3">
      {/* Header metadata */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-cf-text-muted">
        {record.payer_name ? (
          <span>
            <span className="font-medium text-cf-text-subtle">Payer</span>{" "}
            {record.payer_name}
          </span>
        ) : null}
        {record.place_of_service ? (
          <span>
            <span className="font-medium text-cf-text-subtle">POS</span>{" "}
            {record.place_of_service}
          </span>
        ) : null}
        {record.rendering_provider_name ? (
          <span>
            <span className="font-medium text-cf-text-subtle">Provider</span>{" "}
            {record.rendering_provider_name}
          </span>
        ) : null}
        {record.updated_at ? (
          <span>
            <span className="font-medium text-cf-text-subtle">Updated</span>{" "}
            {formatDateTime(record.updated_at)}
          </span>
        ) : null}
      </div>

      {/* Diagnoses */}
      {diagnoses.length ? (
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-cf-text-subtle">
            Diagnoses
          </div>
          <div className="space-y-1">
            {diagnoses.map((dx, i) => (
              <div
                key={dx.id || i}
                className="flex items-baseline gap-2 text-xs"
              >
                <span className="font-mono font-semibold text-cf-text">
                  {dx.sequence ?? i + 1}. {dx.code}
                </span>
                {dx.description ? (
                  <span className="truncate text-cf-text-muted">
                    {dx.description}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Charge lines */}
      {chargeLines.length ? (
        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-cf-text-subtle">
            Service Lines
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-cf-border text-left text-[10px] font-semibold uppercase tracking-wide text-cf-text-subtle">
                  <th className="pb-1.5 pr-3">CPT</th>
                  <th className="pb-1.5 pr-3">Description</th>
                  <th className="pb-1.5 pr-3">Mod</th>
                  <th className="pb-1.5 pr-3 text-right">Units</th>
                  <th className="pb-1.5 pr-3 text-right">Charge</th>
                  <th className="pb-1.5 pr-3">Dx</th>
                  <th className="pb-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {chargeLines.map((line, i) => {
                  const modifiers = [
                    line.modifier_1,
                    line.modifier_2,
                    line.modifier_3,
                    line.modifier_4,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <tr
                      key={line.id || i}
                      className="border-b border-cf-border/50"
                    >
                      <td className="py-1.5 pr-3 font-mono font-semibold text-cf-text">
                        {line.service_code}
                      </td>
                      <td className="max-w-[200px] truncate py-1.5 pr-3 text-cf-text-muted">
                        {line.description || "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-cf-text-muted">
                        {modifiers || "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-cf-text">
                        {line.units}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-cf-text">
                        {formatCurrency(line.charge_amount)}
                      </td>
                      <td className="py-1.5 pr-3 text-cf-text-muted">
                        {(line.diagnosis_pointers || []).join(", ") || "—"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-semibold text-cf-text">
                        {formatCurrency(line.line_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={6}
                    className="pt-2 text-right text-[10px] font-semibold uppercase tracking-wide text-cf-text-subtle"
                  >
                    Total
                  </td>
                  <td className="pt-2 text-right tabular-nums font-semibold text-cf-text">
                    <span className="inline-flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {Number(record.total_charge_amount || 0).toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}

      {/* Billing notes */}
      {record.notes ? (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cf-text-subtle">
            Notes
          </div>
          <div className="text-xs text-cf-text-muted">{record.notes}</div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- POS code lookup ---------- */

export const POS_CODES: { value: string; label: string }[] = [
  { value: "02", label: "02 – Telehealth" },
  { value: "03", label: "03 – School" },
  { value: "04", label: "04 – Homeless Shelter" },
  { value: "11", label: "11 – Office" },
  { value: "12", label: "12 – Home" },
  { value: "13", label: "13 – Assisted Living" },
  { value: "15", label: "15 – Mobile Unit" },
  { value: "17", label: "17 – Walk-in Retail Health" },
  { value: "19", label: "19 – Off Campus Outpatient" },
  { value: "20", label: "20 – Urgent Care" },
  { value: "21", label: "21 – Inpatient Hospital" },
  { value: "22", label: "22 – Outpatient Hospital" },
  { value: "23", label: "23 – Emergency Room" },
  { value: "24", label: "24 – Ambulatory Surgical Center" },
  { value: "25", label: "25 – Birthing Center" },
  { value: "31", label: "31 – Skilled Nursing" },
  { value: "32", label: "32 – Nursing Facility" },
  { value: "33", label: "33 – Custodial Care" },
  { value: "34", label: "34 – Hospice" },
  { value: "41", label: "41 – Ambulance (Land)" },
  { value: "42", label: "42 – Ambulance (Air/Water)" },
  { value: "49", label: "49 – Independent Clinic" },
  { value: "50", label: "50 – FQHC" },
  { value: "51", label: "51 – Inpatient Psych" },
  { value: "52", label: "52 – Psych Day Treatment" },
  { value: "53", label: "53 – Community Mental Health" },
  { value: "54", label: "54 – Intermediate Care" },
  { value: "55", label: "55 – Substance Abuse Residential" },
  { value: "56", label: "56 – Psych Residential" },
  { value: "57", label: "57 – Substance Abuse Day Treatment" },
  { value: "60", label: "60 – Mass Immunization Center" },
  { value: "61", label: "61 – Inpatient Rehab" },
  { value: "62", label: "62 – Outpatient Rehab" },
  { value: "65", label: "65 – End-Stage Renal Disease" },
  { value: "71", label: "71 – State/Local Public Health" },
  { value: "72", label: "72 – Rural Health Clinic" },
  { value: "81", label: "81 – Independent Lab" },
  { value: "99", label: "99 – Other" },
];
