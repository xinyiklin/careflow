import assert from "node:assert/strict";
import test from "node:test";
import {
  AppointmentSaveCancelled,
  createSaveAttemptScope,
  runAppointmentSaveAttempt,
} from "./appointmentSaveAttempt.ts";

const duplicate = { status: 400, data: { duplicate_day_appointment: {} } };
const overlap = { status: 409, data: { code: "schedule_overlap" } };

for (const conflicts of [
  [duplicate, overlap],
  [overlap, duplicate],
]) {
  test(`independent confirmations in ${conflicts[0] === duplicate ? "duplicate" : "overlap"}-first order`, async () => {
    const requests = [];
    const decisions = [];
    const result = await runAppointmentSaveAttempt({
      data: {
        appointment_time: "2026-09-06T10:00",
        allow_schedule_overlap: true,
        allow_same_day_double_book: true,
      },
      isCurrent: () => true,
      send: async (data) => {
        requests.push(data);
        if (requests.length <= conflicts.length)
          throw conflicts[requests.length - 1];
        return "saved";
      },
      confirm: async (kind) => {
        decisions.push(kind);
        return true;
      },
    });
    assert.equal(result, "saved");
    assert.equal(requests[0].allow_schedule_overlap, undefined);
    assert.equal(requests[0].allow_same_day_double_book, undefined);
    const firstFlag =
      conflicts[0] === duplicate
        ? "allow_same_day_double_book"
        : "allow_schedule_overlap";
    const secondFlag =
      conflicts[0] === duplicate
        ? "allow_schedule_overlap"
        : "allow_same_day_double_book";
    assert.equal(requests[1][firstFlag], true);
    assert.equal(requests[1][secondFlag], undefined);
    assert.equal(requests[2][firstFlag], true);
    assert.equal(requests[2][secondFlag], true);
    assert.equal(decisions.length, 2);
  });
}

test("rollback occurs before waiting and cancellation sends no retry", async () => {
  let rolledBack = false;
  let sends = 0;
  await assert.rejects(
    runAppointmentSaveAttempt({
      data: {},
      isCurrent: () => true,
      send: async () => {
        sends++;
        throw overlap;
      },
      beforeConfirmation: () => {
        rolledBack = true;
      },
      confirm: async () => {
        assert.equal(rolledBack, true);
        return false;
      },
    }),
    AppointmentSaveCancelled
  );
  assert.equal(sends, 1);
});

for (const reason of [
  "candidate edit",
  "close",
  "facility switch",
  "new attempt",
]) {
  test(`${reason} invalidates a pending decision`, async () => {
    const scope = createSaveAttemptScope();
    const isCurrent = scope.begin();
    let sends = 0;
    await assert.rejects(
      runAppointmentSaveAttempt({
        data: {},
        isCurrent,
        send: async () => {
          sends++;
          throw overlap;
        },
        confirm: async () => {
          if (reason === "new attempt") scope.begin();
          else scope.invalidate();
          return true;
        },
      }),
      AppointmentSaveCancelled
    );
    assert.equal(sends, 1);
  });
}

test("snapshot remains immutable while confirmation is pending", async () => {
  const original = {
    appointment_time: "original",
    nested: { value: "original" },
  };
  let sends = 0;
  await runAppointmentSaveAttempt({
    data: original,
    isCurrent: () => true,
    send: async (data) => {
      sends++;
      assert.equal(data.appointment_time, "original");
      assert.equal(data.nested.value, "original");
      if (sends === 1) {
        data.nested.value = "transport mutation";
        throw overlap;
      }
    },
    confirm: async () => {
      original.appointment_time = "changed";
      original.nested.value = "changed";
      return true;
    },
  });
});

test("network errors and repeated conflicts never automatically retry", async () => {
  for (const error of [new Error("connection closed"), overlap]) {
    let sends = 0;
    let confirms = 0;
    await assert.rejects(
      runAppointmentSaveAttempt({
        data: {},
        isCurrent: () => true,
        send: async () => {
          sends++;
          throw error;
        },
        confirm: async () => {
          confirms++;
          return true;
        },
      }),
      (failure) => failure === error
    );
    assert.equal(sends, error === overlap ? 2 : 1);
    assert.equal(confirms, error === overlap ? 1 : 0);
  }
});

test("stale successful response does not finish a newer UI operation", async () => {
  const scope = createSaveAttemptScope();
  await assert.rejects(
    runAppointmentSaveAttempt({
      data: {},
      isCurrent: scope.begin(),
      send: async () => {
        scope.invalidate();
        return "saved";
      },
      confirm: async () => assert.fail("unexpected confirmation"),
    }),
    AppointmentSaveCancelled
  );
});

test("status-only updates retain same-day acceptance but still confirm schedule overlap", async () => {
  const requests = [];
  const decisions = [];
  await runAppointmentSaveAttempt({
    data: {
      status: 2,
      allow_same_day_double_book: true,
      allow_schedule_overlap: true,
    },
    sameDayAlreadyAllowed: true,
    isCurrent: () => true,
    send: async (data) => {
      requests.push(data);
      if (requests.length === 1) throw overlap;
    },
    confirm: async (kind) => {
      decisions.push(kind);
      return true;
    },
  });
  assert.equal(requests[0].allow_same_day_double_book, true);
  assert.equal(requests[0].allow_schedule_overlap, undefined);
  assert.equal(requests[1].allow_same_day_double_book, true);
  assert.equal(requests[1].allow_schedule_overlap, true);
  assert.deepEqual(decisions, ["schedule_overlap"]);
});
