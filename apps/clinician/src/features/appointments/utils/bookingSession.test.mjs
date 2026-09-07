import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BookingSession,
  openBookingSession,
  visibleBookingState,
} from "./bookingSession.ts";
import {
  candidateFromForm,
  durationEnd,
  facilityInstant,
  candidateKey,
} from "./appointmentCandidate.ts";

const candidate = (end = "2030-01-01T15:30:00.000Z") => ({
  start_time: "2030-01-01T15:00:00.000Z",
  end_time: end,
  resource: "1",
  rendering_provider: "2",
});
const response = (value, status = "active") => ({
  status,
  candidate: value,
  conflicts: [],
  holders: [],
});
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

test("facility interval is independent of browser timezone and preserves manual ends", () => {
  const form = {
    appointment_time: "2030-01-01T10:00",
    end_time: "2030-01-01T10:47",
    resource: 1,
  };
  const result = candidateFromForm(form, "America/New_York");
  assert.equal(result.start_time, "2030-01-01T15:00:00.000Z");
  assert.equal(result.end_time, "2030-01-01T15:47:00.000Z");
  assert.equal(result.rendering_provider, null);
});

test("duration arithmetic crosses midnight and DST using elapsed minutes", () => {
  assert.equal(
    durationEnd("2030-01-01T23:45", 45, "America/New_York"),
    "2030-01-02T05:30:00.000Z"
  );
  assert.equal(
    durationEnd("2026-03-08T01:30", 60, "America/New_York"),
    "2026-03-08T07:30:00.000Z"
  );
  assert.equal(
    durationEnd("2026-11-01T01:00", 60, "America/New_York"),
    "2026-11-01T06:00:00.000Z"
  );
});

test("gap, invalid and nonpositive intervals are rejected; explicit fold offsets survive", () => {
  assert.throws(() => facilityInstant("2026-03-08T02:30", "America/New_York"));
  assert.throws(() => facilityInstant("not a time", "America/New_York"));
  assert.throws(() =>
    candidateFromForm(
      { appointment_time: "2030-01-01T10:00", end_time: "2030-01-01T10:00" },
      "America/New_York"
    )
  );
  assert.equal(
    facilityInstant("2026-11-01T01:30-05:00", "America/New_York").toISOString(),
    "2026-11-01T06:30:00.000Z"
  );
});

test("numeric API IDs and form string IDs identify the same candidate", () => {
  assert.equal(
    candidateKey(candidate()),
    candidateKey({ ...candidate(), resource: 1, rendering_provider: 2 })
  );
  assert.equal(
    candidateKey(candidate()),
    candidateKey({
      ...candidate(),
      start_time: "2030-01-01T15:00:00+00:00",
      end_time: "2030-01-01T15:30:00+00:00",
    })
  );
});

test("latest candidate wins; an old response cannot restore old availability", async () => {
  const first = deferred();
  const calls = [],
    states = [];
  const session = new BookingSession(
    "tab-a",
    0,
    {
      acquire: async (_id, revision, value) => {
        calls.push(revision);
        return revision === 1 ? first.promise : response(value);
      },
      heartbeat: async () => null,
      release: async () => {},
    },
    (state) => states.push(state)
  );
  const old = session.update(candidate());
  await Promise.resolve();
  const next = candidate("2030-01-01T16:00:00.000Z");
  const latest = session.update(next);
  first.resolve(response(candidate()));
  await Promise.all([old, latest]);
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(
    states
      .filter((state) => state.response)
      .map((state) => state.response.candidate),
    [next]
  );
});

test("close releases a greater revision immediately, even while acquire is stalled", async () => {
  const stalled = deferred(),
    released = [],
    states = [];
  const session = new BookingSession(
    "tab-a",
    1,
    {
      acquire: async () => stalled.promise,
      heartbeat: async () => null,
      release: async (id, revision) => released.push([id, revision]),
    },
    (state) => states.push(state)
  );
  const pending = session.update(candidate());
  await Promise.resolve();
  await session.close();
  assert.deepEqual(released, [["tab-a", 3]]);
  stalled.resolve(response(candidate()));
  await pending;
  assert.equal(
    states.some((state) => state.response),
    false
  );
});

test("rapid queued changes are coalesced without acquiring abandoned candidates", async () => {
  const calls = [];
  const session = new BookingSession(
    "tab-a",
    0,
    {
      acquire: async (_id, revision, value) => {
        calls.push(revision);
        return response(value);
      },
      heartbeat: async () => null,
      release: async () => {},
    },
    () => {}
  );
  const one = session.update(candidate());
  const two = session.update(candidate("2030-01-01T16:00:00.000Z"));
  await Promise.all([one, two]);
  assert.deepEqual(calls, [2]);
});

test("failed checks clear the active claim; heartbeat cannot silently reacquire", async () => {
  const states = [];
  let attempts = 0;
  const session = new BookingSession(
    "tab-a",
    0,
    {
      acquire: async (_id, _revision, value) => {
        if (++attempts > 1) throw new Error("network");
        return response(value);
      },
      heartbeat: async () => {
        throw new Error("should not heartbeat unknown presence");
      },
      release: async () => {},
    },
    (state) => states.push(state)
  );
  await session.update(candidate());
  await session.update(candidate("2030-01-01T16:00:00.000Z"));
  await session.heartbeat();
  assert.equal(states.at(-1).response, null);
  assert.match(states.at(-1).error, /unavailable/);
  assert.equal(attempts, 2);
});

