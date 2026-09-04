<template>
  <section
    class="execution-log"
    data-testid="batch-log-panel"
    :aria-hidden="!visible"
    :class="{ visible }"
  >
    <header class="log-header">
      <div class="log-title">
        <Terminal :size="17"></Terminal>
        <div>
          <h3>{{ currentTokenName ? `正在执行: ${currentTokenName}` : "执行日志" }}</h3>
          <span>{{ logs.length }}/{{ maxEntries }} 条</span>
        </div>
      </div>
      <div class="worker-state">
        <Badge variant="outline">{{ isRunning ? "RUNNING" : "READY" }}</Badge>
        <span>Worker #1</span>
      </div>
    </header>

    <div class="log-controls">
      <div class="filter-control">
        <button
          type="button"
          :aria-pressed="!errorsOnly"
          :class="{ active: !errorsOnly }"
          @click="errorsOnly = false"
        >
          全部日志
        </button>
        <button
          type="button"
          :aria-pressed="errorsOnly"
          :class="{ active: errorsOnly }"
          @click="errorsOnly = true"
        >
          错误{{ errorCount ? ` (${errorCount})` : "" }}
        </button>
      </div>
      <div class="control-row">
        <label>
          <Checkbox v-model="autoScroll"></Checkbox>
          <span>自动滚动</span>
        </label>
        <div>
          <Button aria-label="复制日志" size="icon" title="复制日志" variant="ghost" @click="emit('copy')">
            <Copy :size="15"></Copy>
          </Button>
          <Button aria-label="清空日志" size="icon" title="清空日志" variant="ghost" @click="emit('clear')">
            <Trash2 :size="15"></Trash2>
          </Button>
        </div>
      </div>
    </div>

    <div class="progress-section">
      <div
        aria-label="批量进度"
        aria-valuemax="100"
        aria-valuemin="0"
        class="progress-track"
        role="progressbar"
        :aria-valuenow="progress"
      >
        <span :style="{ width: `${progress}%` }"></span>
      </div>
      <div><strong>批量进度</strong><span>{{ progress }}% 完成</span></div>
    </div>

    <div ref="logContainer" class="log-list">
      <div v-if="!filteredLogs.length" class="empty-log">暂无执行日志</div>
      <div
        v-for="(log, index) in filteredLogs"
        :key="`${log.time}-${index}`"
        class="log-entry"
        :class="log.type"
      >
        <span>{{ log.time }}</span>
        <p>{{ log.message }}</p>
      </div>
    </div>

    <footer>
      <div>
        <span class="success"><i></i>OK: {{ completedCount }}</span>
        <span class="failed"><i></i>FAIL: {{ failedCount }}</span>
      </div>
      <span>{{ isRunning ? "BUSY" : "IDLE" }}</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Copy, Terminal, Trash2 } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface LogEntry {
  message: string;
  time: string;
  type?: "error" | "info" | "success" | "warning" | string;
}

const props = defineProps<{
  completedCount: number;
  currentTokenName?: string;
  failedCount: number;
  isRunning: boolean;
  logs: LogEntry[];
  maxEntries: number;
  progress: number;
  visible: boolean;
}>();

const emit = defineEmits<{
  clear: [];
  copy: [];
}>();

const autoScroll = ref(true);
const errorsOnly = ref(false);
const logContainer = ref<HTMLElement | null>(null);
const errorCount = computed(() => props.logs.filter((log) => log.type === "error").length);
const filteredLogs = computed(() =>
  errorsOnly.value ? props.logs.filter((log) => log.type === "error") : props.logs,
);

const scrollToEnd = async () => {
  if (!autoScroll.value)
    return;
  await nextTick();
  if (logContainer.value)
    logContainer.value.scrollTop = logContainer.value.scrollHeight;
};

watch(() => props.logs.length, scrollToEnd, { flush: "post" });
watch(autoScroll, (enabled) => {
  if (enabled)
    scrollToEnd();
});
</script>

<style scoped>
.execution-log {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  opacity: 0;
  pointer-events: none;
  transform: translateX(16px);
  transition: opacity 200ms ease, transform 200ms ease;
}

.execution-log.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.log-header,
.log-title,
.worker-state,
.control-row,
.control-row label,
.progress-section > div:last-child,
footer,
footer > div,
footer span {
  display: flex;
  align-items: center;
}

.log-header {
  min-height: 66px;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.log-title {
  min-width: 0;
  gap: 10px;
}

.log-title > svg {
  flex: 0 0 auto;
}

.log-title h3 {
  margin: 0;
  overflow: hidden;
  color: var(--foreground);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-title span,
.worker-state > span,
.progress-section span,
footer {
  color: var(--muted-foreground);
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
}

.worker-state {
  flex: 0 0 auto;
  gap: 7px;
}

.log-controls {
  display: grid;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.filter-control {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.filter-control button {
  height: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--muted-foreground);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.filter-control button.active {
  border-color: var(--primary);
  background: var(--primary);
  color: var(--primary-foreground);
}

.control-row {
  justify-content: space-between;
}

.control-row label {
  gap: 7px;
  color: var(--foreground);
  font-size: 12px;
}

.control-row > div {
  display: flex;
}

.control-row button {
  width: 30px;
  height: 30px;
}

.progress-section {
  display: grid;
  gap: 7px;
  padding: 12px 16px 8px;
}

.progress-track {
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--muted);
}

.progress-track span {
  display: block;
  height: 100%;
  background: var(--primary);
  transition: width 300ms ease;
}

.progress-section > div:last-child {
  justify-content: space-between;
}

.progress-section strong {
  color: var(--foreground);
  font-size: 10px;
}

.log-list {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  background: var(--muted);
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  line-height: 1.6;
}

.empty-log {
  padding: 36px 0;
  color: var(--muted-foreground);
  text-align: center;
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 2px 4px;
  color: var(--muted-foreground);
}

.log-entry > span {
  flex: 0 0 auto;
  opacity: 0.65;
}

.log-entry p {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.log-entry.error {
  color: var(--destructive);
}

.log-entry.success {
  color: var(--success);
}

.log-entry.warning {
  color: var(--warning);
}

footer {
  min-height: 40px;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--border);
  text-transform: uppercase;
}

footer > div {
  gap: 14px;
}

footer span {
  gap: 5px;
}

footer i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

footer .success {
  color: var(--success);
}

footer .failed {
  color: var(--destructive);
}

@media (max-width: 1024px) {
  .execution-log {
    height: 520px;
  }

  .execution-log:not(.visible) {
    display: none;
  }
}

@media (max-width: 640px) {
  .execution-log {
    height: 460px;
  }
}
</style>
