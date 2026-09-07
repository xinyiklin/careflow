import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.startsWith(".") &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
const { optimisticAppointment } = await import("./optimisticAppointment.ts");
const zone = "America/New_York";
const original = {
  id: 1,
  appointment_time: "2026-11-01T01:30:00",
  appointment_time_instant: "2026-11-01T06:30:00Z",
  end_time: "2026-11-01T02:17:00",
  end_time_instant: "2026-11-01T07:17:00Z",
  duration_minutes: 47,
};

test("naive drag clears old start identity and shifts explicit duration before reopening", () => {
  const next = optimisticAppointment(
    original,
    { appointment_time: "2026-11-02T10:00" },
    zone
  );
  assert.equal(next.appointment_time_instant, null);
  assert.equal(next.appointment_time, "2026-11-02T10:00");
  assert.equal(next.end_time, "2026-11-02T10:47");
  assert.equal(next.end_time_instant, "2026-11-02T15:47:00.000Z");
  assert.equal(next.duration_minutes, 47);
  assert.equal(original.appointment_time_instant, "2026-11-01T06:30:00Z");
});

test("offset move synchronizes exact start/end and uses the local query date", () => {
  const next = optimisticAppointment(
    original,
    { appointment_time: "2026-11-03T02:30:00Z" },
    zone
  );
  assert.equal(next.appointment_time_instant, "2026-11-03T02:30:00.000Z");
  assert.equal(next.appointment_time, "2026-11-02T21:30");
  assert.equal(next.appointment_time.slice(0, 10), "2026-11-02");
  assert.equal(next.end_time, "2026-11-02T22:17");
  assert.equal(next.end_time_instant, "2026-11-03T03:17:00.000Z");
});

test("status-only midnight update keeps its original local day and exact interval", () => {
  const appointment = {
    ...original,
    appointment_time: "2026-11-02T23:30:00",
    appointment_time_instant: "2026-11-03T04:30:00Z",
    end_time: "2026-11-03T00:17:00",
    end_time_instant: "2026-11-03T05:17:00Z",
  };
  const next = optimisticAppointment(
    appointment,
    { appointment_time: appointment.appointment_time_instant, status: 2 },
    zone
  );
  assert.equal(next.appointment_time.slice(0, 10), "2026-11-02");
  assert.equal(next.appointment_time_instant, "2026-11-03T04:30:00.000Z");
  assert.equal(next.end_time_instant, appointment.end_time_instant);
  assert.equal(next.end_time, appointment.end_time);
});

test("shift preserves elapsed duration across a facility DST transition", () => {
  const next = optimisticAppointment(
    original,
    { appointment_time: "2026-03-08T01:45" },
    zone
  );
  assert.equal(next.end_time, "2026-03-08T03:32");
  assert.equal(next.end_time_instant, "2026-03-08T07:32:00.000Z");
});

test("explicit resized end overrides old exact end without retaining stale metadata", () => {
  const next = optimisticAppointment(
    original,
    { end_time: "2026-11-01T03:00" },
    zone
  );
  assert.equal(next.end_time, "2026-11-01T03:00");
  assert.equal(next.end_time_instant, null);
  assert.equal(
    next.appointment_time_instant,
    original.appointment_time_instant
  );
});

test("legacy missing ends use duration and invalid starts cannot retain an old end", () => {
  const legacy = { ...original, end_time: null, end_time_instant: null };
  assert.equal(
    optimisticAppointment(
      legacy,
      { appointment_time: "2026-11-02T10:00" },
      zone
    ).end_time,
    "2026-11-02T10:47"
  );
  const invalid = optimisticAppointment(
    original,
    { appointment_time: "2026-03-08T02:30" },
    zone
  );
  assert.equal(invalid.appointment_time_instant, null);
  assert.equal(invalid.end_time_instant, null);
  assert.equal(invalid.end_time, null);
});
