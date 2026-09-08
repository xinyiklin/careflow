import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAppointmentsScheduleWindow,
  mergeScheduleWindows,
  resolveScheduleWindow,
} from "./scheduleWindowUtils.ts";
import { generateTimeSlots } from "../../../shared/utils/timeSlots.ts";
import {
  buildPositionedAppointments,
  getAppointmentDurationMinutes,
} from "./scheduleGridMath.ts";
import {
  getFacilityOperatingWindow,
  isFacilityOperatingDate,
} from "./scheduleOperatingHours.ts";
const hours = { startMinute: 9 * 60, endMinute: 17 * 60 };
const intervals = [5, 10, 15, 20, 30, 60];

for (const interval of intervals) {
  test(`full day includes midnight through last ${interval}-minute slot on empty/closed days`, () => {
    const window = resolveScheduleWindow(true, hours, null);
    const slots = generateTimeSlots(
      interval,
      window.startMinute,
      window.endMinute
    );
    assert.equal(slots.length, 1440 / interval);
    assert.equal(slots[0].time24, "00:00");
    assert.equal(slots.at(-1).value, 1440 - interval);
    assert.ok(slots.every((slot) => slot.value < 1440));
  });
  test(`business hours retains complete early and late appointments at ${interval} minutes`, () => {
    const appointments = [
      { time: "07:10", duration_minutes: 25 },
      { time: "18:00", duration_minutes: 75 },
    ];
    const window = resolveScheduleWindow(
      false,
      hours,
      getAppointmentsScheduleWindow(appointments, interval)
    );
    assert.ok(window.startMinute <= 430);
    assert.ok(window.endMinute >= 1155);
    const full = resolveScheduleWindow(true, hours);
    for (const origin of [window.startMinute, full.startMinute]) {
      const positioned = buildPositionedAppointments(
        appointments,
        interval,
        origin
      );
      assert.equal(positioned.length, 2);
      assert.ok(positioned.every((entry) => entry.startSlot >= 0));
      assert.equal(getAppointmentDurationMinutes(positioned[1], interval), 75);
    }
  });
}

test("shared rail unions different business windows while full-day columns agree", () => {
  const early = resolveScheduleWindow(false, {
    startMinute: 420,
    endMinute: 900,
  });
  const late = resolveScheduleWindow(false, {
    startMinute: 600,
    endMinute: 1200,
  });
  assert.deepEqual(mergeScheduleWindows(early, late), {
    startMinute: 420,
    endMinute: 1200,
  });
  assert.deepEqual(
    resolveScheduleWindow(true, early),
    resolveScheduleWindow(true, late)
  );
  assert.deepEqual(resolveScheduleWindow(false, hours), hours);
});

test("display mode does not change facility-local closed-day or operating hours", () => {
  const facility = {
    operating_days: [1, 2, 3, 4, 5],
    operating_start_time: "09:00",
    operating_end_time: "17:00",
  };
  for (const date of ["2026-03-08", "2026-11-01"]) {
    assert.equal(
      isFacilityOperatingDate(date, "America/New_York", facility),
      false
    );
    const actual = getFacilityOperatingWindow(facility, 7);
    const full = resolveScheduleWindow(true, actual);
    assert.deepEqual(full, { startMinute: 0, endMinute: 1440 });
    assert.deepEqual(actual, hours);
  }
});
