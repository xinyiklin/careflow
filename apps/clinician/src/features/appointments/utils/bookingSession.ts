import type { BookingResponse } from "../api/bookingHolds";
import type { ScheduleCandidate } from "./appointmentCandidate";

type Transport = {
  acquire: (
    id: string,
    revision: number,
    candidate: ScheduleCandidate,
    takeOver: boolean
  ) => Promise<BookingResponse | null>;
  heartbeat: (id: string, revision: number) => Promise<BookingResponse | null>;
  release: (id: string, revision: number) => Promise<unknown>;
};
export type BookingState = {
  response: BookingResponse | null;
  error: string;
  checking: boolean;
};

export function visibleBookingState(
  state: BookingState,
  candidateMatches: boolean
): BookingState {
  const response = state.response;
  if (response?.status === "revoked" || response?.status === "released") {
    return {
      ...state,
      checking: false,
      response: candidateMatches
        ? response
        : { ...response, candidate: null, conflicts: [], holders: [] },
    };
  }
  return candidateMatches
    ? state
    : { response: null, error: "", checking: true };
}

export function openBookingSession(
  current: BookingSession | null,
  create: () => BookingSession
): BookingSession {
  return current && !current.isClosed ? current : create();
}

type UpdateOutcome = "updated" | "failed" | "closed" | "superseded";

// Per-opening ownership. Revisions also protect server state when a failed
// request completes after a newer request or release reaches the server.
export class BookingSession {
  readonly id: string;
  private transport: Transport;
  private emit: (state: BookingState) => void;
  private revision: number;
  private generation = 0;
  private closed = false;
  private queue: Promise<unknown> = Promise.resolve();
  private response: BookingResponse | null = null;

  constructor(
    id: string,
    revision: number,
    transport: Transport,
    emit: (state: BookingState) => void
  ) {
    this.id = id;
    this.transport = transport;
    this.emit = emit;
    this.revision = revision;
  }

  get isClosed() {
    return this.closed;
  }

  invalidate() {
    if (this.closed) return;
    this.generation += 1;
    this.emit({ response: null, error: "", checking: true });
  }

  update(
    candidate: ScheduleCandidate,
    takeOver = false
  ): Promise<UpdateOutcome> {
    if (this.closed) return Promise.resolve("closed");
    const generation = ++this.generation;
    const revision = ++this.revision;
    this.emit({ response: null, error: "", checking: true });
    const pending = this.queue.then(async (): Promise<UpdateOutcome> => {
      if (this.closed) return "closed";
      if (generation !== this.generation) return "superseded";
      try {
        const response = await this.transport.acquire(
          this.id,
          revision,
          candidate,
          takeOver
        );
        if (this.closed) return "closed";
        if (!response) throw new Error("Missing booking response");
        if (generation !== this.generation) return "superseded";
        this.response = response;
        this.emit({ response, error: "", checking: false });
        return "updated";
      } catch {
        if (this.closed) return "closed";
        const isLatest = generation === this.generation;
        this.response = null;
        // An uncertain resize may leave the previous interval on the server.
        // Retire ownership immediately, without waiting for cleanup to finish.
        void this.close();
        if (isLatest) {
          this.emit({
            response: null,
            error: "Scheduling check unavailable. Save will check again.",
            checking: false,
          });
        }
        return "failed";
      }
    });
    this.queue = pending;
    return pending;
  }

  async heartbeat() {
    if (this.closed || this.response?.status !== "active") return;
    const generation = this.generation;
    try {
      const response = await this.transport.heartbeat(this.id, this.revision);
      if (this.closed || generation !== this.generation) return;
      if (!response) throw new Error("Missing heartbeat response");
      this.response = response;
      this.emit({ response, error: "", checking: false });
    } catch {
      if (!this.closed && generation === this.generation) {
        this.response = null;
        this.emit({
          response: null,
          error:
            "Booking presence could not be checked. Save will check again.",
          checking: false,
        });
      }
    }
  }

  close() {
    if (this.closed) return Promise.resolve();
    this.closed = true;
    this.generation += 1;
    // Do not wait behind a stalled acquire. The server records a tombstone.
    return this.transport
      .release(this.id, ++this.revision)
      .catch(() => undefined);
  }
}
