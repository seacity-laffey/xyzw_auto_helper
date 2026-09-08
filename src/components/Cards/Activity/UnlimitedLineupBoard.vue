<template>
  <section class="current-team-section">
    <h4>
      编辑阵容 (阵容槽位{{ teamId }})
      <span class="drag-tip">拖拽调整站位</span>
    </h4>
    <div class="heroes-grid">
      <div
        v-for="hero in heroes"
        :key="hero.key"
        class="hero-item"
        draggable="true"
        :class="{
          'dragging': draggedHeroId === hero.heroId,
          'drag-over': dragOverPosition === hero.position,
        }"
        @dragend="emit('dragEnd')"
        @dragleave="emit('dragLeave')"
        @dragover.prevent="emit('dragOver', $event, hero)"
        @dragstart="emit('dragStart', $event, hero)"
        @drop="emit('drop', $event, hero)"
      >
        <div class="hero-position">
          {{ hero.position + 1 }}
        </div>
        <button class="hero-left" type="button" @click="emit('refine', hero)">
          <span class="hero-avatar">
            <img v-if="hero.avatar" :alt="hero.name" :src="hero.avatar">
            <span v-else class="hero-placeholder">
              {{ hero.name.substring(0, 2) || "?" }}
            </span>
          </span>
          <span class="hero-avatar-info">
            <span class="hero-name-small-inline">{{ hero.name }}</span>
            <span v-if="hero.level" class="hero-level-small-inline">
              Lv.{{ hero.level }}
            </span>
          </span>
        </button>
        <button class="hero-info" type="button" @click="emit('refine', hero)">
          <span v-if="hero.fishName" class="hero-fish">
            {{ hero.fishName }}
            <span v-if="hero.pearlSkillName" class="hero-fish-skill-inline">
              {{ hero.pearlSkillName }}
            </span>
            <span v-if="hero.slotColors?.length" class="hero-fish-slots-inline">
              <span
                v-for="(slotColor, index) in hero.slotColors"
                :key="index"
                class="slot-dot-small"
                :style="{ backgroundColor: slotColor }"
              ></span>
            </span>
          </span>
          <span v-if="hero.power" class="hero-stats">
            <span class="stat-row">
              <span class="stat-power">战力{{ hero.power }}</span>
              <span v-if="hero.speed" class="stat-speed">速度{{ hero.speed }}</span>
            </span>
            <span class="stat-row">
              <span v-if="hero.attack" class="stat-attack">攻击{{ hero.attack }}</span>
              <span v-if="hero.hp" class="stat-hp">血量{{ hero.hp }}</span>
            </span>
          </span>
        </button>
        <div class="hero-actions">
          <n-button
            class="exchange-btn"
            size="tiny"
            type="warning"
            @click.stop="emit('exchange', hero)"
          >
            更换
          </n-button>
          <n-button
            class="remove-btn"
            size="tiny"
            type="error"
            @click.stop="emit('remove', hero)"
          >
            下阵
          </n-button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface LineupBoardHero {
  artifactId?: number | null;
  attachmentUid?: number | string | null;
  attack: string | null;
  avatar: string | null;
  fishName: string | null;
  heroId: number;
  hp: string | null;
  key: string;
  level?: number | null;
  name: string;
  pearlSkillName: string | null;
  position: number;
  power: string | null;
  slotColors: string[] | null;
  speed?: number | null;
}

defineProps<{
  dragOverPosition: number | null;
  draggedHeroId: number | null;
  heroes: LineupBoardHero[];
  teamId: number;
}>();

const emit = defineEmits<{
  dragEnd: [];
  dragLeave: [];
  dragOver: [event: DragEvent, hero: LineupBoardHero];
  dragStart: [event: DragEvent, hero: LineupBoardHero];
  drop: [event: DragEvent, hero: LineupBoardHero];
  exchange: [hero: LineupBoardHero];
  refine: [hero: LineupBoardHero];
  remove: [hero: LineupBoardHero];
}>();
</script>

<style scoped lang="scss">
.current-team-section {
  padding: var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);

  h4 {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
    margin: 0 0 var(--spacing-sm) 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
}

.drag-tip {
  color: var(--text-tertiary);
  font-weight: normal;
  font-size: var(--font-size-xs);
}

.heroes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.hero-item {
  display: flex;
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  gap: var(--spacing-xs);
  align-items: center;
  cursor: grab;
  background: var(--bg-primary);
  border: 2px solid transparent;
  border-radius: var(--border-radius-small);
  transition: all 0.2s;

  &:hover {
    background: var(--primary-color-light);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  &.dragging {
    cursor: grabbing;
    opacity: 0.5;
  }

  &.drag-over {
    background: var(--primary-color-light);
    border-color: var(--primary-color);
  }
}

.hero-position {
  display: flex;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 10px;
  background: var(--primary-color);
  border-radius: 50%;
}

.hero-left,
.hero-info {
  padding: 0;
  color: inherit;
  text-align: inherit;
  background: transparent;
  border: 0;
}

.hero-left {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  cursor: pointer;
}

.hero-avatar {
  display: flex;
  width: 60px;
  height: 60px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-small);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.hero-placeholder {
  color: var(--text-secondary);
  font-size: 12px;
}

.hero-avatar-info {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.hero-name-small-inline {
  max-width: 60px;
  overflow: hidden;
  color: var(--text-primary);
  font-weight: 600;
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-level-small-inline {
  padding: 2px 6px;
  color: white;
  font-weight: 600;
  font-size: 10px;
  white-space: nowrap;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(240, 147, 251, 0.3);
}

.hero-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}

.hero-fish {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 8px;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
  color: var(--primary-color);
  font-weight: 500;
  font-size: var(--font-size-xs);
  background: linear-gradient(135deg, rgba(114, 46, 209, 0.15), rgba(114, 46, 209, 0.08));
  border: 1px solid rgba(114, 46, 209, 0.2);
  border-radius: 6px;
}

.hero-fish-skill-inline {
  padding: 1px 6px;
  color: white;
  font-weight: 500;
  font-size: 10px;
  background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
  border-radius: 4px;
}

.hero-fish-slots-inline {
  display: inline-flex;
  padding-left: 6px;
  gap: 3px;
  margin-left: 4px;
  border-left: 1px solid rgba(114, 46, 209, 0.2);
}

.slot-dot-small {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.hero-stats {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);

  .stat-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .stat-row > span {
    min-width: 90px;
    padding: 2px 6px;
    color: white;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
    border-radius: 4px;
  }
}

.stat-power {
  font-size: 12px;
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

.hero-actions {
  display: flex;
  min-width: 60px;
  flex-direction: column;
  gap: var(--spacing-xs);
  justify-content: center;
  margin-left: auto;
}

.exchange-btn,
.remove-btn {
  width: 100%;
  flex-shrink: 0;
}
</style>
