import { useCallback, useEffect, useState } from "react";

import {
  beginAppointmentEditSession,
  fetchAppointmentEditSession,
} from "../api/appointments";
import type {
  AppointmentEditSessionActiveEditor,
  AppointmentEditSessionResponse,
} from "../api/appointments";
import { Button } from "../../../shared/components/ui";
import type { EntityId } from "../../../shared/api/types";
import { getErrorMessage } from "../../../shared/utils/errors";

const POLL_INTERVAL_MS = 5_000;

type AppointmentEditBlockedDialogProps = {
  isOpen: boolean;
  appointmentId?: EntityId | null;
  facilityId?: EntityId | null;
  activeEditor?: AppointmentEditSessionActiveEditor;
  onClose: () => void;
  // When omitted (e.g. surfaces that only inform), the dialog degrades to an
  // acknowledge-only notice with no take-over affordance.
  onTakeOver?: (appointmentId: EntityId) => void;
};

function getActiveEditorName(
  activeEditor?: AppointmentEditSessionActiveEditor
): string {
  return activeEditor?.user_name || "Another user";
}

export default function AppointmentEditBlockedDialog({
  isOpen,
  appointmentId,
  facilityId,
  activeEditor,
  onClose,
  onTakeOver,
}: AppointmentEditBlockedDialogProps) {
  const [session, setSession] = useState<AppointmentEditSessionResponse | null>(
    null
  );
  const [isOverriding, setIsOverriding] = useState(false);
  const [error, setError] = useState("");

  // Only manage (poll + offer take-over) when a consumer wired the override.
  const canManage = Boolean(
    isOpen && appointmentId && facilityId && onTakeOver
  );

  // Poll the lock so the take-over option appears once the holder goes idle
  // past the server's override threshold (no countdown shown).
  useEffect(() => {
    if (!canManage) {
      setSession(null);
      setError("");
      setIsOverriding(false);
      return undefined;
    }

    let cancelled = false;
    const poll = () => {
      fetchAppointmentEditSession(facilityId, appointmentId)
        .then((result) => {
          if (!cancelled) setSession(result);
        })
        .catch(() => {});
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [appointmentId, canManage, facilityId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const editor = session?.active_editor ?? activeEditor ?? null;
  // Holder released/expired the lock, or is idle past the override threshold.
  const lockFree =
    session?.status === "available" || session?.status === "active";
  const canTakeOver = canManage && (Boolean(session?.can_override) || lockFree);

  const handleTakeOver = useCallback(async () => {
    if (!appointmentId || !facilityId || !onTakeOver) return;
    setIsOverriding(true);
    setError("");
    try {
      const result = await beginAppointmentEditSession(
        facilityId,
        appointmentId,
        { override: true }
      );
      if (result?.status === "active") {
        onTakeOver(appointmentId);
        return;
      }
      // Holder resumed before we took over — refresh and keep waiting.
      setSession(result);
      setError("That appointment is still in use. Try again in a moment.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not take over the appointment."));
    } finally {
      setIsOverriding(false);
    }
  }, [appointmentId, facilityId, onTakeOver]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xs rounded-[var(--radius-cf-shell)] border border-cf-border bg-cf-surface p-4 shadow-[var(--shadow-panel-lg)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="text-sm text-cf-text">
          <span className="font-semibold">{getActiveEditorName(editor)}</span>{" "}
          is editing this appointment.
        </p>
        {error ? (
          <p className="mt-2 text-sm text-cf-danger-text">{error}</p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="default" size="sm" onClick={onClose}>
            Close
          </Button>
          {canTakeOver ? (
            <Button
              variant="warning"
              size="sm"
              onClick={handleTakeOver}
              disabled={isOverriding}
            >
              {isOverriding ? "Taking over…" : "Take over"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
