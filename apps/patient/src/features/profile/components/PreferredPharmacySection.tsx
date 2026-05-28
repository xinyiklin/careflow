import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2 } from "lucide-react";

import { getErrorMessage } from "../../../shared/utils/errors";
import {
  usePortalPharmacies,
  type PortalPharmacy,
} from "../../medications/api/pharmacies";
import { useUpdatePreferredPharmacy } from "../api/profile";

type PreferredPharmacySectionProps = {
  preferredPharmacyName: string;
};

function matchByName(
  pharmacies: PortalPharmacy[],
  name: string
): PortalPharmacy | null {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  return (
    pharmacies.find((pharmacy) => pharmacy.name.toLowerCase() === target) ??
    null
  );
}

export function PreferredPharmacySection({
  preferredPharmacyName,
}: PreferredPharmacySectionProps) {
  const pharmaciesQuery = usePortalPharmacies();
  const updatePharmacy = useUpdatePreferredPharmacy();

  const pharmacies = useMemo(
    () => pharmaciesQuery.data ?? [],
    [pharmaciesQuery.data]
  );

  const currentMatch = useMemo(
    () => matchByName(pharmacies, preferredPharmacyName),
    [pharmacies, preferredPharmacyName]
  );

  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | "">(
    currentMatch?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-sync local selection if profile changes underneath us (e.g. after save).
  useEffect(() => {
    setSelectedId(currentMatch?.id ?? "");
  }, [currentMatch?.id]);

  // Clear the "Saved" pill after a moment so it doesn't linger.
  useEffect(() => {
    if (!saved) return;
    const handle = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(handle);
  }, [saved]);

  const startEditing = () => {
    setSelectedId(currentMatch?.id ?? "");
    setError(null);
    setSaved(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    setError(null);
    try {
      const pharmacyId = selectedId === "" ? null : Number(selectedId);
      await updatePharmacy.mutateAsync({ pharmacy_id: pharmacyId });
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleClear = async () => {
    setError(null);
    try {
      await updatePharmacy.mutateAsync({ pharmacy_id: null });
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const hasPreferred = Boolean(preferredPharmacyName.trim());
  const isPending = updatePharmacy.isPending;

  return (
    <section className="border-t border-cf-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-cf-text-subtle">
          Preferred Pharmacy
        </h3>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cf-success-text">
            <CheckCircle2 size={12} aria-hidden="true" />
            Saved
          </span>
        ) : null}
      </div>

      {!editing ? (
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex items-start gap-2">
            <Building2
              size={16}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-cf-text-subtle"
            />
            {hasPreferred ? (
              <div className="min-w-0">
                <div className="text-sm font-medium text-cf-text">
                  {preferredPharmacyName}
                </div>
                <p className="mt-0.5 text-xs text-cf-text-muted">
                  Refill requests default to this pharmacy.
                </p>
              </div>
            ) : (
              <div className="min-w-0">
                <div className="text-sm font-medium text-cf-text">
                  No pharmacy selected
                </div>
                <p className="mt-0.5 text-xs text-cf-text-muted">
                  Pick one so refill requests have a default destination.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 rounded-cf-control border border-cf-border bg-cf-surface px-3 py-1.5 text-xs font-semibold text-cf-text transition hover:bg-cf-surface-soft"
          >
            {hasPreferred ? "Change" : "Choose pharmacy"}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <label htmlFor="preferred-pharmacy-select" className="sr-only">
            Preferred pharmacy
          </label>
          {pharmaciesQuery.isLoading ? (
            <p className="text-sm text-cf-text-muted">Loading pharmacies…</p>
          ) : pharmaciesQuery.isError ? (
            <p className="text-sm text-cf-danger-text">
              {getErrorMessage(pharmaciesQuery.error)}
            </p>
          ) : pharmacies.length === 0 ? (
            <p className="text-sm text-cf-text-muted">
              No pharmacies available at your facility.
            </p>
          ) : (
            <select
              id="preferred-pharmacy-select"
              value={selectedId}
              onChange={(event) =>
                setSelectedId(
                  event.target.value === "" ? "" : Number(event.target.value)
                )
              }
              className="w-full rounded-cf-control border border-cf-border bg-cf-surface px-3 py-2 text-sm text-cf-text focus:border-cf-accent focus:outline-none"
            >
              <option value="">No preferred pharmacy</option>
              {pharmacies.map((pharmacy) => (
                <option key={pharmacy.id} value={pharmacy.id}>
                  {pharmacy.name}
                  {pharmacy.city ? ` — ${pharmacy.city}` : ""}
                </option>
              ))}
            </select>
          )}

          {error ? (
            <p role="alert" className="text-sm text-cf-danger-text">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {hasPreferred ? (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isPending}
                  className="text-xs font-semibold text-cf-text-muted underline-offset-2 hover:text-cf-text hover:underline disabled:opacity-50"
                >
                  Clear preferred pharmacy
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isPending}
                className="inline-flex items-center rounded-cf-control border border-cf-border bg-cf-surface px-3 py-1.5 text-xs font-semibold text-cf-text transition hover:bg-cf-surface-soft disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || pharmacies.length === 0}
                className="inline-flex items-center rounded-cf-control bg-cf-accent px-3 py-1.5 text-xs font-semibold text-cf-surface transition hover:bg-cf-accent-hover disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
