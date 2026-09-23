import {
  ApexAction,
  isApexRateLimited,
  runApexAction,
} from "./apexRateLimit.js";
import {
  canGuessNow,
  getCurrentRounds,
  getCurrentSeason,
  getGuessTabs,
} from "./apexRules.js";

/** 返回所有开放期，避免报名与淘汰赛重叠时漏掉后一轮。 */
export function resolveOpenApexRounds(
  now,
  rules = { getCurrentSeason, getCurrentRounds, getGuessTabs },
) {
  const season = rules.getCurrentSeason(now);
  if (season <= 0)
    return [];
  return rules.getCurrentRounds(season, now).flatMap((round) => {
    const tabs = rules
      .getGuessTabs(round, season, now)
      .filter((tab) => canGuessNow(tab.state));
    return tabs.length ? [{ season, round, tabs }] : [];
  });
}

/** 空页或 last 才是结束；限流、取消、页数上限均保留后续重试能力。 */
export async function fetchApexPages(
  send,
  {
    cmd,
    params = {},
    listKey,
    startIdx = 0,
    maxPages = 20,
    cancelled = () => false,
  },
) {
  const rows = [];
  for (let page = 0; page < maxPages; page++) {
    if (cancelled())
      return { rows, complete: false };
    let response;
    try {
      response = await send(cmd, { ...params, idx: startIdx + rows.length });
    } catch (error) {
      if (isApexRateLimited(error))
        return { rows, complete: false };
      throw error;
    }
    if (cancelled())
      return { rows, complete: false };
    const list = response?.[listKey];
    if (!Array.isArray(list))
      throw new Error("逐鹿响应缺少列表数据，请重试");
    rows.push(...list);
    if (!list.length || response.last === true)
      return { rows, complete: true };
  }
  return { rows, complete: false };
}

export function createApexSender(store, tokenId, cancelled = () => false) {
  return (cmd, params = {}, action = ApexAction.READ) =>
    runApexAction(
      action,
      (queuedMs) => {
        if (cancelled())
          throw new Error("操作已取消");
        return store.sendMessageWithPromise(
          tokenId,
          cmd,
          params,
          10000 + queuedMs,
        );
      },
      { maxRetry: action === ApexAction.READ ? 1 : 3 },
    );
}
