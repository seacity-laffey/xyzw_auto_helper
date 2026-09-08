<template>
  <PeachLegacyOverview
    :battle-info="battleInfo"
    :columns="columns"
    :disabled-date="disabledDate"
    :loading="loading"
    :members="opponentMembers"
    :query-date="queryDate"
    @export="handleExportImage"
    @refresh="fetchBattleRecordsByDate"
    @select-date="fetchBattleRecordsByDate"
  ></PeachLegacyOverview>

  <ClubPlayerDuelDialog
    :die-stats="dieStats"
    :fight-count="fightCount"
    :fight-count-valid="isFightCountValid"
    :fight-progress="fightProgress"
    :fight-result="fightResult"
    :open="showPlayerInfoModal"
    :player="playerInfo"
    @close-result="fightResult.visible = false"
    @duel="handleDuel"
    @reset-result="resetFightResult"
    @select-hero="selectHeroInfo"
    @update:fight-count="updateFightCount"
    @update:open="showPlayerInfoModal = $event"
  ></ClubPlayerDuelDialog>

  <ClubHeroDetailDialog
    :hero="heroModealTemp"
    :open="showHeroModal"
    @update:open="showHeroModal = $event"
  ></ClubHeroDetailDialog>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { useLegacyPeachBattle } from "@/composables/useLegacyPeachBattle";
import { usePeachDuel } from "@/composables/usePeachDuel";
import { createPeachLegacyColumns } from "@/utils/peachLegacyColumns";
import ClubHeroDetailDialog from "./ClubHeroDetailDialog.vue";
import ClubPlayerDuelDialog from "./ClubPlayerDuelDialog.vue";
import PeachLegacyOverview from "./PeachLegacyOverview.vue";

const message = useMessage();
const tokenStore = useTokenStore();
const selectedTokenId = computed(() => tokenStore.selectedToken?.id || "");
const club = computed(() => tokenStore.gameData?.legionInfo?.info || null);

const {
  battleInfo,
  disabledDate,
  fetchBattleInfo,
  fetchBattleRecordsByDate,
  formatPower,
  handleExportImage,
  loading,
  opponentMembers,
  queryDate,
} = useLegacyPeachBattle({ club, message, tokenStore });

const {
  dieStats,
  fetchTargetInfo,
  fightCount,
  fightProgress,
  fightResult,
  handleDuel,
  heroModealTemp,
  isFightCountValid,
  playerInfo,
  resetFightResult,
  selectHeroInfo,
  showHeroModal,
  showPlayerInfoModal,
  updateFightCount,
} = usePeachDuel({
  tokenStore,
  message,
  selectedTokenId,
  opponentMembers,
  formatPower,
});

const columns = createPeachLegacyColumns({
  formatPower,
  onPlayerSelect: fetchTargetInfo,
});

onMounted(fetchBattleInfo);
</script>
