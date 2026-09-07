export type ScheduleCandidate = {
  start_time: string;
  end_time: string;
  resource: string | number | null;
  rendering_provider: string | number | null;
};

export function pickerText(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}T${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
}

export function facilityWallText(
  instant: string | Date,
  timeZone: string
): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(instant))
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function facilityInstant(value: string, timeZone: string): Date {
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const invalid = () =>
    new Error("Choose a valid time in the facility timezone.");
  if (hasOffset) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw invalid();
    return date;
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
      value
    );
  if (!match) throw invalid();
  const [, year, month, day, hour, minute, second = "0", fraction = ""] = match;
  const wall = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  const expected = `${year}-${month}-${day}T${hour}:${minute}:${second.padStart(2, "0")}`;
  if (new Date(wall).toISOString().slice(0, 19) !== expected) throw invalid();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const wallAt = (instant: number) => {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(instant)
        .map(({ type, value: part }) => [type, part])
    );
    return Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second
    );
  };
  // Sample both sides of nearby timezone transitions. Round-trip each offset
  // to reject gaps, then choose the first fold occurrence like the backend.
  // All arithmetic uses UTC components, never the browser's local timezone.
  const offsets = new Set<number>();
  for (let hours = -36; hours <= 36; hours += 12) {
    const sample = wall + hours * 3_600_000;
    offsets.add(wallAt(sample) - sample);
  }
  const matches = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => wallAt(instant) === wall);
  if (!matches.length) throw invalid();
  return new Date(Math.min(...matches) + Number(fraction.padEnd(3, "0")));
}

export function durationEnd(
  start: string,
  minutes: number,
  timeZone: string
): string {
  const instant = facilityInstant(start, timeZone);
  if (!Number.isFinite(minutes) || minutes <= 0)
    throw new Error("Choose a visit type with a valid duration.");
  return new Date(instant.getTime() + minutes * 60_000).toISOString();
}

export function candidateFromForm(
  form: {
    appointment_time?: unknown;
    end_time?: unknown;
    resource?: unknown;
    rendering_provider?: unknown;
  },
  timeZone?: string | null
): ScheduleCandidate {
  if (!timeZone) throw new Error("Facility timezone is unavailable.");
  const start = facilityInstant(String(form.appointment_time || ""), timeZone);
  const end = facilityInstant(String(form.end_time || ""), timeZone);
  if (end <= start)
    throw new Error("Appointment end time must be after start time.");
  const id = (value: unknown) =>
    value === "" || value == null ? null : String(value);
  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    resource: id(form.resource),
    rendering_provider: id(form.rendering_provider),
  };
}

export function candidateKey(candidate: ScheduleCandidate | null): string {
  return candidate
    ? JSON.stringify([
        Date.parse(candidate.start_time),
        Date.parse(candidate.end_time),
        candidate.resource == null ? null : String(candidate.resource),
        candidate.rendering_provider == null
          ? null
          : String(candidate.rendering_provider),
      ])
    : "";
}
