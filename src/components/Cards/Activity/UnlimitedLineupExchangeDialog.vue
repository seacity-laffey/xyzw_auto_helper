<template>
  <n-modal
    preset="card"
    style="width: 700px; max-width: 90vw"
    :bordered="false"
    :show="open"
    :title="mode === 'add' ? '上阵英雄' : '更换武将'"
    @update:show="emit('update:open', $event)"
  >
    <div class="exchange-modal-content">
      <div class="current-hero-info">
        <span>{{ mode === "exchange" ? "当前武将：" : "上阵位置：" }}</span>
        <n-tag size="large" :type="mode === 'exchange' ? 'primary' : 'success'">
          {{ mode === "exchange" ? currentHeroName : `位置 ${emptySlot + 1}` }}
        </n-tag>
      </div>
      <n-input
        clearable
        placeholder="搜索武将名称..."
        style="margin-bottom: 12px"
        :value="searchKeyword"
        @update:value="emit('update:searchKeyword', $event)"
      ></n-input>
      <div class="hero-filter-section">
        <div class="filter-label">
          品质：
        </div>
        <div class="filter-tags">
          <n-tag
            v-for="quality in qualities"
            :key="quality"
            style="cursor: pointer; margin-right: 8px"
            :bordered="false"
            :type="selectedQuality === quality ? 'primary' : 'default'"
            @click="toggleQuality(quality)"
          >
            {{ quality }}
          </n-tag>
        </div>
      </div>
      <div class="hero-filter-section">
        <div class="filter-label">
          国家：
        </div>
        <div class="filter-tags">
          <n-tag
            v-for="country in countries"
            :key="country"
            style="cursor: pointer; margin-right: 8px"
            :bordered="false"
            :type="selectedCountry === country ? 'primary' : 'default'"
            @click="toggleCountry(country)"
          >
            {{ country }}
          </n-tag>
        </div>
      </div>
      <n-spin :show="loading">
        <div class="hero-select-grid">
          <button
            v-for="hero in heroes"
            :key="hero.id"
            class="hero-select-item"
            type="button"
            :class="{
              'selected': selectedHeroId === hero.id,
              'quality-red': hero.quality === '红将',
              'quality-orange': hero.quality === '橙将',
              'quality-purple': hero.quality === '紫将',
            }"
            @click="emit('select', hero.id)"
          >
            <span class="hero-select-avatar">
              <img v-if="hero.avatar" :alt="hero.name" :src="hero.avatar">
              <span v-else class="hero-placeholder">
                {{ hero.name.substring(0, 2) || "?" }}
              </span>
            </span>
            <span class="hero-select-name">{{ hero.name }}</span>
            <span class="hero-select-tags">
              <n-tag
                size="small"
                :bordered="false"
                :type="qualityTagType(hero.quality)"
              >
                {{ hero.quality }}
              </n-tag>
              <n-tag size="small" type="default" :bordered="false">
                {{ hero.type }}
              </n-tag>
            </span>
          </button>
        </div>
      </n-spin>
    </div>
    <template #footer>
      <div class="dialog-actions">
        <n-button @click="emit('update:open', false)">
          取消
        </n-button>
        <n-button
          size="medium"
          type="primary"
          :disabled="!selectedHeroId"
          :loading="loading"
          @click="emit('confirm')"
        >
          {{ mode === "add" ? "确认上阵" : "确认更换" }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
interface HeroOption {
  avatar: string | null;
  id: number;
  name: string;
  quality: string;
  type: string;
}

const props = defineProps<{
  countries: string[];
  currentHeroName: string;
  emptySlot: number;
  heroes: HeroOption[];
  loading: boolean;
  mode: string;
  open: boolean;
  qualities: string[];
  searchKeyword: string;
  selectedCountry: string;
  selectedHeroId: number | null;
  selectedQuality: string;
}>();

const emit = defineEmits<{
  "confirm": [];
  "select": [heroId: number];
  "update:open": [open: boolean];
  "update:searchKeyword": [keyword: string];
  "update:selectedCountry": [country: string];
  "update:selectedQuality": [quality: string];
}>();

const toggleQuality = (quality: string) => {
  emit(
    "update:selectedQuality",
    props.selectedQuality === quality ? "全部" : quality,
  );
};

const toggleCountry = (country: string) => {
  emit(
    "update:selectedCountry",
    props.selectedCountry === country ? "全部" : country,
  );
};

const qualityTagType = (quality: string) => {
  if (quality === "红将")
    return "error";
  if (quality === "橙将")
    return "warning";
  if (quality === "紫将")
    return "info";
  return "default";
};
</script>

<style scoped lang="scss">
.exchange-modal-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.current-hero-info {
  display: flex;
  padding: var(--spacing-sm);
  gap: var(--spacing-sm);
  align-items: center;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.hero-filter-section {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.filter-label {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.hero-select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  max-height: 400px;
  padding: var(--spacing-xs);
  gap: var(--spacing-sm);
  overflow-y: auto;
}

.hero-select-item {
  display: flex;
  padding: var(--spacing-sm);
  flex-direction: column;
  gap: var(--spacing-xs);
  align-items: center;
  color: inherit;
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-secondary);
    transform: translateY(-2px);
  }

  &.selected {
    background: var(--primary-color-light);
    border-color: var(--primary-color);
  }

  &.quality-red {
    border-color: rgba(245, 34, 45, 0.3);

    &:hover,
    &.selected {
      background: rgba(245, 34, 45, 0.15);
      border-color: #f5222d;
    }
  }

  &.quality-orange {
    border-color: rgba(250, 173, 20, 0.3);

    &:hover,
    &.selected {
      background: rgba(250, 173, 20, 0.15);
      border-color: #faad14;
    }
  }

  &.quality-purple {
    border-color: rgba(114, 46, 209, 0.3);

    &:hover,
    &.selected {
      background: rgba(114, 46, 209, 0.15);
      border-color: #722ed1;
    }
  }
}

.hero-select-avatar {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--bg-primary);
  border-radius: 50%;

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

.hero-select-name {
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  text-align: center;
}

.hero-select-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
