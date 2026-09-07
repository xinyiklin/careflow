import { useEffect, useRef, useState } from "react";
import {
  acquireBookingHold,
  checkAppointmentSchedule,
  heartbeatBookingHold,
  releaseBookingHold,
} from "../api/bookingHolds";
import type { BookingSeed } from "../api/bookingHolds";
import {
  BookingSession,
  openBookingSession,
  visibleBookingState,
} from "../utils/bookingSession";
import type { BookingState } from "../utils/bookingSession";
import type { ScheduleCandidate } from "../utils/appointmentCandidate";
import { candidateKey } from "../utils/appointmentCandidate";
import { BookingTakeover } from "../utils/bookingTakeover";
import type { EntityId } from "../../../shared/api/types";

const emptyState: BookingState = { response: null, error: "", checking: false };

export default function useAppointmentBooking({
  isOpen,
  ready,
  facilityId,
  appointmentId,
  candidate,
  seed,
}: {
  isOpen: boolean;
  ready: boolean;
  facilityId?: EntityId | null;
  appointmentId?: EntityId | null;
  candidate: ScheduleCandidate | null;
  seed?: BookingSeed | null;
}) {
  const [state, setState] = useState<BookingState>(emptyState);
  const [retryVersion, setRetryVersion] = useState(0);
  const session = useRef<BookingSession | null>(null);
  const currentCandidate = useRef(candidate);
  const seedRef = useRef(seed);
  const readyRef = useRef(ready);
  const consumedSeedId = useRef<string | null>(null);
  const [takeOverNext] = useState(() => new BookingTakeover());
  const lastActivity = useRef(Date.now());
  const key = candidateKey(candidate);

  useEffect(() => {
    currentCandidate.current = candidate;
    seedRef.current = seed;
    readyRef.current = ready;
    takeOverNext.keepOnly(key);
  });

  useEffect(() => {
    if (!isOpen || !facilityId) return;
    let requestGeneration = 0;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const createSession = () => {
      const initial =
        seedRef.current?.sessionId === consumedSeedId.current
          ? null
          : seedRef.current;
      if (initial) consumedSeedId.current = initial.sessionId;
      return new BookingSession(
        initial?.sessionId || crypto.randomUUID(),
        initial?.revision || 0,
        {
          acquire: (id, revision, value, takeOver) =>
            acquireBookingHold(facilityId, id, revision, value, takeOver),
          heartbeat: (id, revision) =>
            heartbeatBookingHold(facilityId, id, revision),
          release: (id, revision) =>
            releaseBookingHold(facilityId, id, revision),
        },
        (next) => {
          if (!disposed) setState(next);
        }
      );
    };
    if (!appointmentId && seedRef.current) session.current = createSession();
    const request = () => {
      // RHF reset is applied after the first open render. Keep transferred
      // ownership until that initialization finishes or the modal closes.
      if (!readyRef.current) return;
      const value = currentCandidate.current;
      const generation = ++requestGeneration;
      if (!value) {
        void session.current?.close();
        session.current = null;
        setState(emptyState);
        return;
      }
      setState({ response: null, error: "", checking: true });
      session.current?.invalidate();
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (disposed || generation !== requestGeneration) return;
        if (appointmentId) {
          try {
            const response = await checkAppointmentSchedule(
              facilityId,
              value,
              appointmentId
            );
            if (!response) throw new Error("Missing scheduling response");
            if (!disposed && generation === requestGeneration)
              setState({ response, error: "", checking: false });
          } catch {
            if (!disposed && generation === requestGeneration)
              setState({
                response: null,
                error: "Scheduling check unavailable. Save will check again.",
                checking: false,
              });
          }
        } else {
          const owner = openBookingSession(session.current, createSession);
          session.current = owner;
          const takeOver = takeOverNext.consume(candidateKey(value));
          const outcome = await owner.update(value, takeOver);
          if (
            outcome === "closed" &&
            !disposed &&
            generation === requestGeneration &&
            session.current === owner
          ) {
            // A preceding queued update failed and retired this session. The
            // current edit still gets its own attempt with a fresh identity.
            const replacement = openBookingSession(owner, createSession);
            session.current = replacement;
            await replacement.update(value, takeOver);
          }
        }
      }, 200);
    };
    // Scoped event channel keeps lifecycle ownership stable as the form changes.
    const listener = () => request();
    refresh.current = listener;
    request();
    const markActivity = () => {
      lastActivity.current = Date.now();
    };
    const onVisibility = () => {
      if (!document.hidden) markActivity();
    };
    window.addEventListener("pointerdown", markActivity);
    window.addEventListener("keydown", markActivity);
    document.addEventListener("visibilitychange", onVisibility);
    markActivity();
    const heartbeat = setInterval(() => {
      if (!document.hidden && Date.now() - lastActivity.current <= 90_000)
        void session.current?.heartbeat();
    }, 45_000);
    return () => {
      disposed = true;
      takeOverNext.clear();
      requestGeneration += 1;
      clearTimeout(timer);
      clearInterval(heartbeat);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      void session.current?.close();
      session.current = null;
      refresh.current = null;
    };
  }, [isOpen, facilityId, appointmentId, takeOverNext]);

  const refresh = useRef<(() => void) | null>(null);
  useEffect(() => {
    refresh.current?.();
  }, [key, ready, retryVersion]);

  const visibleState = visibleBookingState(
    state,
    !state.response?.candidate || candidateKey(state.response.candidate) === key
  );
  return {
    ...visibleState,
    retry: () => {
      void session.current?.close();
      session.current = null;
      takeOverNext.clear();
      setRetryVersion((value) => value + 1);
    },
    takeOver: () => {
      takeOverNext.request(key);
      if (
        state.response?.status === "revoked" ||
        state.response?.status === "released"
      ) {
        void session.current?.close();
        session.current = null;
      }
      setRetryVersion((value) => value + 1);
    },
  };
}
