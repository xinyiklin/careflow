import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { revealPatientSsn } from "../../api/patients";
import { Input } from "../../../../shared/components/ui";
import { formatMaskedSsn } from "../PatientHubSections";
import { getErrorMessage } from "../../../../shared/utils/errors";
import {
  formatSsnInput,
  getDigits,
  getSsnInputDigits,
  handleFormattedInputDeletion,
  validateSsn,
} from "../../utils/contactValidation";

import type { KeyboardEvent } from "react";
import type { EntityId } from "../../../../shared/api/types";
import type { PatientPatchPayload, PatientRecord } from "../../types";

type SsnStatus = "idle" | "loading" | "saving";

type SsnSectionProps = {
  patient: PatientRecord;
  facilityId?: EntityId | null;
  onSavePartial: (partial: PatientPatchPayload) => Promise<void> | void;
};

export default function SsnSection({
  patient,
  facilityId,
  onSavePartial,
}: SsnSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [loadedSsn, setLoadedSsn] = useState("");
  const [status, setStatus] = useState<SsnStatus>("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const loadedSsnDigits = getDigits(loadedSsn);
  const hasStoredSsn = Boolean(patient?.ssn_last4 || loadedSsnDigits);
  const maskedDisplay =
    loadedSsnDigits.length === 9
      ? `***-**-${loadedSsnDigits.slice(-4)}`
      : formatMaskedSsn(patient);

  useEffect(() => {
    setLoadedSsn("");
    setDraft("");
    setIsEditing(false);
    setError("");
  }, [patient?.id]);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const beginEdit = async () => {
    if (status === "loading" || status === "saving") return;
    setError("");

    if (!hasStoredSsn) {
      setDraft("");
      setIsEditing(true);
      return;
    }

    if (loadedSsnDigits.length === 9) {
      setDraft(formatSsnInput(loadedSsnDigits));
      setIsEditing(true);
      return;
    }

    if (!patient?.id || !facilityId) return;

    try {
      setStatus("loading");
      const response = await revealPatientSsn(patient.id, facilityId);
      const nextSsn = getSsnInputDigits(response?.ssn || "");
      if (nextSsn.length !== 9) {
        setDraft("");
        setIsEditing(true);
        setError("Stored full SSN is unavailable; enter a replacement.");
        return;
      }

      setLoadedSsn(nextSsn);
      setDraft(formatSsnInput(nextSsn));
      setIsEditing(true);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load SSN for editing."));
    } finally {
      setStatus("idle");
    }
  };

  const cancelEdit = () => {
    setDraft("");
    setError("");
    setIsEditing(false);
  };

  const saveSsn = async () => {
    if (status === "saving") return;
    const digits = getDigits(draft);
    const ssnError = validateSsn(draft);
    if (ssnError) {
      setError(ssnError);
      return;
    }

    try {
      setStatus("saving");
      setError("");
      await onSavePartial({ ssn: digits });
      setLoadedSsn(digits);
      setDraft("");
      setIsEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save SSN."));
    } finally {
      setStatus("idle");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      saveSsn();
    }
  };

  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        SSN
      </div>

      {isEditing ? (
        <div className="mt-0.5 flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <Input
              ref={inputRef}
              inputMode="numeric"
              value={draft}
              disabled={status === "saving"}
              onChange={(event) => setDraft(formatSsnInput(event.target.value))}
              onKeyDown={(event) => {
                if (
                  handleFormattedInputDeletion(event, formatSsnInput, setDraft)
                ) {
                  return;
                }
                handleKeyDown(event);
              }}
              placeholder="Enter full SSN"
              className="h-9 py-0 font-mono tracking-[0.14em]"
            />
          </div>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={saveSsn}
            disabled={status === "saving"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-muted shadow-sm transition hover:bg-cf-surface-soft hover:text-cf-text"
            aria-label="Save SSN"
          >
            {status === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={cancelEdit}
            disabled={status === "saving"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cf-border bg-cf-surface text-cf-text-subtle shadow-sm transition hover:bg-cf-surface-soft hover:text-cf-text-muted"
            aria-label="Cancel SSN edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          disabled={status === "loading"}
          className="group mt-0.5 -mx-2 flex h-9 w-[calc(100%+1rem)] items-center rounded-lg px-2 text-left font-mono text-sm tracking-[0.18em] text-cf-text transition hover:bg-cf-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cf-accent/25 disabled:cursor-wait disabled:opacity-70"
        >
          {status === "loading" ? (
            <span className="inline-flex items-center gap-2 font-sans text-xs tracking-normal text-cf-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading
            </span>
          ) : (
            maskedDisplay
          )}
        </button>
      )}

      <p className="mt-1 h-4 truncate text-xs text-cf-danger-text">{error}</p>
    </div>
  );
}
