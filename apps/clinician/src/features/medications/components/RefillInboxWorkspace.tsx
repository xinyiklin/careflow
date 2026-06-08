import { useId, useMemo, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";

import {
  Badge,
  Button,
  EmptyState,
  SegmentedControl,
  Tabs,
  getTabId,
  getTabPanelId,
} from "../../../shared/components/ui";
import WorkspaceShell from "../../../app/components/WorkspaceShell";
import RefillRequestActionModal from "./RefillRequestActionModal";
import useRefillInbox from "../hooks/useRefillInbox";

import type {
  RefillRequest,
  RefillRequestSource,
  RefillRequestStatus,
} from "../api/refillRequests";
import type { EntityId } from "../../../shared/api/types";
import type { KeyboardEvent } from "react";

type StatusFilterKey = "pending" | "all" | "approved" | "denied" | "cancelled";

const SOURCE_OPTIONS: { value: RefillRequestSource; label: string }[] = [
  { value: "pharmacy", label: "Pharmacy" },
  { value: "patient", label: "Patient" },
];

const STATUS_OPTIONS: { value: StatusFilterKey; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "cancelled", label: "Cancelled" },
];

const SORT_OPTIONS = [
  { key: "requested-desc", label: "Requested (newest first)" },
  { key: "requested-asc", label: "Requested (oldest first)" },
  { key: "patient", label: "Patient name" },
  { key: "medication", label: "Medication name" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

const STATUS_BADGE_VARIANT: Record<
  RefillRequestStatus,
  "success" | "warning" | "muted" | "danger"
> = {
  pending: "warning",
  approved: "success",
  denied: "danger",
  cancelled: "muted",
};

const TABLE_COLUMNS = [
  "Patient",
  "Medication",
  "Prescriber",
  "Pharmacy",
  "Status",
  "Requested",
];

const ALL_PRESCRIBERS = "all";
const MINE = "mine";

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortRefills(refills: RefillRequest[], sortKey: SortKey) {
  const list = [...refills];
  switch (sortKey) {
    case "requested-asc":
      list.sort(
        (a, b) =>
          new Date(a.requested_at).getTime() -
          new Date(b.requested_at).getTime()
      );
      break;
    case "patient":
      list.sort(
        (a, b) =>
          compareText(a.patient_display_name, b.patient_display_name) ||
          new Date(b.requested_at).getTime() -
            new Date(a.requested_at).getTime()
      );
      break;
    case "medication":
      list.sort(
        (a, b) =>
          compareText(a.medication_name, b.medication_name) ||
          new Date(b.requested_at).getTime() -
            new Date(a.requested_at).getTime()
      );
      break;
    case "requested-desc":
    default:
      list.sort(
        (a, b) =>
          new Date(b.requested_at).getTime() -
          new Date(a.requested_at).getTime()
      );
      break;
  }
  return list;
}

type ActionState = {
  mode: "approve" | "deny";
  refillRequest: RefillRequest;
} | null;

const INTERACTIVE_ROW_CLASS =
  "group cursor-pointer outline-none transition hover:bg-cf-surface-soft/50 hover:shadow-[inset_3px_0_0_var(--color-cf-accent)] focus-visible:bg-cf-surface-soft/75 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cf-accent/30";

function getRowProps({
  disabled,
  label,
  onAction,
}: {
  disabled: boolean;
  label: string;
  onAction: () => void;
}) {
  if (disabled) {
    return { className: "group transition" };
  }
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": label,
    onClick: onAction,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onAction();
    },
    className: INTERACTIVE_ROW_CLASS,
  };
}

export type PrescriberOption = {
  id: EntityId;
  name: string;
};

type RefillInboxWorkspaceProps = {
  facilityId: EntityId | null;
  canManage: boolean;
  prescribers: PrescriberOption[];
  canEprescribe: boolean;
  currentUserName: string;
};

