import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, FileText, Pencil, Plus } from "lucide-react";

import BillingRecordModal from "./BillingRecordModal";
import {
  BillingRecordExpandedDetail,
  BillingSummaryHeader,
  DiagnosisChips,
  ExpandToggle,
  getStatusMeta,
  ServiceCodeChips,
  StatusFilterChips,
} from "./BillingTabSections";
import { Badge, Button } from "../../../shared/components/ui";
import { formatDateTime } from "../../patients/components/PatientHubSections";

import type { AppointmentLike } from "../../../shared/types/domain";
import type { BillingStatusFilter } from "./BillingTabSections";
import type {
  ClinicalEncounter,
  EncounterBillingRecord,
  EncounterBillingRecordPayload,
} from "../types";
import type { PatientHubInsurancePolicy } from "../../patients/types";

type BillingQueryState = {
  isLoading?: boolean;
  error?: unknown;
  refetch?: () => void;
};

type BillingModalState = {
  isOpen: boolean;
  record: EncounterBillingRecord | null;
  encounter: ClinicalEncounter | null;
};

type PatientBillingTabProps = {
  billingRecords: EncounterBillingRecord[];
  clinicalEncounters: ClinicalEncounter[];
  insurancePolicies: PatientHubInsurancePolicy[];
  queryState: BillingQueryState;
  canManage: boolean;
  saving?: boolean;
  error?: string;
  onSave: (
    record: EncounterBillingRecord | null,
    values: EncounterBillingRecordPayload
  ) => void | Promise<void>;
  onOpenClinicalRecord?: (encounter: ClinicalEncounter) => void;
  onOpenAppointment?: (appointment: AppointmentLike) => void;
};

function isSignedEncounter(encounter: ClinicalEncounter) {
  return (
    encounter.status === "signed" ||
    encounter.progress_note?.status === "signed"
  );
}

function getEncounterDate(encounter: ClinicalEncounter) {
  return (
    encounter.progress_note?.signed_at ||
    encounter.appointment_time ||
    encounter.started_at ||
    ""
  );
}

function getPrimaryPayerName(policies: PatientHubInsurancePolicy[]) {
  const primary =
    policies.find(
      (policy) => policy.is_active !== false && policy.is_primary
    ) || policies.find((policy) => policy.is_active !== false);
  return primary?.carrier_name || primary?.plan_name || "";
}

/* ---------- BillingRecordRow ---------- */

