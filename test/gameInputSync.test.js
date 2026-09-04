import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createGameInputControl,
  createGameInputDispatch,
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
