import { useMemo, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";

import {
  Badge,
  Button,
  SegmentedControl,
} from "../../../../shared/components/ui";
import RefillRequestActionModal from "../../../medications/components/RefillRequestActionModal";
import useFacility from "../../../facilities/hooks/useFacility";
import useAdminFacility from "../../hooks/shared/useAdminFacility";
import useFacilityRefillRequests from "../../hooks/facility/useFacilityRefillRequests";
import { compareText } from "../../hooks/shared/useAdminListControls";
import {
  AdminInlineNotice,
  AdminTableCard,
  AdminTableFooter,
  AdminTableLoadError,
  getAdminRowActionProps,
} from "../shared/AdminSurface";
import { EmptyRow, FacilityListTable } from "./FacilityListPanelShared";

import type {
  RefillRequest,
  RefillRequestStatus,
} from "../../../medications/api/refillRequests";

type FilterKey = "pending" | "all" | "approved" | "denied" | "cancelled";

const FILTER_OPTIONS: { value: FilterKey; label: string }[] = [
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

export default function FacilityRefillInboxPanel() {
  const { adminFacility } = useAdminFacility();
  const facilityId = adminFacility?.id || null;
  const { selectedMembership } = useFacility();

  const permissions = selectedMembership?.effective_security_permissions || {};
  const canView = Boolean(permissions["medications.view"]);
  const canManage = Boolean(permissions["medications.manage"]);

  const [filter, setFilter] = useState<FilterKey>("pending");
  const [sortKey, setSortKey] = useState<SortKey>("requested-desc");
  const [action, setAction] = useState<ActionState>(null);

  const status: RefillRequestStatus | "" = filter === "all" ? "" : filter;

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
  } = useFacilityRefillRequests({
    facilityId: canView ? facilityId : null,
    status,
  });

  const sortedRefills = useMemo(
    () => sortRefills(refills as RefillRequest[], sortKey),
    [refills, sortKey]
  );

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

  if (!facilityId) {
    return (
      <AdminInlineNotice>
        Select a facility to view refill requests.
      </AdminInlineNotice>
    );
  }

  if (!canView) {
    return (
      <AdminInlineNotice>
        You do not have access to view medication refill requests.
      </AdminInlineNotice>
    );
  }

  const activeError = action?.mode === "approve" ? approveError : denyError;

  return (
    <div className="space-y-4">
      <AdminTableCard>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-cf-surface px-5 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <SegmentedControl
              options={FILTER_OPTIONS}
              value={filter}
              onChange={(value) => setFilter(value as FilterKey)}
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
                  className="h-7 cursor-pointer appearance-none rounded-lg border border-cf-border bg-cf-surface pl-2.5 pr-7 text-xs font-semibold text-cf-text-muted outline-none transition hover:bg-cf-surface-soft focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/10"
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
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
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

        <FacilityListTable
          columns={["Patient", "Medication", "Pharmacy", "Status", "Requested"]}
        >
          {loading ? null : loadError ? (
            <AdminTableLoadError
              colSpan={5}
              message="Couldn't load refill requests."
              onRetry={() => reload()}
            />
          ) : sortedRefills.length === 0 ? (
            <EmptyRow
              colSpan={5}
              label={
                filter === "pending"
                  ? "No pending refill requests."
                  : "No refill requests match the selected filter."
              }
            />
          ) : (
            sortedRefills.map((refill) => {
              const canActOnRow = canManage && refill.status === "pending";
              const label = `Open refill request for ${refill.medication_name} (${refill.patient_display_name})`;
              return (
                <tr
                  key={refill.id}
                  {...getAdminRowActionProps({
                    disabled: !canActOnRow,
                    label,
                    onAction: () =>
                      setAction({ mode: "approve", refillRequest: refill }),
                  })}
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-cf-text">
                      {refill.patient_display_name}
                    </div>
                    {refill.patient_note ? (
                      <div className="mt-1 line-clamp-1 text-xs text-cf-text-subtle">
                        Note: {refill.patient_note}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-cf-text">
                      {refill.medication_name}
                    </div>
                    <div className="text-xs text-cf-text-subtle">
                      {[refill.dose, refill.frequency]
                        .filter(Boolean)
                        .join(" - ") || "No dose info"}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-cf-text-muted">
                    {refill.pharmacy_name || "Not specified"}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_BADGE_VARIANT[refill.status]}>
                      {refill.status_label || refill.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-cf-text-muted">
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
        </FacilityListTable>
        <AdminTableFooter
          shown={sortedRefills.length}
          total={sortedRefills.length}
          label="refill requests"
        />
      </AdminTableCard>

      <RefillRequestActionModal
        mode={action?.mode || "approve"}
        refillRequest={action?.refillRequest || null}
        saving={saving}
        error={activeError || null}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
