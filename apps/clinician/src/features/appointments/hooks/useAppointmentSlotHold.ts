import { useEffect, useRef } from "react";

import { heartbeatSlotHold, releaseSlotHold } from "../api/appointments";
import type { SlotHoldKey } from "../api/appointments";
import type { EntityId } from "../../../shared/api/types";

const HEARTBEAT_INTERVAL_MS = 45_000;
// Mirrors useAppointmentEditSession: pause the heartbeat once the user is away
// so a forgotten "being booked" hold goes idle and stops blocking others.
const PRESENCE_IDLE_MS = 90_000;

type UseAppointmentSlotHoldArgs = {
  facilityId?: EntityId | null;
  // The slot currently being booked, or null when nothing is held. The initial
  // acquire happens at the call site; this hook only keeps it alive and
  // releases it on close.
  slotKey: SlotHoldKey | null;
};

export default function useAppointmentSlotHold({
  facilityId,
  slotKey,
}: UseAppointmentSlotHoldArgs) {
  const lastActivityRef = useRef(Date.now());
  const active = Boolean(slotKey && facilityId);

  useEffect(() => {
    if (!active) return undefined;

    lastActivityRef.current = Date.now();
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    const onVisibility = () => {
      if (!document.hidden) lastActivityRef.current = Date.now();
    };

    window.addEventListener("pointerdown", markActive);
    window.addEventListener("keydown", markActive);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointerdown", markActive);
      window.removeEventListener("keydown", markActive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !slotKey) return undefined;

    const intervalId = window.setInterval(() => {
      if (
        document.hidden ||
        Date.now() - lastActivityRef.current > PRESENCE_IDLE_MS
      ) {
        return;
      }
      heartbeatSlotHold(facilityId, slotKey).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      releaseSlotHold(facilityId, slotKey).catch(() => {});
    };
  }, [active, facilityId, slotKey]);
}
