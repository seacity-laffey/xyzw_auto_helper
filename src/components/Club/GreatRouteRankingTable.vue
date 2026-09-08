<template>
  <div class="ranking-content">
    <ClubRankingTable
      ref="rankingTable"
      score-before-heroes
      rank-key="rank"
      score-key="sRScore"
      score-label="积分"
      :format-power="formatPower"
      :format-score="formatScore"
      :has-data="hasData"
      :loading="loading"
      :rows="rows"
      @select-hero="emit('selectHero', $event)"
    ></ClubRankingTable>

    <div v-if="totalClubs > 0" class="pagination-container">
      <NPagination
        :page="page"
        :page-count="Math.ceil(totalClubs / pageSize)"
        :page-size="pageSize"
        :show-quick-jumper="showQuickJumper"
        @update:page="emit('update:page', $event)"
      ></NPagination>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { NPagination } from "naive-ui";
import { useMediaQuery } from "@vueuse/core";
import ClubRankingTable from "@/components/Club/ClubRankingTable.vue";

defineProps({
  formatPower: { type: Function, required: true },
  formatScore: { type: Function, required: true },
  hasData: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  rows: { type: Array, default: () => [] },
  totalClubs: { type: Number, default: 0 },
});

const emit = defineEmits(["selectHero", "update:page"]);
const rankingTable = ref(null);
const showQuickJumper = useMediaQuery("(min-width: 769px)");

const getExportElement = () => rankingTable.value?.getExportElement() || null;

defineExpose({ getExportElement });
</script>

<style scoped>
.ranking-content {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.pagination-container {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  padding: var(--spacing-md);
  border-top: 1px solid var(--border-light);
  background: var(--bg-secondary);
}
</style>
