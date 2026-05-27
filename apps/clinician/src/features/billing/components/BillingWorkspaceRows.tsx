import { Plus, Pencil } from "lucide-react";

import {
  BillingRecordExpandedDetail,
  DiagnosisChips,
  ExpandToggle,
  getStatusMeta,
  ServiceCodeChips,
} from "./BillingTabSections";
import { Badge, Button } from "../../../shared/components/ui";
import {
  formatBillingDate,
  formatBillingCurrency,
  getAgeBadgeVariant,
  getAgeLabel,
  getEncounterActivityAt,
  getEncounterIssueFilters,
  getIssueBadgeVariant,
  getIssueLabel,
  getRecordActivityAt,
  getRecordIssueFilters,
  type BillingIssueFilter,
} from "./billingWorkspaceUtils";

import type { EntityId } from "../../../shared/api/types";
import type { ClinicalEncounter, EncounterBillingRecord } from "../types";

function IssueBadges({
  issues,
  ageLabel,
  ageVariant,
}: {
  issues: BillingIssueFilter[];
  ageLabel: string;
  ageVariant: "neutral" | "warning" | "danger";
}) {
  const visibleIssues = issues.filter((issue) => issue !== "aged");

  if (!visibleIssues.length && !ageLabel) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ageLabel ? (
        <Badge
          variant={ageVariant}
          size="sm"
          className="tabular-nums font-semibold"
        >
          {ageLabel}
        </Badge>
      ) : null}
      {visibleIssues.map((issue) => (
        <Badge
          key={issue}
          variant={getIssueBadgeVariant(issue)}
          size="sm"
          className="text-[10px] font-semibold"
        >
          {getIssueLabel(issue)}
        </Badge>
      ))}
    </div>
  );
}

