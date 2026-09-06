<template>
  <div v-if="cards.length" class="running-section" data-testid="pushing-level-progress">
    <section
      v-for="card in cards"
      :key="card.tokenId"
      class="running-card"
      :class="{ active: card.running }"
    >
      <div class="running-head">
        <div class="card-title">
          <strong :title="card.tokenName">{{ card.tokenName }}</strong>
          <span
            class="status-dot"
            :class="statusClass(card.connectionStatus)"
            :title="statusTitle(card.connectionStatus)"
          ></span>
        </div>
        <div class="result-badges">
          <Badge class="text-success" variant="outline">{{ card.wins }}胜</Badge>
          <Badge class="text-destructive" variant="outline">{{ card.losses }}负</Badge>
        </div>
      </div>
      <div class="level-line">
        当前关卡：{{ card.level > 0 ? `${card.level}关` : "--" }}
      </div>
      <div class="level-line">boss：{{ card.bossName || "--" }}</div>
      <div class="level-line torch-line">{{ card.torchLabel }}</div>
      <div class="running-body">
        <template v-if="card.running">
          <div class="countdown-row">
            <span class="countdown-text">战斗剩余 {{ formatDuration(card.countdown) }}</span>
            <div
              aria-label="战斗倒计时"
              aria-valuemax="100"
              aria-valuemin="0"
              class="inline-progress"
              role="progressbar"
              :aria-valuenow="progressPercent(card)"
            >
              <span :style="{ width: `${progressPercent(card)}%` }"></span>
            </div>
          </div>
          <div class="card-actions">
            <span>已战斗 {{ card.battles }} 场</span>
            <Button size="sm" variant="destructive" @click="$emit('stop', card.tokenId)">停止</Button>
          </div>
        </template>
        <template v-else>
          <div class="waiting-line">等待推图</div>
          <div class="card-actions">
            <span class="err-text" :title="card.lastError || '无'">
              最近错误：{{ card.lastError || "无" }}
            </span>
            <Button size="sm" @click="$emit('start', card.tokenId)">启动</Button>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

defineProps({
  cards: { type: Array, default: () => [] },
});
defineEmits(["start", "stop"]);

const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return minutes > 0 ? `${minutes}m${rest}s` : `${rest}s`;
};
const progressPercent = (card) => {
  if (!card.totalTime)
    return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((1 - card.countdown / card.totalTime) * 100)),
  );
};
const statusClass = (status) => ({
  connected: "status-green",
  connecting: "status-blue",
  error: "status-red",
})[status] || "status-gray";
const statusTitle = (status) => ({
  connected: "已连接",
  connecting: "连接中",
  disconnected: "未连接",
  disconnecting: "断开中",
  error: "连接异常",
})[status] || "未连接";
</script>

<style scoped>
.running-section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.running-card {
  min-height: 160px;
  padding: 12px 16px;
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: none;
}

.running-card.active {
  border-color: var(--success);
}

.running-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.result-badges {
  display: flex;
  align-items: center;
  gap: 7px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.card-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border: 1px solid rgb(0 0 0 / 5%);
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.status-gray {
  background: var(--input);
}

.status-green {
  background: var(--success);
}

.status-red {
  background: var(--error);
}

.status-blue {
  background: var(--info);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--info) 20%, transparent);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--info) 20%, transparent);
  }
  50% {
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--info) 5%, transparent);
  }
}

.level-line,
.waiting-line,
.countdown-text,
.card-actions {
  color: var(--muted-foreground);
  font-size: 12px;
  line-height: 1.6;
}

.level-line {
  color: var(--foreground);
}

.torch-line {
  color: var(--warning);
  font-weight: 500;
}

.running-body {
  margin-top: 8px;
}

.countdown-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.countdown-text {
  color: var(--foreground);
  font-weight: 600;
  white-space: nowrap;
}

.inline-progress {
  flex: 1;
  min-width: 0;
  height: 6px;
  overflow: hidden;
  background: var(--muted);
  border-radius: 2px;
}

.inline-progress span {
  display: block;
  height: 100%;
  background: var(--success);
  transition: width 200ms ease;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
}

.err-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}
</style>
