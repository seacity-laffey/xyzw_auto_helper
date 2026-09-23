import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGameInputControl,
  createGameInputDispatch,
  createGameInputScheduler,
  normalizeGameInputEvent,
} from "../src/utils/gameInputSync.js";

test("game input sync accepts normalized mouse input", () => {
  assert.deepEqual(
    normalizeGameInputEvent({
      eventType: "mousedown",
      xRatio: 0.25,
      yRatio: 0.75,
      button: 0,
      buttons: 1,
      shiftKey: true,
    }),
    {
      eventType: "mousedown",
      xRatio: 0.25,
      yRatio: 0.75,
      button: 0,
      buttons: 1,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: true,
      identifier: 0,
    },
  );
});

function schedulerFixture(randomValues = [0]) {
  let now = 0;
  const timers = new Set();
  const sent = [];
  const scheduler = createGameInputScheduler((message) => sent.push({ at: now, ...message.input }), {
    random: () => randomValues.shift() ?? 0,
    setTimer(callback, delay) {
      const timer = { callback, at: now + delay };
      timers.add(timer);
      return timer;
    },
    clearTimer: (timer) => timers.delete(timer),
  });
  const advance = (duration) => {
    const end = now + duration;
    for (;;) {
      const next = [...timers].filter((timer) => timer.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!next)
        break;
      now = next.at;
      timers.delete(next);
      next.callback();
    }
    now = end;
  };
  const push = (eventType, overrides = {}) => scheduler.push({
    eventType, xRatio: 0.5, yRatio: 0.5, button: 0, buttons: 1,
    gestureId: "gesture-1", sequence: 0, ...overrides,
  });
  return { scheduler, sent, advance, push, timers };
}

test("each follower delays a complete click independently by 500–1500ms", () => {
  const fast = schedulerFixture([0]);
  const slow = schedulerFixture([0.999999]);
  for (const fixture of [fast, slow]) {
    fixture.push("mousedown");
    fixture.push("mouseup", { buttons: 0, sequence: 1 });
    fixture.advance(499);
    assert.deepEqual(fixture.sent, []);
  }
  fast.advance(1);
  assert.deepEqual(fast.sent.map(({ eventType, at }) => [eventType, at]), [["mousedown", 500], ["mouseup", 500]]);
  slow.advance(1000);
  assert.deepEqual(slow.sent, []);
  slow.advance(1);
  assert.deepEqual(slow.sent.map(({ eventType, at }) => [eventType, at]), [["mousedown", 1500], ["mouseup", 1500]]);
});

test("touch taps are delayed but mouse and touch drags bypass timers", () => {
  const tap = schedulerFixture();
  tap.push("touchstart");
  tap.push("touchend", { sequence: 1, buttons: 0 });
  assert.deepEqual(tap.sent, []);
  tap.advance(500);
  assert.deepEqual(tap.sent.map(({ eventType }) => eventType), ["touchstart", "touchend"]);
  for (const [start, move, end] of [["mousedown", "mousemove", "mouseup"], ["touchstart", "touchmove", "touchend"]]) {
    const fixture = schedulerFixture();
    fixture.push(start);
    fixture.push(move, { xRatio: 0.6, sequence: 1 });
    fixture.push(end, { xRatio: 0.6, sequence: 2, buttons: 0 });
    assert.deepEqual(fixture.sent.map(({ eventType, at }) => [eventType, at]), [[start, 0], [move, 0], [end, 0]]);
    assert.equal(fixture.timers.size, 0);
  }
});

test("random delays cannot reorder rapid clicks", () => {
  const fixture = schedulerFixture([0.999999, 0]);
  fixture.push("mousedown");
  fixture.push("mouseup", { sequence: 1 });
  fixture.advance(10);
  fixture.push("mousedown", { gestureId: "gesture-2" });
  fixture.push("mouseup", { gestureId: "gesture-2", sequence: 1 });
  fixture.advance(500);
  assert.deepEqual(fixture.sent, []);
  fixture.advance(990);
  assert.deepEqual(fixture.sent.map(({ gestureId }) => gestureId), ["gesture-1", "gesture-1", "gesture-2", "gesture-2"]);
});

