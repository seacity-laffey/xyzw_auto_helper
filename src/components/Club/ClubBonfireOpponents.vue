<template>
  <section aria-label="敌方篝火阵容" class="bonfire-opponents">
    <h4>敌方篝火阵容</h4>
    <p v-if="!activeClub" class="muted">暂无当天匹配的敌对俱乐部</p>
    <template v-else>
      <div class="opponent-heading"><strong>{{ activeClub.name }}</strong><span>{{ displayDate }}</span></div>
      <section v-for="region in activeClub.regions" :key="region.id" class="battle-region" :aria-label="`第${region.id}区`">
        <h5>第 {{ region.id }} 区</h5>
        <div class="region-scroll">
          <div class="opponent-members">
            <article v-for="position in region.slots" :key="position.slot" class="opponent-member" :aria-label="position.member?.roleId ? `${position.member.name}的篝火阵容` : `${position.slot}号空位`" :class="{ defeated: position.member?.defeated, commander: position.title === '统帅' }">
              <span class="position-label">{{ position.slot }} · {{ position.title }}</span>
              <template v-if="position.member?.roleId">
                <strong class="member-name" :title="position.member.name">{{ position.member.mirror ? '[镜像] ' : '' }}{{ position.member.name }}</strong>
                <span class="member-state">{{ position.member.defeated ? '已击败' : '未击败' }}</span>
                <div class="lineup-area" :aria-busy="!results[position.member.roleId] || results[position.member.roleId].loading">
                  <div v-if="results[position.member.roleId]?.error" class="lineup-notice" role="alert">
                    <span>{{ results[position.member.roleId].error }}</span>
                    <Button size="sm" variant="outline" @click="retryTeam(position.member.roleId)"><RotateCw :size="14"></RotateCw>重试</Button>
                  </div>
                  <div v-else class="bonfire-lineup">
                    <div v-for="index in 5" :key="index" class="lineup-slot" :aria-label="`${index}号位`" :class="`hero-position-${index}`">
                      <template v-if="results[position.member.roleId]?.team?.[index - 1]?.heroId">
                        <img :alt="heroInfo(position.member.roleId, index).name" :src="heroInfo(position.member.roleId, index).avatar" @error="useFallbackImage">
                        <span :title="heroInfo(position.member.roleId, index).name">{{ heroInfo(position.member.roleId, index).name }}</span>
                      </template>
                      <span v-else class="hero-placeholder">{{ results[position.member.roleId]?.team ? '空位' : '待加载' }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <span v-else class="empty-position">空位</span>
            </article>
          </div>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RotateCw } from "@lucide/vue";
import { getClubBattleDayKey, getTodayClubBattleOpponent } from "@/utils/clubDailyBattle";
import { Button } from "@/components/ui/button";
import { useTokenStore } from "@/stores/tokenStore";
import { HERO_DICT } from "@/utils/heroList";

const props = defineProps({ response: Object, tokenId: String });
const store = useTokenStore();
const now = ref(new Date());
const clock = window.setInterval(() => {
  now.value = new Date();
}, 30000);
const dayKey = computed(() => getClubBattleDayKey(now.value));
const displayDate = computed(() => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit" }).format(now.value));
const activeClub = computed(() => getTodayClubBattleOpponent(props.response, now.value));
const results = ref({});
let requestVersion = 0;
const useFallbackImage = (event) => {
  if (!event.target.src.endsWith("/icons/xiaoyugan.png"))
    event.target.src = "/icons/xiaoyugan.png";
};
const heroInfo = (roleId, index) => {
  const heroId = results.value[roleId]?.team?.[index - 1]?.heroId;
  return HERO_DICT[heroId] || { name: `武将 ${heroId}`, avatar: "/icons/xiaoyugan.png" };
};
const fetchTeam = async (roleId, version, tokenId) => {
  if (version !== requestVersion)
    return;
  results.value[roleId] = { loading: true };
  try {
    if (store.getWebSocketStatus(tokenId) !== "connected")
      throw new Error("当前账号未连接");
    const response = await store.sendMessageWithPromise(tokenId, "club_gettargetteam", { targetId: Number(roleId) }, 10000);
    if (version !== requestVersion || tokenId !== props.tokenId)
      return;
    const data = (response?.body || response)?.roleBattleTeam;
    if (!data?.battleTeam || typeof data.battleTeam !== "object")
      throw new Error("未获取到篝火阵容");
    if (data.role?.roleId != null && String(data.role.roleId) !== String(roleId))
      throw new Error("返回成员不一致，请重试");
    results.value[roleId] = { team: data.battleTeam, loading: false };
  } catch (error) {
    if (version === requestVersion)
      results.value[roleId] = { loading: false, error: error instanceof Error ? error.message : "查询失败" };
  }
};
const retryTeam = (roleId) => {
  if (results.value[roleId]?.loading)
    return;
  fetchTeam(roleId, requestVersion, props.tokenId);
};
watch(() => [props.tokenId, props.response, dayKey.value], async () => {
  const version = ++requestVersion;
  const tokenId = props.tokenId;
  results.value = {};
  const roleIds = [...new Set((activeClub.value?.regions || []).flatMap((region) => region.slots.map((position) => position.member?.roleId).filter(Boolean)))];
  // Limit automatic queries and share responses between duplicate member positions.
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(2, roleIds.length) }, async () => {
    while (cursor < roleIds.length) {
      if (version !== requestVersion)
        break;
      const roleId = roleIds[cursor++];
      await fetchTeam(roleId, version, tokenId);
    }
  }));
}, { immediate: true });
onBeforeUnmount(() => {
  requestVersion++;
  window.clearInterval(clock);
});
</script>

<style scoped>
.bonfire-opponents { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); }
h4 { margin: 0 0 12px; font-size: 16px; }
.muted, .member-state { color: var(--muted-foreground); font-size: 12px; }
.opponent-heading { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; }
.opponent-heading span, .position-label { color: var(--muted-foreground); font-size: 12px; }
.battle-region { padding: 16px 0; border-top: 1px solid var(--border); }
.battle-region h5 { margin: 0 0 12px; font-size: 14px; }
.region-scroll { overflow-x: auto; }
.opponent-members { display: grid; grid-template-columns: repeat(5, minmax(210px, 1fr)); gap: 12px; min-width: 1098px; }
.opponent-member { display: grid; justify-items: center; align-content: start; gap: 6px; height: 270px; padding: 10px 8px; border: 1px solid var(--border); border-radius: 6px; min-width: 0; background: var(--background); }
.opponent-member.commander { border-top: 3px solid var(--primary); }
.opponent-member.defeated { background: var(--muted); }
.empty-position { padding-top: 90px; color: var(--muted-foreground); font-size: 12px; }
.member-name { width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; font-size: 13px; }
.lineup-area { width: 100%; height: 174px; }
.lineup-notice { display: flex; height: 100%; flex-direction: column; align-items: center; justify-content: center; gap: 8px; font-size: 12px; overflow-wrap: anywhere; }
.bonfire-lineup { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); grid-template-rows: repeat(2, 82px); gap: 6px 0; }
.lineup-slot { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-width: 0; grid-column: span 2; }
.hero-position-1 { grid-column: 2 / span 2; }
.hero-position-2 { grid-column: 4 / span 2; }
.hero-position-3 { grid-column: 1 / span 2; }
.hero-position-4 { grid-column: 3 / span 2; }
.hero-position-5 { grid-column: 5 / span 2; }
.lineup-slot img { width: 44px; height: 44px; object-fit: contain; }
.lineup-slot span { width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.hero-placeholder { color: var(--muted-foreground); }
</style>
