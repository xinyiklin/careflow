import { useCallback, useEffect, useRef, useState } from "react";
import {
  acquireBookingHold,
  releaseBookingHold,
} from "../../appointments/api/bookingHolds";
import type {
  BookingResponse,
  BookingSeed,
} from "../../appointments/api/bookingHolds";
import { candidateFromForm } from "../../appointments/utils/appointmentCandidate";
import type { ScheduleCandidate } from "../../appointments/utils/appointmentCandidate";
import type { EntityId } from "../../../shared/api/types";
import type useAppointmentFlow from "../../appointments/hooks/useAppointmentFlow";

type Modal = ReturnType<typeof useAppointmentFlow>["modal"];
type PreparedForm = ReturnType<Modal["prepareFromSlot"]>;
type Entry = {
  facilityId: EntityId;
  form: PreparedForm;
  candidate: ScheduleCandidate;
  sessionId: string;
  revision: number;
  busy: boolean;
};
const closed = { isOpen: false, name: "", isOverriding: false };

/** Owns a grid hold only until its exact form and session are handed to the modal. */
export default function useSlotBookingEntry({
  facilityId,
  timeZone,
  modal,
  invalidateConfirmations,
}: {
  facilityId?: EntityId | null;
  timeZone?: string | null;
  modal: Pick<Modal, "prepareFromSlot" | "openPrepared" | "isOpen">;
  invalidateConfirmations: () => void;
}) {
  const options = useRef({
    facilityId,
    timeZone,
    modal,
    invalidateConfirmations,
  });
  options.current = { facilityId, timeZone, modal, invalidateConfirmations };
  const entry = useRef<Entry | null>(null);
  const [dialog, setDialog] = useState(closed);

  const release = useCallback((value: Entry) => {
    // A tombstone is sent immediately even when acquisition has not arrived yet.
    void releaseBookingHold(
      value.facilityId,
      value.sessionId,
      value.revision + 1
    ).catch(() => {});
  }, []);

  const cancel = useCallback(() => {
    const value = entry.current;
    entry.current = null;
    if (value) release(value);
    setDialog(closed);
  }, [release]);

  useEffect(() => {
    cancel();
    return cancel;
  }, [facilityId, cancel]);
  useEffect(() => {
    if (modal.isOpen) cancel();
  }, [modal.isOpen, cancel]);

  const isCurrent = useCallback(
    (value: Entry) =>
      entry.current === value &&
      options.current.facilityId === value.facilityId &&
      !options.current.modal.isOpen,
    []
  );

  const openForm = useCallback(
    (value: Entry, response: BookingResponse | null) => {
      if (!isCurrent(value)) {
        release(value);
        return;
      }
      entry.current = null;
      setDialog(closed);
      const seed: BookingSeed = {
        sessionId: value.sessionId,
        revision: value.revision,
        response,
      };
      options.current.modal.openPrepared(value.form, seed);
    },
    [isCurrent, release]
  );

  const acquire = useCallback(
    async (value: Entry, takeOver = false) => {
      value.busy = true;
      try {
        const response = await acquireBookingHold(
          value.facilityId,
          value.sessionId,
          value.revision,
          value.candidate,
          takeOver
        );
        if (!isCurrent(value)) {
          release(value);
          return;
        }
        value.busy = false;
        if (!response) {
          openForm(value, null);
          return;
        }
        if (response.status === "occupied") {
          const names = [
            ...new Set(
              response.holders.map((holder) => holder.user_name).filter(Boolean)
            ),
          ];
          setDialog({
            isOpen: true,
            name:
              response.holders.length > 1
                ? `${names[0] || "Another scheduler"} (and ${response.holders.length - 1} more)`
                : names[0] || "Another scheduler",
            isOverriding: false,
          });
          return;
        }
        if (response.status === "released" || response.status === "revoked") {
          entry.current = null;
          setDialog(closed);
          // Terminal sessions cannot be reused; the modal starts a new session.
          options.current.modal.openPrepared(value.form);
          return;
        }
        openForm(value, response);
      } catch {
        // An uncertain acquire transfers its identity, so the modal can recheck it.
        openForm(value, null);
      }
    },
    [isCurrent, openForm, release]
  );

  const openFromSlot = useCallback(
    async (date: string, time24: string, resourceId: EntityId | "" = "") => {
      cancel();
      const current = options.current;
      current.invalidateConfirmations();
      const form = current.modal.prepareFromSlot(date, time24, resourceId);
      let candidate: ScheduleCandidate;
      try {
        candidate = candidateFromForm(form, current.timeZone);
      } catch {
        current.modal.openPrepared(form);
        return;
      }
      if (!current.facilityId) {
        current.modal.openPrepared(form);
        return;
      }
      const value: Entry = {
        facilityId: current.facilityId,
        form: structuredClone(form),
        candidate,
        sessionId: crypto.randomUUID(),
        revision: 1,
        busy: false,
      };
      entry.current = value;
      await acquire(value);
    },
    [acquire, cancel]
  );

  const takeOver = useCallback(async () => {
    const value = entry.current;
    if (!value || value.busy || !isCurrent(value)) return;
    value.revision += 1;
    setDialog((current) => ({ ...current, isOverriding: true }));
    await acquire(value, true);
  }, [acquire, isCurrent]);

  return { dialog, openFromSlot, takeOver, cancel };
}
