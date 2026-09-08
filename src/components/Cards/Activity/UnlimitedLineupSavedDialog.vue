<template>
  <n-modal
    preset="card"
    style="width: 900px; max-width: 90vw"
    title="已保存的阵容"
    :bordered="false"
    :show="open"
    @update:show="emit('update:open', $event)"
  >
    <div v-if="lineups.length === 0" class="empty-tip">
      暂无保存的阵容，点击&quot;保存阵容&quot;开始使用
    </div>
    <div v-else class="saved-lineups-modal-content">
      <div class="team-tabs">
        <div class="team-tabs-left">
          <button
            v-for="teamId in availableTeams"
            :key="teamId"
            class="team-tab"
            type="button"
            :class="{ active: selectedTeamId === teamId }"
            @click="emit('update:selectedTeamId', teamId)"
          >
            槽位{{ teamId }}
            <span class="tab-count">({{ countByTeam(teamId) }})</span>
          </button>
        </div>
        <div class="team-tabs-right">
          <n-button size="tiny" @click="emit('exportLineups')">
            导出
          </n-button>
          <n-upload
            accept=".json"
            :custom-request="handleImport"
            :show-file-list="false"
          >
            <n-button size="tiny">
              导入
            </n-button>
          </n-upload>
        </div>
      </div>
      <div class="lineups-list">
        <article
          v-for="lineup in selectedLineups"
          :key="lineup.key"
          class="lineup-card"
        >
          <div
            class="lineup-title-bar"
            role="button"
            tabindex="0"
            @click="emit('toggle', lineup.index)"
            @keydown.enter="emit('toggle', lineup.index)"
            @keydown.space.prevent="emit('toggle', lineup.index)"
          >
            <span class="lineup-title-left">
              <span class="expand-icon">{{ lineup.expanded ? "▼" : "▶" }}</span>
              <span class="lineup-name">{{ lineup.name }}</span>
              <span v-if="lineup.weaponLabel" class="lineup-weapon-tag">
                {{ lineup.weaponLabel }}
              </span>
              <span class="lineup-time">{{ lineup.savedAtLabel }}</span>
            </span>
            <span class="lineup-quick-actions" @click.stop @keydown.stop>
              <n-button size="tiny" @click="emit('rename', lineup.index)">
                重命名
              </n-button>
              <n-button
                size="tiny"
                :disabled="!lineup.hasTech"
                @click="emit('tech', lineup.index)"
              >
                科技
              </n-button>
              <n-button
                size="tiny"
                type="error"
                @click="emit('delete', lineup.index)"
              >
                删除
              </n-button>
              <n-button
                size="tiny"
                type="primary"
                :disabled="lineup.teamId !== currentTeamId"
                :loading="lineup.applying"
                @click="emit('apply', lineup.index)"
              >
                应用
              </n-button>
            </span>
          </div>
          <div v-if="lineup.expanded" class="lineup-detail">
            <div class="lineup-heroes-row">
              <div
                v-for="hero in lineup.heroes"
                :key="hero.key"
                class="lineup-hero-card"
              >
                <img
                  v-if="hero.avatar"
                  class="hero-avatar"
                  :alt="hero.name"
                  :src="hero.avatar"
                >
                <div v-else class="hero-avatar-placeholder">
                  {{ hero.name.charAt(0) || "?" }}
                </div>
                <div class="hero-info-small">
                  <div class="hero-header-small">
                    <div class="hero-name-small">
                      {{ hero.name }}
                    </div>
                    <div v-if="hero.level" class="hero-level-small">
                      Lv.{{ hero.level }}
                    </div>
                  </div>
                  <div v-if="hero.fishName" class="hero-fish-info">
                    <div class="hero-fish-row">
                      <span class="hero-fish-name">
                        {{ hero.fishName }}
                        <span v-if="hero.skillName" class="hero-fish-skill-name">
                          {{ hero.skillName }}
                        </span>
                      </span>
                      <div v-if="hero.slotColors?.length" class="hero-fish-slots">
                        <span
                          v-for="(slotColor, index) in hero.slotColors"
                          :key="index"
                          class="slot-dot"
                          :style="{ backgroundColor: slotColor }"
                        ></span>
                      </div>
                    </div>
                  </div>
                  <div v-if="hero.power" class="hero-stats-small">
                    <div class="stat-row-small">
                      <span class="stat-power">战力{{ hero.power }}</span>
                      <span v-if="hero.speed" class="stat-speed">速度{{ hero.speed }}</span>
                    </div>
                    <div class="stat-row-small">
                      <span v-if="hero.attack" class="stat-attack">攻击{{ hero.attack }}</span>
                      <span v-if="hero.hp" class="stat-hp">血量{{ hero.hp }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
        <div v-if="selectedLineups.length === 0" class="no-lineup-tip">
          暂无保存的阵容
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface SavedHeroCard {
  attack: string | null;
  avatar: string | null;
  fishName: string | null;
  hp: string | null;
  key: string;
  level: string;
  name: string;
  power: string | null;
  skillName: string | null;
  slotColors: string[] | null;
  speed?: number | null;
}

interface SavedLineupCard {
  applying: boolean;
  expanded: boolean;
  hasTech: boolean;
  heroes: SavedHeroCard[];
  index: number;
  key: string;
  name: string;
  savedAtLabel: string;
  teamId: number;
  weaponLabel: string | number | null;
}

const props = defineProps<{
  availableTeams: number[];
  currentTeamId: number;
  lineups: SavedLineupCard[];
  open: boolean;
  selectedTeamId: number;
}>();

const emit = defineEmits<{
  "apply": [index: number];
  "delete": [index: number];
  "exportLineups": [];
  "importLineups": [options: unknown];
  "rename": [index: number];
  "tech": [index: number];
  "toggle": [index: number];
  "update:open": [open: boolean];
  "update:selectedTeamId": [teamId: number];
}>();

const selectedLineups = computed(() =>
  props.lineups.filter((lineup) => lineup.teamId === props.selectedTeamId),
);

const countByTeam = (teamId: number) =>
  props.lineups.filter((lineup) => lineup.teamId === teamId).length;

const handleImport = (options: unknown) => {
  emit("importLineups", options);
};
</script>

<style scoped lang="scss">
.empty-tip,
.no-lineup-tip {
  padding: var(--spacing-lg);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
  text-align: center;
}

.empty-tip {
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.saved-lineups-modal-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.team-tabs {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
  justify-content: space-between;
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-color);
}

.team-tabs-left,
.team-tabs-right {
  display: flex;
  gap: var(--spacing-xs);
}

.team-tab {
  padding: var(--spacing-xs) var(--spacing-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  background: transparent;
  border: 0;
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--text-primary);
    background: var(--bg-tertiary);
  }

  &.active {
    color: white;
    background: var(--primary-color);
  }
}

