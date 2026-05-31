import { useEffect, useRef, useState } from "react";

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
import { FIELD_BOX_CLASS } from "./InlineEditField";

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

  // SSN can't be shown in full at rest, so unlike the other always-editable
  // fields it stays click-to-reveal: focusing the box loads the stored value
  // (decrypting on the server when needed) and swaps in an editable input.
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

  // Blurring out (e.g. into another field) auto-saves a valid change, and
  // otherwise closes the field — re-masking the value.
  const handleBlur = () => {
    if (status === "saving") return;
    const unchanged = getDigits(draft) === loadedSsnDigits;
    if (unchanged || validateSsn(draft)) {
      cancelEdit();
      return;
    }
    void saveSsn();
  };

  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cf-text-subtle">
        SSN
      </div>

      {isEditing ? (
        <Input
          ref={inputRef}
          inputMode="numeric"
          value={draft}
          disabled={status === "saving"}
          onChange={(event) => setDraft(formatSsnInput(event.target.value))}
          onKeyDown={(event) => {
            if (handleFormattedInputDeletion(event, formatSsnInput, setDraft)) {
              return;
            }
            handleKeyDown(event);
          }}
          onBlur={handleBlur}
          placeholder="Enter full SSN"
          aria-label="SSN"
          aria-invalid={Boolean(error) || undefined}
          className={[
            "h-9 font-mono tracking-[0.14em] !py-0",
            FIELD_BOX_CLASS,
            error ? "!border-cf-danger-text" : "",
          ].join(" ")}
        />
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          disabled={status === "loading"}
          aria-label="Reveal and edit SSN"
          className="flex h-9 w-full items-center rounded-lg border border-cf-border bg-cf-surface px-2.5 text-left font-mono text-sm tracking-[0.18em] text-cf-text outline-none transition hover:border-cf-border-strong focus:border-cf-accent focus:ring-2 focus:ring-cf-accent/20 disabled:cursor-wait disabled:opacity-70"
        >
          {status === "loading" ? (
            <span className="text-cf-text-subtle">Revealing…</span>
          ) : (
            maskedDisplay
          )}
        </button>
      )}

      {error ? (
        <p className="mt-1 truncate text-xs text-cf-danger-text">{error}</p>
      ) : null}
    </div>
  );
}
