import { useMemo, useState } from "react";
import { Pill, RotateCcw } from "lucide-react";

import { Badge, Button } from "../../../../shared/components/ui";
import RefillRequestActionModal from "../../../medications/components/RefillRequestActionModal";
import {
  useApproveRefillRequest,
  useDenyRefillRequest,
  useRefillRequests,
} from "../../../medications/api/refillRequests";

import type { EntityId } from "../../../../shared/api/types";
import type {
  RefillRequest,
  RefillRequestStatus,
} from "../../../medications/api/refillRequests";

type PatientRefillRequestsTabProps = {
  facilityId?: EntityId | null;
  patientId?: EntityId | null;
  canManage?: boolean;
};

type ActionState = {
  mode: "approve" | "deny";
  refillRequest: RefillRequest;
} | null;

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

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message || null;
  if (typeof error === "string") return error;
  return null;
}

function sortRefills(refills: RefillRequest[]) {
  const rank: Record<RefillRequestStatus, number> = {
    pending: 0,
    approved: 1,
    denied: 2,
    cancelled: 3,
  };
  return [...refills].sort((a, b) => {
    const statusDelta = rank[a.status] - rank[b.status];
    if (statusDelta !== 0) return statusDelta;
    return (
      new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
    );
  });
}

function RefillRow({
  refill,
  canManage,
  onApprove,
  onDeny,
}: {
  refill: RefillRequest;
  canManage: boolean;
  onApprove: (refill: RefillRequest) => void;
  onDeny: (refill: RefillRequest) => void;
}) {
  const isPending = refill.status === "pending";

  return (
    <div className="border-b border-cf-border px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-cf-text">
              {refill.medication_name}
            </span>
            <Badge variant={STATUS_BADGE_VARIANT[refill.status]}>
              {refill.status_label || refill.status}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-cf-text-muted">
            {[refill.dose, refill.frequency].filter(Boolean).join(" - ") ||
              "No dose info"}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-cf-text-subtle">
            <span>Requested {formatDateTime(refill.requested_at)}</span>
            {refill.pharmacy_name ? (
              <span>Pharmacy: {refill.pharmacy_name}</span>
            ) : null}
            {refill.resolved_at ? (
              <span>
                {refill.status === "approved"
                  ? "Approved"
                  : refill.status === "denied"
                    ? "Denied"
                    : "Resolved"}{" "}
                {formatDateTime(refill.resolved_at)}
                {refill.resolved_by_name ? ` - ${refill.resolved_by_name}` : ""}
              </span>
            ) : null}
          </div>
          {refill.patient_note ? (
            <div className="mt-2 line-clamp-2 text-sm text-cf-text-muted">
              <span className="font-semibold text-cf-text-muted">
                Patient note:
              </span>{" "}
              {refill.patient_note}
            </div>
          ) : null}
          {refill.clinician_note ? (
            <div className="mt-1 line-clamp-2 text-sm text-cf-text-muted">
              <span className="font-semibold text-cf-text-muted">
                Clinician note:
              </span>{" "}
              {refill.clinician_note}
            </div>
          ) : null}
        </div>

        {canManage && isPending ? (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onApprove(refill)}
            >
              Approve
            </Button>
            <Button size="sm" variant="danger" onClick={() => onDeny(refill)}>
              Deny
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PatientRefillRequestsTab({
  facilityId,
  patientId,
  canManage = true,
}: PatientRefillRequestsTabProps) {
  const [action, setAction] = useState<ActionState>(null);

  const refillsQuery = useRefillRequests({
    facilityId,
    patientId,
    enabled: !!facilityId && !!patientId,
  });

  const approveMutation = useApproveRefillRequest({ facilityId });
  const denyMutation = useDenyRefillRequest({ facilityId });

  const refills = useMemo(
    () => (Array.isArray(refillsQuery.data) ? refillsQuery.data : []),
    [refillsQuery.data]
  );
  const sortedRefills = useMemo(() => sortRefills(refills), [refills]);
  const pendingCount = useMemo(
    () => refills.filter((refill) => refill.status === "pending").length,
    [refills]
  );

  const closeModal = () => {
    setAction(null);
    approveMutation.reset();
    denyMutation.reset();
  };

  const handleSubmit = async (note: string) => {
    if (!action) return;
    const { refillRequest, mode } = action;
    try {
      if (mode === "approve") {
        await approveMutation.mutateAsync({
          refillId: refillRequest.id,
          values: { clinician_note: note },
        });
      } else {
        await denyMutation.mutateAsync({
          refillId: refillRequest.id,
          values: { clinician_note: note },
        });
      }
      closeModal();
    } catch {
      // Mutation error is shown inside the modal.
    }
  };

  const activeMutation =
    action?.mode === "approve" ? approveMutation : denyMutation;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-cf-text">
          <Pill className="h-4 w-4 text-cf-text-subtle" />
          Refill Requests
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning">{pendingCount} pending</Badge>
          <Badge variant="muted">{refills.length} total</Badge>
        </div>
      </div>

      {refillsQuery.isLoading ? null : refillsQuery.error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cf-border bg-cf-surface px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-cf-text">
              Couldn&apos;t load refill requests
            </div>
            <div className="text-sm text-cf-text-muted">
              Check your connection and try again.
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => refillsQuery.refetch()}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : sortedRefills.length ? (
        <div className="overflow-hidden rounded-xl border border-cf-border bg-cf-surface">
          {sortedRefills.map((refill) => (
            <RefillRow
              key={refill.id}
              refill={refill}
              canManage={canManage}
              onApprove={(record) =>
                setAction({ mode: "approve", refillRequest: record })
              }
              onDeny={(record) =>
                setAction({ mode: "deny", refillRequest: record })
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-cf-border bg-cf-surface px-4 py-6 text-center text-sm text-cf-text-muted">
          No refill requests on file.
        </div>
      )}

      <RefillRequestActionModal
        mode={action?.mode || "approve"}
        refillRequest={action?.refillRequest || null}
        saving={activeMutation.isPending}
        error={getErrorMessage(activeMutation.error)}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
