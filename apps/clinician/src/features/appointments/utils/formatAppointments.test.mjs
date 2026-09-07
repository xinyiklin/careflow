import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Production imports use the bundler's extensionless TypeScript resolution.
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
const { default: formatAppointments } = await import("./formatAppointments.ts");

const lateFoldAppointment = {
  id: 1,
  patient_name: "Synthetic patient",
  appointment_time: "2026-11-01T01:30:00",
  end_time: "2026-11-01T02:15:00",
  appointment_time_instant: "2026-11-01T06:30:00Z",
  end_time_instant: "2026-11-01T07:15:00Z",
  duration_minutes: 45,
};

test("schedule editing retains the second fold occurrence and explicit end", () => {
  let opened;
  const [formatted] = formatAppointments(
    [lateFoldAppointment],
    (value) => {
      opened = value;
    },
    "America/New_York"
  );
  assert.equal(formatted.date, "2026-11-01");
  assert.equal(formatted.time, "01:30");
  assert.equal(
    formatted.appointment_time,
    lateFoldAppointment.appointment_time
  );
  formatted.onEdit();
  assert.equal(opened.appointment_time_instant, "2026-11-01T06:30:00Z");
  assert.equal(opened.end_time_instant, "2026-11-01T07:15:00Z");
});

test("optimistic UTC status payload stays at the facility-local grid position", () => {
  const [formatted] = formatAppointments(
    [
      {
        ...lateFoldAppointment,
        appointment_time: lateFoldAppointment.appointment_time_instant,
        end_time: lateFoldAppointment.end_time_instant,
      },
    ],
    () => {},
    "America/New_York"
  );
  assert.equal(formatted.appointment_time, "2026-11-01T01:30");
  assert.equal(formatted.end_time, "2026-11-01T02:15");
  assert.equal(formatted.time, "01:30");
  assert.equal(formatted.end_time_str, "02:15");
  assert.equal(formatted.appointment_time_instant, "2026-11-01T06:30:00Z");
});

test("facility display crosses midnight independently of the browser timezone", () => {
  const [formatted] = formatAppointments(
    [
      {
        id: 2,
        appointment_time: "2030-01-02T02:30:00Z",
        end_time: "2030-01-02T03:00:00Z",
      },
    ],
    () => {},
    "America/New_York"
  );
  assert.equal(formatted.date, "2030-01-01");
  assert.equal(formatted.time, "21:30");
  assert.equal(formatted.end_date, "2030-01-01");
  assert.equal(formatted.end_time_str, "22:00");
});