function BillingRecordRow({
  record,
  isExpanded,
  onToggleExpand,
  onEdit,
  onOpenNote,
  canManage,
  clinicalEncounters,
}: {
  record: EncounterBillingRecord;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onOpenNote?: (encounter: ClinicalEncounter) => void;
  canManage: boolean;
  clinicalEncounters: ClinicalEncounter[];
}) {
  const statusMeta = getStatusMeta(record.status);

  return (
    <div className="rounded-xl border border-cf-border bg-cf-surface transition hover:border-cf-border-strong">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-cf-text-subtle">
              {formatDateTime(record.appointment_time || record.updated_at)}
            </span>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-cf-text">
            {record.appointment_type_name || "Encounter superbill"}
          </div>
          <div className="mt-0.5 truncate text-xs text-cf-text-muted">
            {[
              record.payer_name || "Payer not set",
              record.rendering_provider_name || "Provider not set",
            ]
              .filter(Boolean)
              .join(" — ")}
          </div>

          {/* Code chips + total */}
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <DiagnosisChips diagnoses={record.diagnoses} />
            <ServiceCodeChips chargeLines={record.charge_lines} />
            <span className="text-xs font-semibold tabular-nums text-cf-text">
              ${record.total_charge_amount || "0.00"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenNote ? (
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => {
                const encounter = clinicalEncounters.find(
                  (item) => String(item.id) === String(record.encounter)
                );
                if (encounter) onOpenNote(encounter);
              }}
            >
              <FileText className="h-3.5 w-3.5" />
              Note
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            onClick={onEdit}
            disabled={!canManage}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <ExpandToggle isExpanded={isExpanded} onClick={onToggleExpand} />
        </div>
      </div>

      {isExpanded ? (
        <div className="px-4 pb-3">
          <BillingRecordExpandedDetail record={record} />
        </div>
      ) : null}
    </div>
  );
}

/* ---------- ReadyEncounterRow ---------- */

function ReadyEncounterRow({
  encounter,
  canManage,
  onCreate,
}: {
  encounter: ClinicalEncounter;
  canManage: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-cf-text-subtle">
          {formatDateTime(getEncounterDate(encounter))}
        </div>
        <div className="truncate text-sm font-semibold text-cf-text">
          {encounter.reason ||
            encounter.appointment_type_name ||
            "Signed encounter"}
        </div>
        <div className="text-xs text-cf-text-muted">
          {encounter.rendering_provider_name || "Provider not set"}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="primary"
        disabled={!canManage}
        onClick={onCreate}
      >
        <Plus className="h-3.5 w-3.5" />
        Create Superbill
      </Button>
    </div>
  );
}

/* ---------- PatientBillingTab ---------- */

export default function PatientBillingTab({
  billingRecords,
  clinicalEncounters,
  insurancePolicies,
  queryState,
  canManage,
  saving = false,
  error = "",
  onSave,
  onOpenClinicalRecord,
}: PatientBillingTabProps) {
  const [modalState, setModalState] = useState<BillingModalState>({
    isOpen: false,
    record: null,
    encounter: null,
  });
  const [statusFilter, setStatusFilter] = useState<BillingStatusFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(
    () => new Set()
  );

  const defaultPayerName = getPrimaryPayerName(insurancePolicies);

  const billedEncounterIds = useMemo(
    () =>
      new Set(
        billingRecords
          .map((record) => record.encounter)
          .filter(Boolean)
          .map((id) => String(id))
      ),
    [billingRecords]
  );

  const readyEncounters = useMemo(
    () =>
      clinicalEncounters.filter(
        (encounter) =>
          encounter.id &&
          isSignedEncounter(encounter) &&
          !billedEncounterIds.has(String(encounter.id))
      ),
    [billedEncounterIds, clinicalEncounters]
  );

  const filteredRecords = useMemo(
    () =>
      statusFilter === "all"
        ? billingRecords
        : billingRecords.filter((r) => r.status === statusFilter),
    [billingRecords, statusFilter]
  );

  const toggleExpand = useCallback((id: string | number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const closeModal = () =>
    setModalState({ isOpen: false, record: null, encounter: null });

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <BillingSummaryHeader records={billingRecords} />

      {/* Filter + section header */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <CreditCard className="h-4 w-4 text-cf-text-subtle" />
            Billing
          </div>
          {billingRecords.length > 0 ? (
            <Badge variant={readyEncounters.length ? "outline" : "muted"}>
              {readyEncounters.length} ready
            </Badge>
          ) : null}
        </div>

        {billingRecords.length > 1 ? (
          <StatusFilterChips
            records={billingRecords}
            activeFilter={statusFilter}
            onFilter={setStatusFilter}
          />
        ) : null}

        {/* Records list */}
        {queryState.isLoading ? null : queryState.error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-cf-text">
                Couldn&apos;t load billing
              </div>
              <div className="text-sm text-cf-text-muted">
                Check your connection and try again.
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => queryState.refetch?.()}
            >
              Retry
            </Button>
          </div>
        ) : filteredRecords.length ? (
          <div className="space-y-2">
            {filteredRecords.map((record) => (
              <BillingRecordRow
                key={record.id}
                record={record}
                isExpanded={expandedIds.has(record.id!)}
                onToggleExpand={() => toggleExpand(record.id!)}
                onEdit={() =>
                  setModalState({
                    isOpen: true,
                    record,
                    encounter: null,
                  })
                }
                onOpenNote={onOpenClinicalRecord}
                canManage={canManage}
                clinicalEncounters={clinicalEncounters}
              />
            ))}
          </div>
        ) : billingRecords.length && statusFilter !== "all" ? (
          <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-6 text-center text-sm text-cf-text-muted">
            No records match this filter.
          </div>
        ) : (
          <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-6 text-center text-sm text-cf-text-muted">
            No billing records yet.
            {readyEncounters.length
              ? " Signed encounters are ready below."
              : " Billing records are created from signed clinical encounters."}
          </div>
        )}
      </section>

      {/* Ready for billing */}
      {readyEncounters.length ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
            <CheckCircle2 className="h-4 w-4 text-cf-success-text" />
            Ready for Billing
            <Badge variant="success" className="ml-1">
              {readyEncounters.length}
            </Badge>
          </div>
          {readyEncounters.map((encounter) => (
            <ReadyEncounterRow
              key={encounter.id}
              encounter={encounter}
              canManage={canManage}
              onCreate={() =>
                setModalState({
                  isOpen: true,
                  record: null,
                  encounter,
                })
              }
            />
          ))}
        </section>
      ) : null}

      <BillingRecordModal
        isOpen={modalState.isOpen}
        record={modalState.record}
        encounter={modalState.encounter}
        defaultPayerName={defaultPayerName}
        saving={saving}
        error={error}
        onClose={closeModal}
        onSave={async (values) => {
          try {
            await onSave(modalState.record, values);
            closeModal();
          } catch {
            // The parent owns the localized billing error message.
          }
        }}
      />
    </div>
  );
}
