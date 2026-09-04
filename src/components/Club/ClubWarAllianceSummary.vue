<template>
  <section class="announcement-section">
    <strong>{{ announcement }}</strong>
    <span>{{ fetchTime }}</span>
  </section>

  <nav aria-label="联盟筛选" class="alliance-tabs-section">
    <button
      v-for="alliance in alliances"
      :key="alliance.value"
      class="alliance-tab"
      type="button"
      :aria-pressed="activeAlliance === alliance.value"
      :class="[`alliance-${alliance.tone}`, { active: activeAlliance === alliance.value }]"
      @click="emit('select', alliance.value)"
    >
      <span>{{ alliance.label }}</span>
      <b>{{ alliance.value === "all" ? total : counts[alliance.value] || 0 }}</b>
    </button>
  </nav>
</template>

<script setup>
defineProps({
  activeAlliance: { type: String, default: "all" },
  announcement: { type: String, default: "" },
  counts: { type: Object, default: () => ({}) },
  fetchTime: { type: String, default: "" },
  total: { type: Number, default: 0 },
});

const emit = defineEmits(["select"]);

const alliances = [
  { label: "大联盟", tone: "green", value: "大联盟" },
  { label: "梦盟", tone: "amber", value: "梦盟" },
  { label: "正义联盟", tone: "red", value: "正义联盟" },
  { label: "龙盟", tone: "violet", value: "龙盟" },
  { label: "曦盟", tone: "cyan", value: "曦盟" },
  { label: "未知联盟", tone: "gray", value: "未知联盟" },
  { label: "全部", tone: "black", value: "all" },
];
</script>

<style scoped>
.announcement-section {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 14px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--background);
  text-align: center;
}

.announcement-section strong {
  font-size: 14px;
  font-weight: 650;
}

.announcement-section span {
  color: var(--muted-foreground);
  font-size: 11px;
}

.alliance-tabs-section {
  display: grid;
  grid-template-columns: repeat(7, minmax(92px, 1fr));
  gap: 6px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
  background: var(--muted);
}

.alliance-tab {
  display: flex;
  min-width: 0;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding-inline: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--background);
  color: var(--foreground);
  cursor: pointer;
  font-size: 12px;
}

.alliance-tab:hover {
  background: var(--accent);
}

.alliance-tab.active {
  border-color: currentColor;
  box-shadow: inset 0 -2px currentColor;
  font-weight: 650;
}

.alliance-tab b {
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 3px;
  background: color-mix(in srgb, currentColor 10%, transparent);
  font-size: 10px;
  line-height: 16px;
}

.alliance-green { color: #237804; }
.alliance-amber { color: #ad6800; }
.alliance-red { color: #b91c1c; }
.alliance-violet { color: #6d28d9; }
.alliance-cyan { color: #0e7490; }
.alliance-gray { color: #6b7280; }
.alliance-black { color: #171717; }

@media (max-width: 900px) {
  .alliance-tabs-section {
    overflow-x: auto;
    grid-template-columns: repeat(7, 105px);
  }
}
</style>
