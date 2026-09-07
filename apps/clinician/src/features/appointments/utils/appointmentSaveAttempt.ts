export type SaveConflictKind = "duplicate_day_appointment" | "schedule_overlap";

export class AppointmentSaveCancelled extends Error {
  constructor() {
    super("Appointment save cancelled.");
    this.name = "AppointmentSaveCancelled";
  }
}

export function getSaveConflict(error: unknown): SaveConflictKind | null {
  const failure = error as {
    status?: number;
    data?: Record<string, unknown> | null;
  } | null;
  if (failure?.data?.duplicate_day_appointment)
    return "duplicate_day_appointment";
  if (failure?.status === 409 && failure.data?.code === "schedule_overlap") {
    return "schedule_overlap";
  }
  return null;
}

export function createSaveAttemptScope() {
  let generation = 0;
  return {
    invalidate: () => {
      generation += 1;
    },
    begin: () => {
      const identity = ++generation;
      return () => generation === identity;
    },
  };
}

/** Retries only explicit server conflicts, with a separate decision for each rule. */
export async function runAppointmentSaveAttempt<T>({
  data,
  send,
  confirm,
  isCurrent,
  beforeConfirmation,
  sameDayAlreadyAllowed = false,
}: {
  data: Record<string, unknown>;
  send: (data: Record<string, unknown>) => Promise<T>;
  confirm: (kind: SaveConflictKind) => Promise<boolean>;
  isCurrent: () => boolean;
  beforeConfirmation?: () => void;
  sameDayAlreadyAllowed?: boolean;
}): Promise<T> {
  const snapshot = structuredClone(data);
  delete snapshot.allow_schedule_overlap;
  delete snapshot.allow_same_day_double_book;
  const confirmed = new Set<SaveConflictKind>(
    sameDayAlreadyAllowed ? ["duplicate_day_appointment"] : []
  );
  const assertCurrent = () => {
    if (!isCurrent()) throw new AppointmentSaveCancelled();
  };

  for (;;) {
    assertCurrent();
    try {
      const result = await send({
        ...structuredClone(snapshot),
        ...(confirmed.has("duplicate_day_appointment")
          ? { allow_same_day_double_book: true }
          : {}),
        ...(confirmed.has("schedule_overlap")
          ? { allow_schedule_overlap: true }
          : {}),
      });
      assertCurrent();
      return result;
    } catch (error) {
      assertCurrent();
      const kind = getSaveConflict(error);
      if (!kind || confirmed.has(kind)) throw error;
      beforeConfirmation?.();
      assertCurrent();
      const accepted = await confirm(kind);
      assertCurrent();
      if (!accepted) throw new AppointmentSaveCancelled();
      confirmed.add(kind);
    }
  }
}
