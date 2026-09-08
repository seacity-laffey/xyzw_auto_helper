import { BOSS_NAMES } from "../views/bossNames.js";

export const sanitizePushingError = (error) => String(error?.message || error || "")
  .replace(/请求超时: \w+(?:\s*\(\d+ms\))?/g, "请求超时")
  .replace(/\b\w[\dA-Za-z]*_\w+\b(?:\s*\(\d+ms\))?/g, "")
  .trim();

export const pickNumber = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "")
      continue;
    const number = Number(value);
    if (Number.isFinite(number))
      return number;
  }
  return null;
};

export const responseBody = (response) => {
  if (response?.body && typeof response.body === "object")
    return response.body;
  return response || {};
};

export const readTorchFromResponse = (response) => {
  const body = responseBody(response);
  const role = body.role || body.body?.role || {};
  return {
    torchType: pickNumber(role.autoClickType, body.autoClickType) || 0,
    torchRemaining: pickNumber(role.autoClickTime, body.autoClickTime) || 0,
    torchSettleTime:
      pickNumber(role.autoClickSettleTime, body.autoClickSettleTime) || 0,
  };
};

export const computeTorchRemaining = (state, now = Date.now()) => {
  if (!state)
    return 0;
  if (state.torchSettleTime > 0) {
    const settleMs = state.torchSettleTime < 1e12
      ? state.torchSettleTime * 1000
      : state.torchSettleTime;
    if (settleMs > now)
      return Math.max(0, Math.floor((settleMs - now) / 1000));
  }
  if (state.torchBaseTimestamp && state.torchBaseRemaining) {
    const elapsed = Math.floor((now - state.torchBaseTimestamp) / 1000);
    return Math.max(0, state.torchBaseRemaining - elapsed);
  }
  return Number(state.torchRemaining || 0);
};

export const formatTorchTime = (seconds) => {
  if (!seconds || seconds <= 0)
    return "0分钟";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
};

export const getBossName = (level) => {
  if (!level || level <= 0)
    return "";
  return BOSS_NAMES[level] || "";
};

export const applyPushingLevel = (state, level, serverBossName = "") => {
  if (!state)
    return;
  const nextLevel = Number(level) || 0;
  if (nextLevel > 0)
    state.level = nextLevel;

  if (serverBossName) {
    state.bossName = serverBossName;
    state.bossLevel = state.level;
    return;
  }
  if (state.bossLevel !== state.level || !state.bossName) {
    state.bossName = getBossName(state.level);
    state.bossLevel = state.level;
  }
};

export const sleep = (milliseconds) => new Promise((resolve) =>
  setTimeout(resolve, milliseconds),
);
