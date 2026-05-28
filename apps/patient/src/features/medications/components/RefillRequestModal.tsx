import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

import { getErrorMessage } from "../../../shared/utils/errors";
import { useProfile } from "../../profile/api/profile";
import { usePortalPharmacies, type PortalPharmacy } from "../api/pharmacies";
import { useRequestRefill } from "../api/refills";
import type { PortalMedication } from "../api/medications";

type RefillRequestModalProps = {
  medication: PortalMedication;
  onClose: () => void;
};

const NOTE_MAX = 500;

function matchPreferredPharmacy(
  pharmacies: PortalPharmacy[],
  preferredName: string
): PortalPharmacy | null {
  if (!preferredName) return null;
  const target = preferredName.trim().toLowerCase();
  return (
    pharmacies.find((pharmacy) => pharmacy.name.toLowerCase() === target) ??
    null
  );
}

export function RefillRequestModal({
  medication,
  onClose,
}: RefillRequestModalProps) {
  const pharmaciesQuery = usePortalPharmacies();
  const profileQuery = useProfile();
  const requestRefill = useRequestRefill();

  const pharmacies = useMemo(
    () => pharmaciesQuery.data ?? [],
    [pharmaciesQuery.data]
  );
  const preferredName = profileQuery.data?.preferred_pharmacy_name ?? "";

  const defaultPharmacyId = useMemo(() => {
    const preferred = matchPreferredPharmacy(pharmacies, preferredName);
    if (preferred) return preferred.id;
    return pharmacies[0]?.id ?? null;
  }, [pharmacies, preferredName]);

  const [pharmacyId, setPharmacyId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Seed selection once pharmacies + profile finish loading.
  useEffect(() => {
    if (pharmacyId === null && defaultPharmacyId !== null) {
      setPharmacyId(defaultPharmacyId);
    }
  }, [defaultPharmacyId, pharmacyId]);

  // Close on Esc.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loading = pharmaciesQuery.isLoading || profileQuery.isLoading;
  const isPending = requestRefill.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await requestRefill.mutateAsync({
        medication_id: medication.id,
        patient_note: note.trim() || undefined,
        pharmacy_id: pharmacyId,
      });
      setSuccess(true);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refill-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-cf-shell border border-cf-border bg-cf-surface shadow-panel-lg">
        <header className="flex items-start justify-between gap-3 border-b border-cf-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id="refill-modal-title"
              className="text-base font-semibold text-cf-text"
            >
              {success ? "Refill requested" : "Request refill"}
            </h2>
            <p className="mt-0.5 truncate text-xs text-cf-text-muted">
              {medication.medication_name}
              {medication.dose ? ` · ${medication.dose}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-cf-control p-1 text-cf-text-muted transition hover:bg-cf-surface-soft hover:text-cf-text disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        {success ? (
          <div className="space-y-3 px-5 py-5">
            <div className="flex items-start gap-2 rounded-cf-control bg-cf-success-bg px-3 py-2 text-sm text-cf-success-text">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>
                Your refill request was sent. Your care team will review it and
                follow up.
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-cf-control bg-cf-accent px-3 py-2 text-sm font-semibold text-cf-surface transition hover:bg-cf-accent-hover"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <div>
              <label
                htmlFor="refill-pharmacy"
                className="mb-1 block text-xs font-semibold text-cf-text-muted"
              >
                Send to pharmacy
              </label>
              {loading ? (
                <p className="text-sm text-cf-text-muted">
                  Loading pharmacies…
                </p>
              ) : pharmacies.length === 0 ? (
                <p className="text-sm text-cf-text-muted">
                  No pharmacies available at your facility. Please contact your
                  care team.
                </p>
              ) : (
                <select
                  id="refill-pharmacy"
                  value={pharmacyId ?? ""}
                  onChange={(event) =>
                    setPharmacyId(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                  className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
                >
                  {pharmacies.map((pharmacy) => (
                    <option key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                      {pharmacy.city ? ` — ${pharmacy.city}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label
                htmlFor="refill-note"
                className="mb-1 block text-xs font-semibold text-cf-text-muted"
              >
                Note for your care team (optional)
              </label>
              <textarea
                id="refill-note"
                value={note}
                onChange={(event) =>
                  setNote(event.target.value.slice(0, NOTE_MAX))
                }
                rows={3}
                maxLength={NOTE_MAX}
                placeholder="Anything we should know before sending the refill?"
                className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
              />
              <p className="mt-1 text-right text-[10px] text-cf-text-subtle">
                {note.length}/{NOTE_MAX}
              </p>
            </div>

            {submitError ? (
              <div
                role="alert"
                className="rounded-cf-control border border-cf-danger-text/30 bg-cf-danger-bg px-3 py-2 text-sm text-cf-danger-text"
              >
                {submitError}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="inline-flex items-center rounded-cf-control border border-cf-border bg-cf-surface px-3 py-1.5 text-xs font-semibold text-cf-text transition hover:bg-cf-surface-soft disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || loading || pharmacies.length === 0}
                className="inline-flex items-center rounded-cf-control bg-cf-accent px-3 py-1.5 text-xs font-semibold text-cf-surface transition hover:bg-cf-accent-hover disabled:opacity-60"
              >
                {isPending ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
