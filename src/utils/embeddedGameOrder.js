import { getTokenDisplayName } from "./roleTokenMetadata.js";

export const GAME_WINDOW_ORDER_KEY = "gameWindowOrder";

const identityText = (value) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

export function getGameWindowKey(token) {
  const serverId = identityText(token?.serverId);
  const server = serverId
    ? serverId.replace(/^0+(?=\d)/, "")
    : identityText(token?.server) || `unknown:${identityText(token?.id)}`;
  // JSON 元组避免昵称和区服包含分隔符时碰撞；缺失区服时也不能仅凭昵称合并。
  return JSON.stringify([getTokenDisplayName(token), server]);
}

export function reconcileGameWindowOrder(saved, tokens, previous = []) {
  const current = new Map(tokens.map((token) => [token.id, getGameWindowKey(token)]));
  const keys = new Set(current.values());
  const renamed = new Map();
  for (const token of previous) {
    const oldKey = getGameWindowKey(token);
    const newKey = current.get(token.id);
    // 同一账号补齐区服或修改名称时，保留位置；已删除的账号不会走此迁移。
    if (newKey && newKey !== oldKey && !keys.has(oldKey))
      renamed.set(oldKey, newKey);
  }
  const order = (Array.isArray(saved) ? saved : [])
    .map((key) => renamed.get(key) || key)
    .filter((key) => keys.has(key));
  return [...new Set([...order, ...keys])];
}

export function orderEmbeddedGameIds(ids, tokens, order) {
  const byId = new Map(tokens.map((token) => [token.id, token]));
  const ranks = new Map((Array.isArray(order) ? order : []).map((key, index) => [key, index]));
  return [...new Set(ids)].filter((id) => byId.has(id)).sort((a, b) =>
    (ranks.get(getGameWindowKey(byId.get(a))) ?? Number.MAX_SAFE_INTEGER)
    - (ranks.get(getGameWindowKey(byId.get(b))) ?? Number.MAX_SAFE_INTEGER));
}

export function saveEmbeddedGameOrder(saved, visibleIds, tokens) {
  const order = reconcileGameWindowOrder(saved, tokens);
  const byId = new Map(tokens.map((token) => [token.id, token]));
  const selected = [...new Set(visibleIds.filter((id) => byId.has(id)).map((id) => getGameWindowKey(byId.get(id))))];
  const selectedKeys = new Set(selected);
  let index = 0;
  // 只替换此次打开的窗口所在位置，保留未打开账号之间的顺序。
  return order.map((key) => selectedKeys.has(key) ? selected[index++] : key);
}

export function moveEmbeddedGameId(ids, fromId, toId) {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from < 0 || to < 0 || from === to)
    return [...ids];
  const result = [...ids];
  result.splice(to, 0, result.splice(from, 1)[0]);
  return result;
}
