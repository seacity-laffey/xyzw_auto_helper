import { computed, onUnmounted, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { createApexSender, fetchApexPages } from "@/utils/apexRequests.js";
import { ApexAction } from "@/utils/apexRateLimit.js";
import {
  calibrateServerTime,
  canGuessRow,
  checkSupportInTime,
  getAdvanceNum,
  getAvailableRounds,
  getCurrentSeason,
  getDateZeroTime,
  getGuessTabs,
  getInitialRound,
  getRoundSchedules,
  getSeasonConf,
  getSupportGroupId,
} from "@/utils/apexRules.js";

export function useApexChallenge() {
  const store = useTokenStore();
  const message = useMessage();
  const info = ref({});
  const round = ref(null);
  const stageId = ref(null);
  const pairs = ref([]);
  const votes = ref([]);
  const records = ref([]);
  const page = ref(0);
  const complete = ref(false);
  const votesComplete = ref(false);
  const loading = ref(false);
  const pending = ref(false);
  const error = ref("");
  const clock = ref(Date.now());
  let version = 0;
  let disposed = false;
  const timer = setInterval(() => {
    clock.value = Date.now();
  }, 1000);
  const tokenId = computed(() => store.selectedToken?.id);
  const now = computed(() =>
    calibrateServerTime(clock.value, info.value.resetTime?.day),
  );
  const season = computed(() => getCurrentSeason(now.value));
  const rounds = computed(() => getAvailableRounds(season.value, now.value));
  const stages = computed(() =>
    getGuessTabs(round.value, season.value, now.value),
  );
  const stage = computed(() =>
    stages.value.find((item) => item.scheduleId === stageId.value),
  );
  const schedules = computed(() =>
    getRoundSchedules(round.value, season.value),
  );
  const guessed = computed(() => info.value.guessMap?.[stageId.value] || []);
  const limit = computed(() =>
    stage.value
      ? getAdvanceNum(round.value, season.value, stage.value.stage)
      : 0,
  );
  const supportOpen = computed(() =>
    checkSupportInTime(round.value, season.value, now.value),
  );
  const supportCount = computed(() => {
    const conf = getSeasonConf(Number(info.value.resetTime?.season));
    if (
      !conf
      || now.value < getDateZeroTime(conf.startDate)
      || now.value > getDateZeroTime(conf.endDate)
    ) {
      return 0;
    }
    return Number(info.value.voteItemCnt) || 0;
  });
  const context = () => {
    const id = tokenId.value;
    const stamp = version;
    const cancelled = () =>
      disposed || stamp !== version || id !== tokenId.value;
    return { id, cancelled, send: createApexSender(store, id, cancelled) };
  };
  const canBet = (pair, team) =>
    !pending.value
    && stage.value
    && !guessed.value.includes(team.teamId)
    && guessed.value.length < limit.value
    && canGuessRow(stage.value.state, stage.value.stage, {
      team1Win: pair[0]?.isWin,
      team2Win: pair[1]?.isWin,
    });

  const loadPage = async (target = page.value) => {
    if (!stage.value || loading.value)
      return;
    const ctx = context();
    loading.value = true;
    error.value = "";
    try {
      if (pairs.value.length < (target + 1) * 10 && !complete.value) {
        const result = await fetchApexPages(ctx.send, {
          cmd: "apex_getguesslist",
          params: { scheduleId: stageId.value },
          listKey: "apexGuessList",
          startIdx: pairs.value.length,
          maxPages: 2,
          cancelled: ctx.cancelled,
        });
        if (ctx.cancelled())
          return;
        pairs.value.push(...result.rows);
        complete.value = result.complete;
        if (!result.complete && !result.rows.length)
          error.value = "本次未能加载更多对阵，请稍后重试";
      }
      if (!ctx.cancelled()) {
        page.value = Math.min(
          target,
          Math.max(0, Math.ceil(pairs.value.length / 10) - 1),
        );
      }
    } catch (e) {
      if (!ctx.cancelled())
        error.value = e.message;
    } finally {
      if (!ctx.cancelled())
        loading.value = false;
    }
  };
  const loadVotes = async () => {
    const ctx = context();
    if (!ctx.id || !round.value || loading.value)
      return;
    loading.value = true;
    error.value = "";
    try {
      const sid = stages.value[0]?.scheduleId;
      const result = await fetchApexPages(ctx.send, {
        cmd: "apex_getvotelist",
        params: {
          groupId: getSupportGroupId(info.value.group, sid),
          round: round.value,
        },
        listKey: "apexVoteList",
        cancelled: ctx.cancelled,
      });
      if (ctx.cancelled())
        return;
      votesComplete.value = result.complete;
      // 限流或分页上限导致的不完整结果不得覆盖完整榜单。
      if (result.complete)
        votes.value = result.rows;
      else error.value = "助威榜未完整加载，已保留上一次结果，请重试";
    } catch (e) {
      if (!ctx.cancelled())
        error.value = e.message;
    } finally {
      if (!ctx.cancelled())
        loading.value = false;
    }
  };
  const loadRecords = async () => {
    const ctx = context();
    if (!ctx.id || !stageId.value || loading.value)
      return;
    loading.value = true;
    error.value = "";
    try {
      const result = await ctx.send("apex_get64oppomap", {
        scheduleId: stageId.value,
        groupId: Number(info.value.group?.[stageId.value] ?? 1),
      });
      if (!ctx.cancelled())
        records.value = result.apexRecords || [];
    } catch (e) {
      if (!ctx.cancelled())
        error.value = e.message;
    } finally {
      if (!ctx.cancelled())
        loading.value = false;
    }
  };
  const refresh = async () => {
    if (!tokenId.value || loading.value)
      return;
    const ctx = context();
    loading.value = true;
    error.value = "";
    try {
      const result = await ctx.send("apex_getroleinfo");
      if (ctx.cancelled())
        return;
      info.value = result.apexRoleInfo || {};
      clock.value = Date.now();
      if (!rounds.value.includes(round.value))
        round.value = getInitialRound(rounds.value, season.value, now.value);
    } catch (e) {
      if (!ctx.cancelled())
        error.value = e.message;
    } finally {
      if (!ctx.cancelled())
        loading.value = false;
    }
  };
  const guess = async (pair, team) => {
    if (!canBet(pair, team))
      return;
    const ctx = context();
    const sid = stageId.value;
    pending.value = true;
    try {
      await ctx.send("apex_guess", { teamId: team.teamId }, ApexAction.GUESS);
      if (ctx.cancelled())
        return;
      info.value.guessMap ||= {};
      info.value.guessMap[sid] = [
        ...(info.value.guessMap[sid] || []),
        team.teamId,
      ];
      message.success(`已竞猜 ${team.name}`);
    } catch (e) {
      if (!ctx.cancelled())
        message.error(e.message);
    } finally {
      if (!ctx.cancelled())
        pending.value = false;
    }
  };
  const vote = async (team, count) => {
    count = Math.trunc(Number(count));
    if (
      pending.value
      || !supportOpen.value
      || team.isOut
      || count < 1
      || count > supportCount.value
    ) {
      return false;
    }
    const ctx = context();
    pending.value = true;
    try {
      await ctx.send(
        "apex_vote",
        { teamId: team.teamId, round: round.value, voteCnt: count },
        ApexAction.VOTE,
      );
      if (ctx.cancelled())
        return false;
      info.value.voteItemCnt = Math.max(0, supportCount.value - count);
      message.success(`已为 ${team.name} 助威 ${count} 次`);
      return true;
    } catch (e) {
      if (!ctx.cancelled())
        message.error(e.message);
      return false;
    } finally {
      if (!ctx.cancelled())
        pending.value = false;
    }
  };
  const resetRequests = () => {
    version++;
    loading.value = false;
    pending.value = false;
    error.value = "";
  };
  watch(
    round,
    () => {
      resetRequests();
      votes.value = [];
      votesComplete.value = false;
      stageId.value
        = getGuessTabs(round.value, season.value, now.value).find((tab) =>
          [1, 2].includes(tab.state),
        )?.scheduleId || stages.value[0]?.scheduleId;
    },
    { flush: "sync" },
  );
  watch(
    stageId,
    () => {
      resetRequests();
      pairs.value = [];
      page.value = 0;
      complete.value = false;
      records.value = [];
    },
    { flush: "sync" },
  );
  watch(
    tokenId,
    () => {
      resetRequests();
      info.value = {};
      round.value = null;
      stageId.value = null;
      void refresh();
    },
    { immediate: true, flush: "sync" },
  );
  onUnmounted(() => {
    disposed = true;
    version++;
    clearInterval(timer);
  });
  return {
    now,
    info,
    round,
    rounds,
    stageId,
    stage,
    stages,
    schedules,
    season,
    pairs,
    votes,
    records,
    page,
    complete,
    votesComplete,
    loading,
    pending,
    error,
    guessed,
    supportOpen,
    supportCount,
    limit,
    canBet,
    refresh,
    loadPage,
    loadVotes,
    loadRecords,
    guess,
    vote,
  };
}
