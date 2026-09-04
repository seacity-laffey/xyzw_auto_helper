export const GAME_INPUT_SYNC_MESSAGE_SOURCE = "xyzw-embedded-game";
export const GAME_INPUT_SYNC_CONTROL_SOURCE = "xyzw-helper";
export const GAME_INPUT_SYNC_EVENT_TYPE = "game-input-sync-event";
export const GAME_INPUT_SYNC_CONTROL_TYPE = "game-input-sync-control";

const supportedInputEvents = new Set([
  "mousedown",
  "mousemove",
  "mouseup",
  "touchcancel",
  "touchend",
  "touchmove",
  "touchstart",
]);

export function normalizeGameInputEvent(value) {
  if (!value || !supportedInputEvents.has(value.eventType))
    return null;

  const xRatio = Number(value.xRatio);
  const yRatio = Number(value.yRatio);
  const button = Number(value.button);
  const buttons = Number(value.buttons);
  if (
    !Number.isFinite(xRatio)
    || !Number.isFinite(yRatio)
    || xRatio < 0
    || xRatio > 1
    || yRatio < 0
    || yRatio > 1
    || !Number.isInteger(button)
    || !Number.isInteger(buttons)
  ) {
    return null;
  }

  const normalized = {
    eventType: value.eventType,
    xRatio,
    yRatio,
    button,
    buttons,
    altKey: Boolean(value.altKey),
    ctrlKey: Boolean(value.ctrlKey),
    metaKey: Boolean(value.metaKey),
    shiftKey: Boolean(value.shiftKey),
    identifier: Number.isInteger(value.identifier) ? value.identifier : 0,
  };

  if (
    typeof value.gestureId === "string"
    && value.gestureId.length > 0
    && value.gestureId.length <= 160
    && Number.isInteger(value.sequence)
    && value.sequence >= 0
  ) {
    normalized.gestureId = value.gestureId;
    normalized.sequence = value.sequence;
  }

  return normalized;
}

export function createGameInputControl(enabled, masterId) {
  return {
    source: GAME_INPUT_SYNC_CONTROL_SOURCE,
    type: GAME_INPUT_SYNC_CONTROL_TYPE,
    enabled: Boolean(enabled),
    masterId: masterId ? String(masterId) : null,
  };
}

export function createGameInputDispatch(input) {
  const normalized = normalizeGameInputEvent(input);
  if (!normalized)
    return null;
  return {
    source: GAME_INPUT_SYNC_CONTROL_SOURCE,
    type: GAME_INPUT_SYNC_EVENT_TYPE,
    input: normalized,
  };
}