.tab-count {
  font-size: var(--font-size-xs);
  opacity: 0.8;
}

.lineups-list {
  max-height: 50vh;
  overflow-y: auto;
}

.lineup-card {
  margin-bottom: var(--spacing-sm);
  overflow: hidden;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.lineup-title-bar {
  display: flex;
  width: 100%;
  padding: var(--spacing-sm);
  align-items: center;
  justify-content: space-between;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--bg-secondary);
  }
}

.lineup-title-left,
.lineup-quick-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.lineup-quick-actions {
  gap: var(--spacing-xs);
}

.expand-icon {
  width: 12px;
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}

.lineup-name {
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.lineup-time {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}

.lineup-weapon-tag {
  padding: 1px 6px;
  margin-left: var(--spacing-xs);
  color: var(--primary-color);
  font-size: var(--font-size-xs);
  background: rgba(var(--primary-color-rgb, 0, 122, 255), 0.1);
  border-radius: var(--border-radius-small);
}

.lineup-detail {
  padding: 0 var(--spacing-sm) var(--spacing-sm);
  border-top: 1px solid var(--border-color);
}

.lineup-heroes-row {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-bottom: var(--spacing-sm);
}

.lineup-hero-card {
  display: flex;
  min-width: 110px;
  padding: 8px 6px;
  flex-direction: column;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-small);
}

.hero-avatar,
.hero-avatar-placeholder {
  width: 60px;
  height: 60px;
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-small);
}

.hero-avatar {
  object-fit: cover;
}

.hero-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  background: var(--bg-tertiary);
}

.hero-info-small,
.hero-header-small {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
}

.hero-header-small {
  gap: 2px;
  margin-bottom: 4px;
}

.hero-name-small {
  max-width: 100px;
  overflow: hidden;
  color: var(--text-primary);
  font-weight: 600;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-level-small {
  padding: 2px 6px;
  color: white;
  font-weight: 600;
  font-size: 12px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(240, 147, 251, 0.3);
}

.hero-fish-info {
  display: flex;
  width: 100%;
  padding: 4px 8px;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  margin-bottom: 4px;
  background: linear-gradient(135deg, rgba(114, 46, 209, 0.12), rgba(114, 46, 209, 0.06));
  border: 1px solid rgba(114, 46, 209, 0.18);
  border-radius: 6px;
}

.hero-fish-row {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: center;
}

.hero-fish-name {
  color: var(--primary-color);
  font-weight: 500;
  font-size: 11px;
}

.hero-fish-skill-name {
  padding: 2px 6px;
  margin-left: 4px;
  color: white;
  font-weight: 500;
  font-size: 10px;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border-radius: 4px;
}

.hero-fish-slots {
  display: flex;
  gap: 4px;
  justify-content: center;
  padding-top: 3px;
}

.slot-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.hero-stats-small {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 3px;
  color: var(--text-secondary);
  font-size: 10px;

  .stat-row-small {
    display: flex;
    gap: 4px;
    justify-content: center;
  }

  .stat-row-small > span {
    min-width: 70px;
    padding: 3px 5px;
    color: white;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    border-radius: 4px;
  }
}

.stat-power {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
}

.stat-attack {
  background: linear-gradient(135deg, #ffa940 0%, #fa8c16 100%);
}

.stat-hp {
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
}

.stat-speed {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}
</style>
