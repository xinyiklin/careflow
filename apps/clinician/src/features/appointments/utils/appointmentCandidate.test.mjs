import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { URL } from "node:url";
import { test } from "node:test";
import { facilityInstant } from "./appointmentCandidate.ts";

test("facility times and first fold occurrence survive different browser DST calendars", () => {
  const moduleUrl = new URL("./appointmentCandidate.ts", import.meta.url).href;
  const source = `
    import { facilityInstant } from ${JSON.stringify(moduleUrl)};
    console.log(JSON.stringify([
      facilityInstant("2026-03-08T02:30", "America/Phoenix").toISOString(),
      facilityInstant("2026-10-25T02:30", "Europe/Berlin").toISOString(),
      facilityInstant("2026-11-01T01:30", "America/New_York").toISOString(),
      facilityInstant("2026-04-05T01:45", "Australia/Lord_Howe").toISOString(),
    ]));
  `;
  for (const TZ of [
    "UTC",
    "America/New_York",
    "Europe/Berlin",
    "Pacific/Auckland",
  ]) {
    const result = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "--eval", source],
      { env: { ...process.env, TZ }, encoding: "utf8" }
    );
    assert.deepEqual(
      JSON.parse(result),
      [
        "2026-03-08T09:30:00.000Z",
        "2026-10-25T00:30:00.000Z",
        "2026-11-01T05:30:00.000Z",
        "2026-04-04T14:45:00.000Z",
      ],
      TZ
    );
  }
});

test("facility conversion rejects gaps and invalid calendar values", () => {
  for (const value of [
    "2026-03-08T02:30",
    "2026-02-30T10:00",
    "2026-03-01T24:10",
  ]) {
    assert.throws(() => facilityInstant(value, "America/New_York"));
  }
  assert.equal(
    facilityInstant("2026-01-01T10:00:12.123", "Asia/Kathmandu").toISOString(),
    "2026-01-01T04:15:12.123Z"
  );
});
