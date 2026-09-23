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

// 每个接收窗口单独调度；点击整体延迟，移动手势在首次位移时立即开始。
export function createGameInputScheduler(send, {
  random = Math.random,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  let gesture = null;
  const clicks = [];

  const dispatch = (input) => send(createGameInputDispatch(input));
  const drain = () => {
    // 避免延迟点击插入正在执行的拖拽；连续点击仍按原始顺序执行。
    while (!gesture?.dragging && clicks[0]?.ready) {
      const click = clicks.shift();
      click.inputs.forEach(dispatch);
    }
  };

  return {
    push(value) {
      const input = normalizeGameInputEvent(value);
      if (!input)
        return;
      const type = input.eventType;
      if (type === "mousedown" || type === "touchstart") {
        gesture = { start: input, dragging: false };
        return;
      }
      if (!gesture || input.gestureId !== gesture.start.gestureId
        || type.startsWith("touch") !== gesture.start.eventType.startsWith("touch")) {
        return;
      }
      // 容忍点击时的小幅抖动，避免轻微移动绕过点击延迟。
      const moved = Math.abs(input.xRatio - gesture.start.xRatio) > 0.005
        || Math.abs(input.yRatio - gesture.start.yRatio) > 0.005;
      if (moved && !gesture.dragging) {
        gesture.dragging = true;
        dispatch(gesture.start);
      }
      if (type === "mousemove" || type === "touchmove") {
        if (gesture.dragging)
          dispatch(input);
        return;
      }
      if (gesture.dragging) {
        dispatch(input);
      } else if (type !== "touchcancel") {
        const click = { inputs: [gesture.start, input], ready: false, timer: null };
        clicks.push(click);
        click.timer = setTimer(() => {
          click.ready = true;
          drain();
        }, 500 + Math.floor(random() * 1001));
      }
      gesture = null;
      drain();
    },
    clear() {
      for (const click of clicks)
        clearTimer(click.timer);
      clicks.length = 0;
      gesture = null;
    },
  };
}
