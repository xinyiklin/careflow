import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import process from "node:process";
import test from "node:test";
import { createFormControl } from "react-hook-form";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.startsWith(".") &&
        !/\.[a-z]+$/i.test(specifier)
      )
        return nextResolve(`${specifier}.ts`, context);
      throw error;
    }
  },
});
const {
  appointmentPickerAdapter,
  appointmentPickerDate,
  AppointmentPickerDate,
  restorePickerDate,
} = await import("./appointmentPicker.ts");
const { pickerText, facilityWallText, facilityInstant } =
  await import("./appointmentCandidate.ts");

test("actual picker adapter preserves facility wall times through browser DST gaps", () => {
  const originalTZ = process.env.TZ;
  try {
    for (const TZ of [
      "UTC",
      "America/New_York",
      "Europe/Berlin",
      "Pacific/Auckland",
    ]) {
      process.env.TZ = TZ;
      const Adapter = appointmentPickerAdapter("America/Phoenix");
      const adapter = new Adapter();
      const start = appointmentPickerDate(
        "2026-03-08T09:30:00Z",
        "America/Phoenix"
      );
      assert.ok(start instanceof AppointmentPickerDate);
      assert.equal(pickerText(start), "2026-03-08T02:30", TZ);
      assert.equal(
        adapter.formatByString(start, "yyyy-MM-dd HH:mm"),
        "2026-03-08 02:30",
        TZ
      );
      const typed = adapter.parse("03/08/2026 02:30 AM", "MM/dd/yyyy hh:mm aa");
      assert.equal(pickerText(typed), "2026-03-08T02:30", TZ);
      assert.equal(
        pickerText(adapter.addMinutes(typed, 15)),
        "2026-03-08T02:45",
        TZ
      );
      assert.equal(
        pickerText(adapter.setHours(adapter.startOfDay(start), 2)),
        "2026-03-08T02:00",
        TZ
      );
      assert.equal(
        pickerText(adapter.date("2026-03-08T02:30")),
        "2026-03-08T02:30",
        TZ
      );
      assert.ok(
        adapter
          .getWeekArray(start)
          .flat()
          .every((date) => date instanceof AppointmentPickerDate)
      );
      assert.equal(
        facilityWallText("2026-03-08T09:30Z", "America/Phoenix"),
        pickerText(start)
      );
      assert.equal(
        facilityInstant(pickerText(typed), "America/Phoenix").toISOString(),
        "2026-03-08T09:30:00.000Z"
      );
    }
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test("picker preserves wall display for both folds while instant hints distinguish them", () => {
  for (const instant of ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z"]) {
    const date = appointmentPickerDate(instant, "America/New_York");
    assert.equal(pickerText(date), "2026-11-01T01:30");
    assert.equal(
      facilityWallText(instant, "America/New_York"),
      pickerText(date)
    );
  }
});

test("RHF reset and setValue cloning preserve picker display and submitted facility time", () => {
  const originalTZ = process.env.TZ;
  try {
    for (const TZ of [
      "America/New_York",
      "Europe/Berlin",
      "Pacific/Auckland",
    ]) {
      process.env.TZ = TZ;
      for (const [zone, instant, wall] of [
        ["America/New_York", "2026-09-06T14:00:00Z", "2026-09-06T10:00"],
        ["America/Phoenix", "2026-03-08T09:30:00Z", "2026-03-08T02:30"],
      ]) {
        const form = createFormControl({
          defaultValues: { appointment_time: null },
        });
        const unsubscribe = form.subscribe({
          formState: { values: true },
          callback() {},
        });
        const Adapter = appointmentPickerAdapter(zone);
        const adapter = new Adapter();
        form.reset({ appointment_time: appointmentPickerDate(instant, zone) });
        const stored = form.getValues("appointment_time");
        assert.equal(stored.constructor, Date);
        assert.equal(pickerText(stored), wall, TZ);
        assert.equal(
          adapter.formatByString(
            restorePickerDate(stored),
            "yyyy-MM-dd'T'HH:mm"
          ),
          wall,
          TZ
        );
        assert.equal(
          facilityInstant(pickerText(stored), zone).getTime(),
          Date.parse(instant)
        );
        form.setValue(
          "appointment_time",
          adapter.addMinutes(restorePickerDate(stored), 15)
        );
        const edited = form.getValues("appointment_time");
        assert.equal(edited.constructor, Date);
        assert.equal(
          facilityInstant(pickerText(edited), zone).getTime(),
          Date.parse(instant) + 15 * 60000
        );
        assert.equal(
          adapter.formatByString(
            restorePickerDate(edited),
            "yyyy-MM-dd'T'HH:mm"
          ),
          pickerText(edited)
        );
        unsubscribe();
      }
    }
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});
