import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  Input,
  ModalShell,
  Notice,
} from "../../../shared/components/ui";

import type { RefillRequest } from "../api/refillRequests";

type RefillRequestActionMode = "approve" | "deny";

type RefillRequestActionModalProps = {
  mode: RefillRequestActionMode;
  refillRequest: RefillRequest | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void> | void;
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

function formatStatusVariant(status: RefillRequest["status"]) {
  if (status === "approved") return "success" as const;
  if (status === "denied") return "danger" as const;
  if (status === "cancelled") return "muted" as const;
  return "warning" as const;
}

export default function RefillRequestActionModal({
  mode,
  refillRequest,
  saving = false,
  error = null,
  onClose,
  onSubmit,
}: RefillRequestActionModalProps) {
  const isOpen = Boolean(refillRequest);
  const [note, setNote] = useState("");
  const refillId = refillRequest?.id;

  useEffect(() => {
    if (refillId) {
      setNote("");
    }
  }, [refillId, mode]);

  const isApprove = mode === "approve";
  const title = isApprove ? "Approve Refill Request" : "Deny Refill Request";
  const confirmText = isApprove ? "Approve" : "Deny";
  const confirmVariant: "primary" | "danger" = isApprove ? "primary" : "danger";

  const handleSubmit = async () => {
    if (!refillRequest || saving) return;
    await onSubmit(note.trim());
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="lg"
      zIndex={80}
      footer={
        <>
          <Button variant="default" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={() => void handleSubmit()}
            disabled={saving || !refillRequest}
          >
            {saving ? "Saving..." : confirmText}
          </Button>
        </>
      }
    >
      {refillRequest ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-cf-border bg-cf-surface-soft/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                  Patient
                </div>
                <div className="mt-1 text-sm font-semibold text-cf-text">
                  {refillRequest.patient_display_name}
                </div>
              </div>
              <Badge variant={formatStatusVariant(refillRequest.status)}>
                {refillRequest.status_label || refillRequest.status}
              </Badge>
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                  Medication
                </div>
                <div className="mt-1 font-medium text-cf-text">
                  {refillRequest.medication_name}
                </div>
                <div className="text-xs text-cf-text-muted">
                  {[refillRequest.dose, refillRequest.frequency]
                    .filter(Boolean)
                    .join(" - ") || "No dose info"}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                  Pharmacy
                </div>
                <div className="mt-1 font-medium text-cf-text">
                  {refillRequest.pharmacy_name || "Not specified"}
                </div>
                <div className="text-xs text-cf-text-muted">
                  Requested {formatDateTime(refillRequest.requested_at)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                  Days supply
                </div>
                <div className="mt-1 font-medium text-cf-text">
                  {refillRequest.days_supply
                    ? `${refillRequest.days_supply} days`
                    : "Not specified"}
                </div>
              </div>
            </div>
            {refillRequest.patient_note ? (
              <div className="mt-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cf-text-subtle">
                  Patient note
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-cf-text-muted">
                  {refillRequest.patient_note}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="refill-clinician-note"
              className="mb-1 block text-sm font-semibold text-cf-text"
            >
              Clinician note{" "}
              <span className="text-cf-text-subtle">(optional)</span>
            </label>
            <Input
              as="textarea"
              id="refill-clinician-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={saving}
            />
          </div>

          {error ? (
            <Notice tone="danger" title={`Couldn't ${mode} refill request`}>
              {error}
            </Notice>
          ) : null}
        </div>
      ) : null}
    </ModalShell>
  );
}