export default function RefillInboxWorkspace({
  facilityId,
  canManage,
  prescribers,
  canEprescribe,
  currentUserName,
}: RefillInboxWorkspaceProps) {
  const [source, setSource] = useState<RefillRequestSource>("patient");
  const tabsId = useId();
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("pending");
  const [sortKey, setSortKey] = useState<SortKey>("requested-desc");
  // "all" | "mine" | "<prescriber id>"
  const [prescriberFilter, setPrescriberFilter] =
    useState<string>(ALL_PRESCRIBERS);
  const [action, setAction] = useState<ActionState>(null);

  const status: RefillRequestStatus | "" =
    statusFilter === "all" ? "" : statusFilter;

  const mine = prescriberFilter === MINE;
  const prescriberId =
    prescriberFilter === ALL_PRESCRIBERS || prescriberFilter === MINE
      ? undefined
      : prescriberFilter;

  const {
    refills,
    loading,
    loadError,
    saving,
    approveError,
    denyError,
    reload,
    approveRefill,
    denyRefill,
    resetMutations,
  } = useRefillInbox({ facilityId, status, source, prescriberId, mine });

  const sortedRefills = useMemo(
    () => sortRefills(refills, sortKey),
    [refills, sortKey]
  );

  const isPharmacy = source === "pharmacy";
  const hasRows = !loading && !loadError && sortedRefills.length > 0;

  const closeModal = () => {
    setAction(null);
    resetMutations();
  };

  const handleSubmit = async (note: string) => {
    if (!action) return;
    try {
      if (action.mode === "approve") {
        await approveRefill(action.refillRequest.id, note);
      } else {
        await denyRefill(action.refillRequest.id, note);
      }
      closeModal();
    } catch {
      // Mutation error renders inside the modal.
    }
  };

  const activeError = action?.mode === "approve" ? approveError : denyError;

  return (
    <WorkspaceShell>
      {/* Header: workspace identity on the left, the primary source switch
          on the right. The source switch reads as underline tabs (the queue
          you're viewing), while the status filter below stays a pill
          SegmentedControl (a filter within that queue). */}
      <header className="flex shrink-0 items-stretch justify-between gap-3 border-b border-cf-border bg-cf-surface px-3">
        <div className="flex min-w-0 flex-col justify-center py-3">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cf-text-subtle leading-none">
            Workflow
          </div>
          <h1 className="mt-1 text-base leading-none font-extrabold tracking-tight text-cf-text">
            Refills
          </h1>
        </div>
        <Tabs
          options={SOURCE_OPTIONS}
          value={source}
          onChange={setSource}
          ariaLabel="Refill request source"
          idBase={tabsId}
          className="shrink-0"
        />
      </header>

      {/* Status + sort live one level down — only meaningful for the
          patient queue, which is the only source with data today. */}
      {!isPharmacy ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cf-border bg-cf-surface px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <SegmentedControl
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as StatusFilterKey)}
              size="xs"
              variant="pill"
            />
            <span className="mx-1 h-4 w-px bg-cf-border" />
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="refill-sort" className="text-cf-text-subtle">
                Sort:
              </label>
              <div className="relative flex items-center">
                <select
                  id="refill-sort"
                  value={sortKey}
                  onChange={(event) =>
                    setSortKey(event.target.value as SortKey)
                  }
                  className="h-7 cursor-pointer appearance-none rounded-lg border border-cf-border bg-cf-surface pr-7 pl-2.5 text-xs font-semibold text-cf-text-muted outline-none transition hover:bg-cf-surface-soft focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-cf-text-subtle/80" />
              </div>
            </div>
            <span className="mx-1 h-4 w-px bg-cf-border" />
            <div className="flex items-center gap-2 text-xs">
              <label
                htmlFor="refill-prescriber"
                className="text-cf-text-subtle"
              >
                Prescriber:
              </label>
              <div className="relative flex items-center">
                <select
                  id="refill-prescriber"
                  value={prescriberFilter}
                  onChange={(event) => setPrescriberFilter(event.target.value)}
                  className="h-7 max-w-[12rem] cursor-pointer appearance-none truncate rounded-lg border border-cf-border bg-cf-surface pr-7 pl-2.5 text-xs font-semibold text-cf-text-muted outline-none transition hover:bg-cf-surface-soft focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10"
                >
                  <option value={ALL_PRESCRIBERS}>All prescribers</option>
                  {canEprescribe ? (
                    <option value={MINE}>Me — {currentUserName}</option>
                  ) : null}
                  {prescribers.map((prescriber) => (
                    <option key={prescriber.id} value={String(prescriber.id)}>
                      {prescriber.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-cf-text-subtle/80" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving ? <Badge variant="muted">Saving...</Badge> : null}
            <Button
              variant="default"
              size="sm"
              onClick={() => reload()}
              disabled={loading || saving}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      ) : null}

      {/* Body — edge-to-edge on the frame surface, no inner card */}
      <div
        role="tabpanel"
        id={getTabPanelId(tabsId)}
        aria-labelledby={getTabId(tabsId, source)}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-cf-surface"
      >
        {isPharmacy ? (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              title="No pharmacy requests"
              body="Refill requests submitted by pharmacies will appear here."
              className="w-full max-w-md"
            />
          </div>
        ) : (
          <>
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-cf-border bg-cf-surface-soft/80 text-[10px] font-semibold tracking-[0.14em] text-cf-text-subtle uppercase backdrop-blur">
                <tr>
                  {TABLE_COLUMNS.map((heading) => (
                    <th
                      key={heading}
                      className="px-3 py-3 text-left font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cf-border text-cf-text">
                {loading ? null : loadError ? (
                  <tr>
                    <td
                      colSpan={TABLE_COLUMNS.length}
                      className="px-3 py-16 text-center"
                    >
                      <p className="text-sm text-cf-text-muted">
                        Couldn't load refill requests.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        onClick={() => reload()}
                      >
                        Retry
                      </Button>
                    </td>
                  </tr>
                ) : sortedRefills.length === 0 ? (
                  <tr>
                    <td colSpan={TABLE_COLUMNS.length} className="px-3 py-16">
                      <EmptyState
                        title={
                          statusFilter === "pending"
                            ? "No pending refill requests"
                            : "No matching refill requests"
                        }
                        body={
                          statusFilter === "pending"
                            ? "Patient refill requests awaiting review appear here."
                            : undefined
                        }
                        className="mx-auto max-w-md"
                      />
                    </td>
                  </tr>
                ) : (
                  sortedRefills.map((refill) => {
                    const canActOnRow =
                      canManage && refill.status === "pending";
                    const label = `Open refill request for ${refill.medication_name} (${refill.patient_display_name})`;
                    return (
                      <tr
                        key={refill.id}
                        {...getRowProps({
                          disabled: !canActOnRow,
                          label,
                          onAction: () =>
                            setAction({
                              mode: "approve",
                              refillRequest: refill,
                            }),
                        })}
                      >
                        <td className="px-3 py-4 align-top">
                          <div className="font-semibold text-cf-text">
                            {refill.patient_display_name}
                          </div>
                          {refill.patient_note ? (
                            <div className="mt-1 line-clamp-1 text-xs text-cf-text-subtle">
                              Note: {refill.patient_note}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-4 align-top">
                          <div className="font-medium text-cf-text">
                            {refill.medication_name}
                          </div>
                          <div className="text-xs text-cf-text-subtle">
                            {[refill.dose, refill.frequency]
                              .filter(Boolean)
                              .join(" - ") || "No dose info"}
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-cf-text-muted">
                          {refill.prescriber_display || "—"}
                        </td>
                        <td className="px-3 py-4 align-top text-cf-text-muted">
                          {refill.pharmacy_name || "Not specified"}
                        </td>
                        <td className="px-3 py-4 align-top">
                          <Badge variant={STATUS_BADGE_VARIANT[refill.status]}>
                            {refill.status_label || refill.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 align-top text-cf-text-muted">
                          <div>{formatDateTime(refill.requested_at)}</div>
                          {refill.resolved_at ? (
                            <div className="text-xs text-cf-text-subtle">
                              Resolved {formatDateTime(refill.resolved_at)}
                              {refill.resolved_by_name
                                ? ` - ${refill.resolved_by_name}`
                                : ""}
                            </div>
                          ) : null}
                          {canActOnRow ? (
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setAction({
                                    mode: "approve",
                                    refillRequest: refill,
                                  });
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setAction({
                                    mode: "deny",
                                    refillRequest: refill,
                                  });
                                }}
                              >
                                Deny
                              </Button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {hasRows ? (
              <div className="border-t border-cf-border bg-cf-surface-soft/40 px-3 py-3 text-xs text-cf-text-muted">
                Showing {sortedRefills.length}{" "}
                {sortedRefills.length === 1 ? "request" : "requests"}
              </div>
            ) : null}
          </>
        )}
      </div>

      <RefillRequestActionModal
        mode={action?.mode || "approve"}
        refillRequest={action?.refillRequest || null}
        saving={saving}
        error={activeError || null}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </WorkspaceShell>
  );
}