export function BillingRecordRow({
  record,
  isExpanded,
  canManage,
  roomierActions,
  onOpenPatientHub,
  onEdit,
  onToggleExpand,
}: {
  record: EncounterBillingRecord;
  isExpanded: boolean;
  canManage: boolean;
  roomierActions: boolean;
  onOpenPatientHub: (patientId?: EntityId | null) => void;
  onEdit: (record: EncounterBillingRecord) => void;
  onToggleExpand: () => void;
}) {
  const statusMeta = getStatusMeta(record.status);
  const activityAt = getRecordActivityAt(record);
  const issues = getRecordIssueFilters(record);

  return (
    <div className="rounded-lg border border-cf-border bg-cf-surface transition-all duration-150 hover:border-cf-border-strong hover:shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-2 px-3.5 py-2 md:flex-row md:items-center md:justify-between md:gap-3">
        {/* Col 1: Patient & Time */}
        <div className="min-w-0 shrink-0 md:w-1/4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenPatientHub(record.patient)}
              className="cursor-pointer text-left text-[13px] font-semibold text-cf-accent hover:underline focus-visible:outline-none truncate"
            >
              {record.patient_name}
            </button>
            <span className="font-mono text-[9px] tabular-nums text-cf-text-subtle shrink-0 px-1 py-px bg-cf-surface-soft rounded">
              #{record.patient_chart_number}
            </span>
          </div>
          <div className="text-[11px] text-cf-text-muted font-medium truncate leading-snug">
            {record.appointment_type_name || "Encounter superbill"}
            <span className="mx-1 text-cf-border">·</span>
            {formatBillingDate(record.appointment_time || record.updated_at)}
          </div>
        </div>

        {/* Col 2: Provider & Payer */}
        <div className="min-w-0 shrink-0 md:w-1/5">
          <div className="text-[12px] font-semibold text-cf-text truncate leading-snug">
            {record.rendering_provider_name || "Provider not set"}
          </div>
          <div className="text-[11px] text-cf-text-muted truncate font-medium leading-snug">
            {record.payer_name || "Payer not set"}
          </div>
        </div>

        {/* Col 3: Codes & Charges */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <DiagnosisChips diagnoses={record.diagnoses} />
            <ServiceCodeChips chargeLines={record.charge_lines} />
            <span className="text-[12px] font-extrabold tabular-nums text-cf-text ml-1">
              {formatBillingCurrency(record.total_charge_amount)}
            </span>
          </div>
        </div>

        {/* Col 4: Status & Issues */}
        <div className="min-w-0 md:w-[150px] shrink-0 flex flex-col items-start gap-1">
          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          <IssueBadges
            issues={issues}
            ageLabel={getAgeLabel(activityAt)}
            ageVariant={getAgeBadgeVariant(activityAt)}
          />
        </div>

        {/* Col 5: Actions */}
        <div
          className={[
            "flex items-center gap-1.5 shrink-0 justify-end",
            roomierActions ? "md:w-[116px]" : "",
          ].join(" ")}
        >
          <Button
            type="button"
            size="sm"
            onClick={() => onEdit(record)}
            disabled={!canManage}
            className="flex items-center gap-1.5 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98] transition-transform duration-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <ExpandToggle isExpanded={isExpanded} onClick={onToggleExpand} />
        </div>
      </div>

      {isExpanded ? (
        <div className="px-3.5 pb-2">
          <BillingRecordExpandedDetail record={record} />
        </div>
      ) : null}
    </div>
  );
}

export function BillingPendingEncounterRow({
  encounter,
  canManage,
  onOpenPatientHub,
  onCreateSuperbill,
}: {
  encounter: ClinicalEncounter;
  canManage: boolean;
  onOpenPatientHub: (patientId?: EntityId | null) => void;
  onCreateSuperbill: (encounter: ClinicalEncounter) => void;
}) {
  const activityAt = getEncounterActivityAt(encounter);
  const issues = getEncounterIssueFilters(encounter);

  return (
    <div className="rounded-lg border border-cf-border bg-cf-surface transition-all duration-150 hover:border-cf-border-strong hover:shadow-[var(--shadow-panel)]">
      <div className="flex flex-col gap-2 px-3.5 py-2 md:flex-row md:items-center md:justify-between md:gap-3">
        {/* Col 1: Patient & Time */}
        <div className="min-w-0 shrink-0 md:w-[32%]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenPatientHub(encounter.patient)}
              className="cursor-pointer text-left text-[13px] font-semibold text-cf-accent hover:underline focus-visible:outline-none truncate"
            >
              {encounter.patient_name}
            </button>
            <span className="font-mono text-[9px] tabular-nums text-cf-text-subtle shrink-0 px-1 py-px bg-cf-surface-soft rounded">
              #{encounter.patient_chart_number}
            </span>
          </div>
          <div className="text-[11px] text-cf-text-muted font-medium truncate leading-snug">
            {encounter.reason ||
              encounter.appointment_type_name ||
              "Signed clinical encounter"}
            <span className="mx-1 text-cf-border">·</span>
            {formatBillingDate(activityAt)}
          </div>
        </div>

        {/* Col 2: Provider */}
        <div className="min-w-0 shrink-0 md:w-[18%]">
          <div className="text-[12px] font-semibold text-cf-text truncate leading-snug">
            {encounter.rendering_provider_name || "Provider not set"}
          </div>
          <div className="text-[11px] text-cf-text-muted font-medium leading-snug">
            {encounter.status === "signed" ? "Signed Encounter" : "In Progress"}
          </div>
        </div>

        {/* Col 3: Status */}
        <div className="min-w-0 flex-1">
          {encounter.status === "signed" ? (
            <Badge variant="success">Signed</Badge>
          ) : (
            <Badge variant="warning">In Progress</Badge>
          )}
        </div>

        {/* Col 4: Issues */}
        <div className="min-w-0 md:w-[150px] shrink-0 flex flex-col items-start gap-1">
          <IssueBadges
            issues={issues}
            ageLabel={getAgeLabel(activityAt)}
            ageVariant={getAgeBadgeVariant(activityAt)}
          />
        </div>

        {/* Col 5: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end">
          <Button
            type="button"
            size="sm"
            variant="primary"
            disabled={!canManage}
            onClick={() => onCreateSuperbill(encounter)}
            className="flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Superbill
          </Button>
        </div>
      </div>
    </div>
  );
}