test("pending clicks do not interrupt an active drag", () => {
  const fixture = schedulerFixture();
  fixture.push("mousedown");
  fixture.push("mouseup", { sequence: 1 });
  fixture.push("mousedown", { gestureId: "drag" });
  fixture.push("mousemove", { gestureId: "drag", xRatio: 0.6, sequence: 1 });
  fixture.advance(500);
  assert.deepEqual(fixture.sent.map(({ eventType }) => eventType), ["mousedown", "mousemove"]);
  fixture.push("mouseup", { gestureId: "drag", xRatio: 0.6, sequence: 2 });
  assert.deepEqual(fixture.sent.map(({ eventType }) => eventType), ["mousedown", "mousemove", "mouseup", "mousedown", "mouseup"]);
});

test("clearing sync cancels queued clicks and incomplete gestures", () => {
  const fixture = schedulerFixture();
  fixture.push("mousedown");
  fixture.push("mouseup", { sequence: 1 });
  fixture.push("touchstart", { gestureId: "touch" });
  fixture.scheduler.clear();
  fixture.push("touchend", { gestureId: "touch", sequence: 1 });
  fixture.advance(2000);
  assert.deepEqual(fixture.sent, []);
  assert.equal(fixture.timers.size, 0);
});

test("cancelled touches and orphan releases never become delayed clicks", () => {
  const fixture = schedulerFixture();
  fixture.push("mouseup");
  fixture.push("touchstart");
  fixture.push("touchcancel", { sequence: 1 });
  fixture.advance(2000);
  assert.deepEqual(fixture.sent, []);
});

test("small pointer jitter remains a delayed click", () => {
  const fixture = schedulerFixture();
  fixture.push("mousedown");
  fixture.push("mousemove", { xRatio: 0.502, sequence: 1 });
  fixture.push("mouseup", { xRatio: 0.502, sequence: 2 });
  assert.deepEqual(fixture.sent, []);
  fixture.advance(500);
  assert.deepEqual(fixture.sent.map(({ eventType }) => eventType), ["mousedown", "mouseup"]);
});

test("game input sync rejects unsupported or out-of-range input", () => {
  assert.equal(
    normalizeGameInputEvent({ eventType: "click", xRatio: 0.5, yRatio: 0.5, button: 0, buttons: 0 }),
    null,
  );
  assert.equal(
    normalizeGameInputEvent({ eventType: "mouseup", xRatio: 2, yRatio: 0.5, button: 0, buttons: 0 }),
    null,
  );
});

test("game input sync accepts single-touch sliding input", () => {
  assert.deepEqual(
    normalizeGameInputEvent({
      eventType: "touchmove",
      xRatio: 0.4,
      yRatio: 0.6,
      button: 0,
      buttons: 1,
      identifier: 7,
    }),
    {
      eventType: "touchmove",
      xRatio: 0.4,
      yRatio: 0.6,
      button: 0,
      buttons: 1,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      identifier: 7,
    },
  );
});

test("game input sync preserves lightweight gesture ordering metadata", () => {
  assert.deepEqual(
    normalizeGameInputEvent({
      eventType: "touchcancel",
      xRatio: 0.4,
      yRatio: 0.6,
      button: 0,
      buttons: 0,
      identifier: 7,
      gestureId: "role-1-touch-123-1",
      sequence: 3,
    }),
    {
      eventType: "touchcancel",
      xRatio: 0.4,
      yRatio: 0.6,
      button: 0,
      buttons: 0,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      identifier: 7,
      gestureId: "role-1-touch-123-1",
      sequence: 3,
    },
  );
});

test("game input sync control and dispatch messages use the bridge contract", () => {
  assert.deepEqual(createGameInputControl(true, 42), {
    source: "xyzw-helper",
    type: "game-input-sync-control",
    enabled: true,
    masterId: "42",
  });
  assert.equal(createGameInputDispatch({ eventType: "keydown" }), null);
  assert.equal(
    createGameInputDispatch({
      eventType: "mouseup",
      xRatio: 0.5,
      yRatio: 0.25,
      button: 0,
      buttons: 0,
    })?.type,
    "game-input-sync-event",
  );
});
