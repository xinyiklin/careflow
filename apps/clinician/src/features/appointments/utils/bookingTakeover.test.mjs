import assert from "node:assert/strict";
import test from "node:test";
import { BookingTakeover } from "./bookingTakeover.ts";

test("takeover only applies once to the explicitly chosen candidate", () => {
  const intent = new BookingTakeover();
  intent.request("A");
  assert.equal(intent.consume("B"), false);
  intent.request("A");
  intent.keepOnly("B");
  assert.equal(intent.consume("A"), false);
  intent.request("A");
  assert.equal(intent.consume("A"), true);
  assert.equal(intent.consume("A"), false);
});

test("closing before debounce prevents takeover in another opening", () => {
  const intent = new BookingTakeover();
  intent.request("A");
  intent.clear();
  assert.equal(intent.consume("A"), false);
  assert.equal(intent.consume("B"), false);
});