test("lost ownership from heartbeat is reflected without any acquire", async () => {
  const states = [];
  let acquires = 0;
  const session = new BookingSession(
    "tab-a",
    0,
    {
      acquire: async (_id, _revision, value) => {
        acquires++;
        return response(value);
      },
      heartbeat: async () => response(candidate(), "revoked"),
      release: async () => {},
    },
    (state) => states.push(state)
  );
  await session.update(candidate());
  await session.heartbeat();
  await session.heartbeat();
  assert.equal(states.at(-1).response.status, "revoked");
  assert.equal(acquires, 1);
});

test("failed resize immediately releases the old interval at a higher revision", async () => {
  const releases = [],
    states = [];
  let acquires = 0;
  const session = new BookingSession(
    "tab-failed",
    4,
    {
      acquire: async (_id, _revision, value) => {
        if (++acquires === 2) throw new Error("resize never arrived");
        return response(value);
      },
      heartbeat: async () => assert.fail("failed ownership must not heartbeat"),
      release: (id, revision) => {
        releases.push([id, revision]);
        return new Promise(() => {});
      },
    },
    (state) => states.push(state)
  );
  await session.update(candidate());
  await session.update(candidate("2030-01-01T16:00:00.000Z"));
  assert.deepEqual(releases, [["tab-failed", 7]]);
  assert.match(states.at(-1).error, /unavailable/);
  assert.equal(states.at(-1).checking, false);
  await session.heartbeat();
});

test("the next edited candidate gets fresh ownership after a failed acquire", async () => {
  const calls = [],
    states = [],
    releases = [];
  const transport = {
    acquire: async (id, revision, value) => {
      calls.push([id, revision]);
      if (id === "old-session") throw new Error("request lost");
      return response(value);
    },
    heartbeat: async () => null,
    release: async (id, revision) => {
      releases.push([id, revision]);
      throw new Error("cleanup offline");
    },
  };
  let session = new BookingSession("old-session", 0, transport, (state) =>
    states.push(state)
  );
  assert.equal(await session.update(candidate()), "failed");
  assert.equal(session.isClosed, true);
  assert.match(states.at(-1).error, /unavailable/);
  const before = states.length;
  assert.equal(await session.update(candidate()), "closed");
  assert.equal(states.length, before);
  session = openBookingSession(
    session,
    () =>
      new BookingSession("fresh-session", 0, transport, (state) =>
        states.push(state)
      )
  );
  await session.update(candidate("2030-01-01T16:00:00.000Z"));
  assert.deepEqual(calls, [
    ["old-session", 1],
    ["fresh-session", 1],
  ]);
  assert.deepEqual(releases, [["old-session", 2]]);
  assert.equal(states.at(-1).response.status, "active");
  assert.equal(
    openBookingSession(session, () => assert.fail("live session replaced")),
    session
  );
});

test("a failed older resize retires queued writes without emitting stale feedback", async () => {
  let failFirst;
  const first = new Promise((_resolve, reject) => {
    failFirst = reject;
  });
  const calls = [],
    releases = [],
    states = [];
  const transport = {
    acquire: async (id, revision, value) => {
      calls.push([id, revision]);
      return id === "old" ? first : response(value);
    },
    heartbeat: async () => null,
    release: async (id, revision) => releases.push([id, revision]),
  };
  const old = new BookingSession("old", 0, transport, (state) =>
    states.push(state)
  );
  const firstUpdate = old.update(candidate());
  await Promise.resolve();
  const nextCandidate = candidate("2030-01-01T16:00:00.000Z");
  const queued = old.update(nextCandidate);
  const beforeFailure = states.length;
  failFirst(new Error("old request lost"));
  assert.equal(await firstUpdate, "failed");
  assert.equal(await queued, "closed");
  assert.equal(states.length, beforeFailure);
  const current = openBookingSession(
    old,
    () => new BookingSession("new", 0, transport, (state) => states.push(state))
  );
  await current.update(nextCandidate);
  assert.deepEqual(calls, [
    ["old", 1],
    ["new", 1],
  ]);
  assert.deepEqual(releases, [["old", 3]]);
  assert.deepEqual(states.at(-1).response.candidate, nextCandidate);
});

for (const status of ["revoked", "released"]) {
  test(`${status} remains visible when the stored candidate differs`, () => {
    const source = {
      response: {
        ...response(candidate(), status),
        conflicts: [candidate()],
        holders: [{ user_name: "Scheduler" }],
      },
      error: "",
      checking: false,
    };
    const visible = visibleBookingState(source, false);
    assert.equal(visible.response.status, status);
    assert.equal(visible.checking, false);
    assert.equal(visible.response.candidate, null);
    assert.deepEqual(visible.response.conflicts, []);
    assert.deepEqual(visible.response.holders, []);
    assert.equal(source.response.conflicts.length, 1);
    assert.equal(visibleBookingState(source, true).response, source.response);
  });
}

test("nonterminal feedback for an old interval stays hidden", () => {
  const state = { response: response(candidate()), error: "", checking: false };
  assert.deepEqual(visibleBookingState(state, false), {
    response: null,
    error: "",
    checking: true,
  });
  assert.equal(visibleBookingState(state, true), state);
});
