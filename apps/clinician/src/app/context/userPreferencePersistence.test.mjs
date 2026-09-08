import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers";
import { UserPreferenceSaveQueue } from "./userPreferencePersistence.ts";
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("an edit immediately invalidates an earlier response before the next save starts", async () => {
  const queue = new UserPreferenceSaveQueue();
  const first = deferred();
  const pending = queue.enqueue(queue.edit(), () => first.promise);
  await tick();
  queue.edit();
  first.resolve("older snapshot");
  assert.equal((await pending).kind, "obsolete");
});

test("retry follows an older in-flight write and persists the latest snapshot last", async () => {
  const queue = new UserPreferenceSaveQueue();
  const first = deferred();
  const writes = [];
  const old = queue.enqueue(queue.edit(), async () => {
    writes.push("old start");
    await first.promise;
    writes.push("old finish");
  });
  await tick();
  const retry = queue.enqueue(queue.edit(), async () => {
    writes.push("latest");
    return "latest snapshot";
  });
  await tick();
  assert.deepEqual(writes, ["old start"]);
  first.resolve();
  assert.equal((await old).kind, "obsolete");
  assert.deepEqual(await retry, { kind: "saved", value: "latest snapshot" });
  assert.deepEqual(writes, ["old start", "old finish", "latest"]);
});

test("failures are recoverable and never prevent the next successful write", async () => {
  const queue = new UserPreferenceSaveQueue();
  assert.equal(
    (
      await queue.enqueue(queue.edit(), async () => {
        throw new Error("network");
      })
    ).kind,
    "error"
  );
  assert.deepEqual(await queue.enqueue(queue.edit(), async () => "retried"), {
    kind: "saved",
    value: "retried",
  });
});

test("an earlier failure cannot replace newer save status", async () => {
  const queue = new UserPreferenceSaveQueue();
  const request = deferred();
  const old = queue.enqueue(queue.edit(), () => request.promise);
  await tick();
  const latest = queue.enqueue(queue.edit(), async () => "new");
  request.reject(new Error("old failure"));
  assert.equal((await old).kind, "obsolete");
  assert.equal((await latest).kind, "saved");
});

test("logout invalidates queued old-user sends and in-flight acknowledgments", async () => {
  const queue = new UserPreferenceSaveQueue();
  const request = deferred();
  const old = queue.enqueue(queue.edit(), () => request.promise);
  await tick();
  let staleSends = 0;
  const queued = queue.enqueue(queue.edit(), async () => {
    staleSends++;
  });
  queue.dispose();
  request.resolve("old user");
  assert.equal((await old).kind, "obsolete");
  assert.equal((await queued).kind, "obsolete");
  assert.equal(staleSends, 0);
  const nextUser = new UserPreferenceSaveQueue();
  assert.deepEqual(
    await nextUser.enqueue(nextUser.edit(), async () => "new user"),
    { kind: "saved", value: "new user" }
  );
});

test("final logout snapshot clears notes after any older in-flight note save", async () => {
  const queue = new UserPreferenceSaveQueue();
  const older = deferred();
  let storedNote = "initial";
  const old = queue.enqueue(queue.edit(), async () => {
    await older.promise;
    storedNote = "old note";
  });
  await tick();
  const final = queue.enqueue(queue.edit(), async () => {
    storedNote = "";
  });
  older.resolve();
  await Promise.all([old, final]);
  assert.equal(storedNote, "");
});

test("effect reactivation cannot revive a request from the disposed generation", async () => {
  const queue = new UserPreferenceSaveQueue();
  const stamp = queue.edit();
  queue.dispose();
  queue.activate();
  let calls = 0;
  assert.equal(
    (
      await queue.enqueue(stamp, async () => {
        calls++;
      })
    ).kind,
    "obsolete"
  );
  assert.equal(calls, 0);
  assert.equal(
    (await queue.enqueue(queue.edit(), async () => true)).kind,
    "saved"
  );
});
