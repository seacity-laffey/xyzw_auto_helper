import { computed, onUnmounted, ref, watch } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { getClubBattleRecordTargets } from "@/utils/clubDailyBattle.js";
import {
  buildCampMembers,
  getCampMatchDate,
  getCampRecordRows,
} from "@/utils/campChallengeData.js";

export function useCampChallenge() {
  const store = useTokenStore();
  const data = ref({});
  const weekday = new Date(Date.now() + 8 * 3600000).getUTCDay();
  const day = ref([2, 3, 4].includes(weekday) ? weekday : 2);
  const side = ref("own");
  const ranks = ref([]);
  const personalRecords = ref([]);
  const records = ref([]);
  const failed = ref(0);
  const progress = ref(0);
  const total = ref(0);
  const loading = ref(false);
  const error = ref("");
  const detail = ref(null);
  const detailRecords = ref([]);
  const detailLoading = ref(false);
  let version = 0;
  let detailVersion = 0;
  const tokenId = computed(() => store.selectedToken?.id);
  const phase = computed(() => data.value.club?.phase);
  const matchDate = computed(() => getCampMatchDate(phase.value, day.value));
  const days = computed(() =>
    Object.keys(data.value.club?.oppoMap || {})
      .map(Number)
      .sort(),
  );
  const opponent = computed(() => data.value.club?.oppoMap?.[day.value]);
  const members = computed(() =>
    buildCampMembers(
      side.value === "own"
        ? data.value.club?.members
        : opponent.value?.defenders,
      records.value,
      matchDate.value,
      !loading.value && !failed.value,
    ),
  );
  const attackRows = computed(() =>
    getCampRecordRows(personalRecords.value, phase.value, day.value),
  );
  const filteredDetails = computed(() =>
    getCampRecordRows(detailRecords.value, phase.value, day.value),
  );
  const refresh = async () => {
    const id = tokenId.value;
    if (!id)
      return;
    const stamp = ++version;
    const stale = () => version !== stamp || tokenId.value !== id;
    loading.value = true;
    error.value = "";
    failed.value = 0;
    progress.value = 0;
    records.value = [];
    try {
      const response = await store.sendMessageWithPromise(
        id,
        "club_getinfo",
        {},
        10000,
      );
      if (stale())
        return;
      data.value = response;
      const daysAvailable = Object.keys(response.club?.oppoMap || {}).map(
        Number,
      );
      if (!daysAvailable.includes(day.value))
        day.value = daysAvailable[0] || 2;
      const results = await Promise.allSettled([
        store.sendMessageWithPromise(id, "club_getattackrecord", {}, 10000),
        store.sendMessageWithPromise(id, "club_getgrouprank", {}, 10000),
      ]);
      if (stale())
        return;
      personalRecords.value
        = results[0].status === "fulfilled" ? results[0].value.records || [] : [];
      ranks.value
        = results[1].status === "fulfilled"
          ? results[1].value.rankList || []
          : [];
      if (results.some((result) => result.status === "rejected"))
        error.value = "部分个人战报或排行榜查询失败，可刷新重试";
      const targets = getClubBattleRecordTargets(
        side.value === "own"
          ? response.club?.oppoMap?.[day.value]?.defenders
          : response.club?.members,
        { includeIdle: true },
      );
      total.value = targets.length;
      let cursor = 0;
      await Promise.all(
        Array.from({ length: Math.min(2, targets.length) }, async () => {
          while (cursor < targets.length && !stale()) {
            const target = targets[cursor++];
            try {
              const res = await store.sendMessageWithPromise(
                id,
                "club_getdefenserecord",
                { ...target, targetId: Number(target.targetId) },
                10000,
              );
              if (!Array.isArray(res.records))
                throw new Error("缺少战报数据");
              if (!stale())
                records.value.push({ ...target, records: res.records });
            } catch {
              if (!stale())
                failed.value++;
            } finally {
              if (!stale())
                progress.value++;
            }
          }
        }),
      );
    } catch (e) {
      if (!stale())
        error.value = e.message;
    } finally {
      if (!stale())
        loading.value = false;
    }
  };
  const showDetail = async (member) => {
    const stamp = ++detailVersion;
    const id = tokenId.value;
    detail.value = member;
    detailRecords.value = [];
    detailLoading.value = true;
    try {
      const res = await store.sendMessageWithPromise(
        id,
        "club_getdefenserecord",
        {
          targetId: Number(member.roleId),
          targetIsMirror: Boolean(member.mirror),
        },
        10000,
      );
      if (stamp === detailVersion && id === tokenId.value)
        detailRecords.value = res.records || [];
    } catch (e) {
      if (stamp === detailVersion)
        error.value = e.message;
    } finally {
      if (stamp === detailVersion)
        detailLoading.value = false;
    }
  };
  watch(
    [tokenId, side, day],
    () => {
      detailVersion++;
      detail.value = null;
      void refresh();
    },
    { immediate: true },
  );
  watch(tokenId, () => {
    data.value = {};
    ranks.value = [];
    personalRecords.value = [];
  }, { flush: "sync" });
  onUnmounted(() => {
    version++;
    detailVersion++;
  });
  return {
    tokenId,
    matchDate,
    data,
    day,
    side,
    days,
    phase,
    opponent,
    members,
    ranks,
    attackRows,
    loading,
    error,
    failed,
    progress,
    total,
    detail,
    filteredDetails,
    detailLoading,
    refresh,
    showDetail,
  };
}
