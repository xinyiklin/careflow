import { useState } from "react";

import { Badge, type BadgeTone } from "../../../shared/components/ui/Badge";
import { formatDateOnly } from "../../../shared/utils/dates";
import { getErrorMessage } from "../../../shared/utils/errors";
import {
  useCancelRefill,
  useRefillRequests,
  type PortalRefillRequest,
  type PortalRefillStatus,
} from "../api/refills";

const STATUS_TONE: Record<PortalRefillStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  denied: "danger",
  cancelled: "neutral",
};

function RefillRow({ refill }: { refill: PortalRefillRequest }) {
  const cancel = useCancelRefill();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    const ok = window.confirm(
      "Cancel this refill request? Your care team won't process it."
    );
    if (!ok) return;
    setError(null);
    try {
      await cancel.mutateAsync(refill.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const pharmacy = refill.pharmacy_name?.trim() || "—";
  const requested = formatDateOnly(refill.requested_at);

  return (
    <li className="border-t border-cf-border py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-cf-text">
            {refill.medication_name}
          </div>
          <div className="mt-0.5 text-xs text-cf-text-muted">
            Requested {requested}
            <span className="mx-1.5 text-cf-border-strong">·</span>
            {pharmacy}
          </div>
        </div>
        <Badge tone={STATUS_TONE[refill.status]}>{refill.status_label}</Badge>
      </div>

      {refill.patient_note ? (
        <p className="mt-1.5 text-xs text-cf-text-subtle">
          “{refill.patient_note}”
        </p>
      ) : null}

      {refill.status === "pending" ? (
        <div className="mt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancel.isPending}
            className="rounded-cf-control border border-cf-border bg-cf-surface px-2.5 py-1 text-[11px] font-semibold text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancel.isPending ? "Cancelling…" : "Cancel request"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-1 text-[11px] text-cf-danger-text">{error}</p>
      ) : null}
    </li>
  );
}

export function RefillRequestList() {
  const { data, isError, error } = useRefillRequests();
  const refills = data ?? [];

  if (isError) {
    return (
      <section className="border-t border-cf-border pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
          Recent refill requests
        </h2>
        <p className="mt-2 text-sm text-cf-text-muted">
          {getErrorMessage(error)}
        </p>
      </section>
    );
  }

  if (refills.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-cf-border pt-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-cf-text-subtle">
        Recent refill requests
      </h2>
      <ul className="mt-1">
        {refills.map((refill) => (
          <RefillRow key={refill.id} refill={refill} />
        ))}
      </ul>
    </section>
  );
}
