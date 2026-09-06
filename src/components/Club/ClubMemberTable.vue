<template>
  <div class="members" :class="{ exporting }">
    <div class="member-table-toolbar">
      <strong>俱乐部成员详情</strong>
      <div v-if="!exporting">
        <Button size="sm" variant="outline" :disabled="loading" @click="$emit('fetchLineups')">
          <RotateCw :class="{ spinning: loading }" :size="14"></RotateCw>
          获取阵容
        </Button>
        <Button size="sm" variant="outline" @click="$emit('export')">
          <ImageDown :size="14"></ImageDown>
          导出图片
        </Button>
      </div>
    </div>
    <div class="member-table-scroll" :class="{ exporting }">
      <table class="member-table">
        <thead>
          <tr>
            <th>序号</th><th>头像</th><th>成员</th><th>战力</th><th>红淬</th><th>阵容</th>
            <th v-if="!exporting">职位</th><th v-if="canKick && !exporting">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(member, index) in members" :key="member.roleId">
            <td>{{ index + 1 }}</td>
            <td>
              <img v-if="member.headImg" class="member-table-avatar" :alt="member.name" :src="member.headImg">
              <span v-else class="member-table-avatar placeholder">{{ member.name?.charAt(0) || "?" }}</span>
            </td>
            <td>
              <button class="member-link" type="button" @click="$emit('select', member.roleId)">
                <strong>{{ member.name }}</strong><span>ID: {{ member.roleId }}</span>
              </button>
            </td>
            <td>{{ formatClubNumber(member.power || member.custom?.s_power) }}</td>
            <td class="member-red">{{ member.custom?.red_quench_cnt || 0 }}红</td>
            <td>
              <Badge v-if="member.lineupType" :style="lineupStyle(member.lineupType)">{{ member.lineupType }}</Badge>
              <span v-else>-</span>
            </td>
            <td v-if="!exporting">{{ getClubJobLabel(member.job) }}</td>
            <td v-if="canKick && !exporting">
              <Button v-if="member.job !== 1" size="sm" variant="destructive" @click="$emit('kick', member)">踢出</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ImageDown, RotateCw } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatClubNumber, getClubJobLabel } from "@/utils/clubInfoData";
import { LINEUP_RULES } from "@/utils/heroList";

defineProps({
  canKick: { type: Boolean, default: false },
  exporting: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  members: { type: Array, default: () => [] },
});
defineEmits(["export", "fetchLineups", "kick", "select"]);

const lineupStyle = (lineupType) => {
  const colors = LINEUP_RULES.find((rule) => rule.name === lineupType)?.colorProps;
  return colors
    ? { backgroundColor: colors.color, borderColor: colors.color, color: colors.textColor }
    : {};
};
</script>

<style scoped>
.members { width: 100%; min-width: 0; max-width: 100%; }
.members.exporting { width: 650px; max-width: none; background: #fff; --bg-primary: #fff; --bg-secondary: #fafafa; --bg-tertiary: #f5f5f5; --border-color: #e5e5e5; --text-primary: #171717; --text-secondary: #525252; --text-tertiary: #a3a3a3; }
.member-table-toolbar { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: var(--spacing-sm); padding: var(--spacing-sm); border: 1px solid var(--border-color); border-bottom: 0; border-radius: var(--radius) var(--radius) 0 0; }
.member-table-toolbar > strong { color: var(--text-primary); font-size: var(--font-size-sm); }
.member-table-toolbar > div { display: flex; gap: var(--spacing-xs); }
.member-table-scroll { max-width: 100%; max-height: 552px; overflow: auto; border: 1px solid var(--border-color); border-radius: 0 0 var(--radius) var(--radius); }
.member-table-scroll.exporting { max-height: none; overflow: visible; }
.member-table { width: 100%; min-width: 650px; border-spacing: 0; border-collapse: separate; color: var(--text-primary); font-size: var(--font-size-xs); }
.member-table th, .member-table td { height: 44px; padding: 6px 10px; border-bottom: 1px solid var(--border-color); text-align: center; white-space: nowrap; }
.member-table th { position: sticky; z-index: 1; top: 0; background: var(--bg-secondary); color: var(--text-secondary); font-weight: var(--font-weight-medium); }
.member-table tr:last-child td { border-bottom: 0; }
.member-table tbody tr:nth-child(even) { background: var(--bg-secondary); }
.member-table th:nth-child(1), .member-table td:nth-child(1), .member-table th:nth-child(2), .member-table td:nth-child(2) { width: 56px; }
.member-table th:nth-child(3), .member-table td:nth-child(3) { width: 150px; text-align: left; }
.member-table-avatar { display: inline-grid; width: 30px; height: 30px; place-items: center; border: 1px solid var(--border-color); border-radius: 50%; background: var(--bg-tertiary); color: var(--text-secondary); object-fit: cover; }
.member-link { display: grid; gap: 2px; padding: 0; border: 0; background: transparent; color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.member-link:hover strong { text-decoration: underline; text-underline-offset: 3px; }
.member-link span { color: var(--text-tertiary); font-size: 11px; }
.member-red { color: var(--error-color); }
.spinning { animation: club-member-spin 800ms linear infinite; }
@keyframes club-member-spin { to { transform: rotate(360deg); } }
</style>
