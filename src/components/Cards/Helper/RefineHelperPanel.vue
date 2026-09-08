<template>
  <MyCard class="refine-helper" :status-class="{ active: state.isRunning }">
    <template #icon><img alt="洗练图标" src="/icons/ta.png"></template>
    <template #title>
      <h3>洗练助手</h3>
      <p>装备洗练、锁定孔位、自动洗练</p>
    </template>
    <template #badge><span>{{ state.isRunning ? "运行中" : "已停止" }}</span></template>
    <template #default>
      <div class="refine-container">
        <div class="toolbar">
          <NButton size="small" type="primary" @click="emit('refresh')">刷新阵容</NButton>
          <NButton size="small" @click="emit('resetCount')">计数清零</NButton>
          <div class="jade-info">
            <span>白玉: {{ jadeCount }}</span>
            <span>彩玉: {{ colorJadeCount }}</span>
          </div>
        </div>

        <div class="hero-list-section">
          <h4>选择武将</h4>
          <div class="hero-list">
            <div v-if="loading" class="loading">加载中...</div>
            <div v-else-if="!heroes.length" class="empty">暂无武将数据</div>
            <button
              v-for="hero in heroes"
              :key="hero.id"
              class="hero-item"
              type="button"
              :class="{ active: selectedHeroId === hero.id }"
              @click="emit('selectHero', hero.id)"
            >
              <span class="hero-avatar">
                <img
                  v-if="heroDictionary[hero.id]?.avatar"
                  :alt="hero.name"
                  :src="heroDictionary[hero.id]?.avatar"
                >
                <span v-else class="hero-placeholder">{{ hero.name?.substring(0, 2) || "?" }}</span>
              </span>
              <span class="hero-info">
                <span class="hero-name">{{ hero.name }}</span>
                <span class="hero-level">Lv.{{ hero.level }}</span>
              </span>
            </button>
          </div>
        </div>

        <div v-if="selectedHeroId" class="equip-section">
          <h4>选择装备</h4>
          <div class="equip-tabs">
            <button
              v-for="part in equipParts"
              :key="part.id"
              class="equip-tab"
              type="button"
              :class="{ active: selectedPart === part.id }"
              @click="emit('selectPart', part.id)"
            >
              <span class="tab-name">{{ part.name }}</span>
              <span class="tab-level">Lv.{{ part.level }}</span>
            </button>
          </div>
        </div>

        <div v-if="selectedPart" class="refine-detail">
          <div class="stats">
            <div class="stat-item">
              <span class="stat-label">淬炼次数</span>
              <span class="stat-value">{{ quenchTimes }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ equipBonusName }}</span>
              <span class="stat-value">+{{ equipBonusValue }}</span>
            </div>
          </div>

          <div class="slots-section">
            <h4>孔位锁定</h4>
            <div class="slots">
              <div
                v-for="slot in slots"
                :key="slot.id"
                class="slot"
                :class="{
                  locked: slot.isLocked,
                  [`color-${slot.colorId}`]: slot.colorId > 0,
                }"
              >
                <NCheckbox
                  :checked="slot.isLocked"
                  @update:checked="emit('toggleSlot', slot.id, $event)"
                ></NCheckbox>
                <span class="slot-label">孔{{ slot.id }}</span>
                <div v-if="slot.attrId" class="slot-attr">
                  <span>{{ attrName(slot.attrId) }}</span>
                  <span>+{{ slot.attrNum }}%</span>
                </div>
                <div v-else class="slot-empty">未淬炼</div>
              </div>
            </div>
          </div>

          <div class="password-section">
            <div v-if="!passwordValidated" class="password-info">
              <span class="password-label">解锁二级密码：</span>
              <NInput
                placeholder="请输入二级密码"
                size="small"
                style="width: 150px"
                type="password"
                :value="password"
                @update:value="emit('updatePassword', $event)"
              ></NInput>
              <NButton
                size="small"
                type="primary"
                :loading="verifying"
                @click="emit('verifyPassword')"
              >
                验证
              </NButton>
              <span v-if="passwordError" class="password-error">{{ passwordError }}</span>
            </div>
            <div v-else class="password-validated">
              <NTag size="small" type="success">密码已验证</NTag>
              <NButton size="small" type="warning" @click="emit('resetPassword')">
                重新验证
              </NButton>
            </div>
          </div>

          <div class="actions">
            <NButton size="small" type="primary" :disabled="state.isRunning" @click="emit('quenchOnce')">
              淬炼一次
            </NButton>
            <NButton size="small" type="success" :disabled="state.isRunning" @click="emit('quenchContinuous')">
              连续淬炼
            </NButton>
            <NButton size="small" type="warning" :disabled="state.isRunning" @click="emit('startAutoQuench')">
              自动淬炼
            </NButton>
            <NButton size="small" type="error" :disabled="!state.isRunning" @click="emit('stopQuench')">
              停止
            </NButton>
            <div class="count-info">已淬炼: <strong>{{ quenchCount }}</strong></div>
          </div>

          <div class="auto-section">
            <h4>自动淬炼设置</h4>
            <div class="conditions-list">
              <div
                v-for="(condition, index) in targetConditions"
                :key="index"
                class="condition-item"
              >
                <div class="auto-form">
                  <div class="form-item">
                    <span class="form-label">属性</span>
                    <NSelect
                      placeholder="选择属性"
                      size="small"
                      style="width: 120px"
                      :options="attrOptions"
                      :value="condition.attrId"
                      @update:value="emit('updateCondition', index, 'attrId', $event)"
                    ></NSelect>
                  </div>
                  <div class="form-item">
                    <span class="form-label">≥</span>
                    <NInputNumber
                      size="small"
                      style="width: 80px"
                      :max="100"
                      :min="1"
                      :value="condition.attrValue"
                      @update:value="emit('updateCondition', index, 'attrValue', $event)"
                    ></NInputNumber>
                  </div>
                  <NButton
                    size="small"
                    type="error"
                    :disabled="targetConditions.length <= 1"
                    @click="emit('removeCondition', index)"
                  >
                    删除
                  </NButton>
                </div>
              </div>
            </div>
            <div class="add-condition">
              <NButton size="small" type="primary" @click="emit('addCondition')">+ 添加条件</NButton>
            </div>
            <div class="auto-form delay-setting">
              <div class="form-item">
                <span class="form-label">延迟(ms)</span>
                <NInputNumber
                  size="small"
                  style="width: 100px"
                  :min="0"
                  :step="100"
                  :value="delay"
                  @update:value="emit('updateDelay', $event)"
                ></NInputNumber>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MyCard>
</template>

<script setup>
import {
  NButton,
  NCheckbox,
  NInput,
  NInputNumber,
  NSelect,
  NTag,
} from "naive-ui";
import MyCard from "../../Common/MyCard.vue";

defineProps({
  attrName: { type: Function, required: true },
  attrOptions: { type: Array, default: () => [] },
  colorJadeCount: { type: Number, default: 0 },
  delay: { type: Number, default: 350 },
  equipBonusName: { type: String, default: "攻击" },
  equipBonusValue: { type: Number, default: 0 },
  equipParts: { type: Array, default: () => [] },
  heroDictionary: { type: Object, default: () => ({}) },
  heroes: { type: Array, default: () => [] },
  jadeCount: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  password: { type: String, default: "" },
  passwordError: { type: String, default: "" },
  passwordValidated: { type: Boolean, default: false },
  quenchCount: { type: Number, default: 0 },
  quenchTimes: { type: Number, default: 0 },
  selectedHeroId: { type: Number, default: null },
  selectedPart: { type: Number, default: null },
  slots: { type: Array, default: () => [] },
  state: { type: Object, required: true },
  targetConditions: { type: Array, default: () => [] },
  verifying: { type: Boolean, default: false },
});

const emit = defineEmits([
  "addCondition",
  "quenchContinuous",
  "quenchOnce",
  "refresh",
  "removeCondition",
  "resetCount",
  "resetPassword",
  "selectHero",
  "selectPart",
  "startAutoQuench",
  "stopQuench",
  "toggleSlot",
  "updateCondition",
  "updateDelay",
  "updatePassword",
  "verifyPassword",
]);
</script>

<style scoped lang="scss">
.refine-container { padding: var(--spacing-sm); }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); }
.jade-info { display: flex; gap: var(--spacing-md); margin-left: auto; color: var(--text-secondary); font-size: var(--font-size-sm); }
.hero-list-section, .equip-section { margin-bottom: var(--spacing-md); }
h4 { margin: 0 0 var(--spacing-sm); color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.hero-list { display: flex; max-height: 220px; flex-wrap: wrap; gap: var(--spacing-sm); overflow-y: auto; padding: var(--spacing-sm); border-radius: var(--border-radius-medium); background: var(--bg-tertiary); }
.hero-item { display: flex; min-width: 140px; flex: 0 0 calc(25% - 8px); align-items: center; gap: var(--spacing-sm); box-sizing: border-box; padding: var(--spacing-sm); border: 2px solid transparent; border-radius: var(--border-radius-medium); background: var(--bg-primary); color: var(--text-primary); font-size: var(--font-size-sm); text-align: left; cursor: pointer; box-shadow: 0 1px 3px rgb(0 0 0 / 6%); transition: all 0.2s; }
.hero-item:hover, .hero-item.active { border-color: var(--primary-color); background: var(--primary-color-light); }
.hero-item.active { color: var(--primary-color); }
.hero-avatar { display: flex; width: 36px; height: 36px; flex-shrink: 0; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; background: var(--bg-tertiary); }
.hero-avatar img { width: 100%; height: 100%; object-fit: cover; }
.hero-placeholder { color: var(--text-secondary); font-size: var(--font-size-md); font-weight: var(--font-weight-bold); }
.hero-info { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.hero-name { overflow: hidden; color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); text-overflow: ellipsis; white-space: nowrap; }
.hero-level, .tab-level { color: var(--text-secondary); font-size: var(--font-size-xs); }
.loading, .empty { padding: var(--spacing-md); color: var(--text-secondary); font-size: var(--font-size-sm); text-align: center; }
.equip-tabs { display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); }
.equip-tab { flex: 1; padding: var(--spacing-sm) var(--spacing-md); border: 2px solid transparent; border-radius: var(--border-radius-medium); background: var(--bg-tertiary); text-align: center; cursor: pointer; transition: all 0.2s; }
.equip-tab:hover { border-color: var(--border-light); }
.equip-tab.active { border-color: var(--primary-color); background: var(--primary-color-light); }
.tab-name, .tab-level { display: block; }
.tab-name { color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.tab-level { margin-top: var(--spacing-xs); }
.stats { display: flex; gap: var(--spacing-lg); margin-bottom: var(--spacing-md); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--border-radius-medium); background: var(--bg-tertiary); }
.stat-item { display: flex; align-items: center; gap: var(--spacing-sm); }
.stat-label { color: var(--text-secondary); font-size: var(--font-size-sm); }
.stat-value { color: var(--primary-color); font-size: var(--font-size-md); font-weight: var(--font-weight-bold); }
.slots-section { margin-bottom: var(--spacing-md); }
.slots { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.slot { display: flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-md); border-left: 4px solid var(--border-light); border-radius: var(--border-radius-medium); background: var(--bg-tertiary); transition: all 0.2s; }
.slot:hover { background: var(--bg-secondary); }
.slot.locked { border-left-color: var(--primary-color); background: var(--primary-color-light); }
.slot.color-1 { border-left-color: #fff; }
.slot.color-2 { border-left-color: #4caf50; }
.slot.color-3 { border-left-color: #2196f3; }
.slot.color-4 { border-left-color: #9c27b0; }
.slot.color-5 { border-left-color: #ff9800; }
.slot.color-6 { border-left-color: #f44336; }
.slot.color-1 { background: rgb(255 255 255 / 10%); }
.slot.color-2 { background: rgb(76 175 80 / 10%); }
.slot.color-3 { background: rgb(33 150 243 / 10%); }
.slot.color-4 { background: rgb(156 39 176 / 10%); }
.slot.color-5 { background: rgb(255 152 0 / 10%); }
.slot.color-6 { background: rgb(244 67 54 / 10%); }
.slot.locked.color-1 { background: rgb(255 255 255 / 20%); }
.slot.locked.color-2 { background: rgb(76 175 80 / 20%); }
.slot.locked.color-3 { background: rgb(33 150 243 / 20%); }
.slot.locked.color-4 { background: rgb(156 39 176 / 20%); }
.slot.locked.color-5 { background: rgb(255 152 0 / 20%); }
.slot.locked.color-6 { background: rgb(244 67 54 / 20%); }
.slot-label { min-width: 40px; color: var(--text-secondary); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.slot-attr { display: flex; flex: 1; justify-content: space-between; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.slot-empty { flex: 1; color: var(--text-tertiary); font-size: var(--font-size-sm); }
.password-section, .auto-section { padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--border-light); border-radius: var(--border-radius-medium); background: rgb(0 0 0 / 5%); }
.password-section { margin-bottom: var(--spacing-md); }
.password-info, .password-validated, .actions, .auto-form { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-sm); }
.password-label, .form-label { color: var(--text-secondary); font-size: var(--font-size-sm); }
.password-label { font-weight: var(--font-weight-medium); }
.password-error { margin-left: var(--spacing-sm); color: var(--color-error); font-size: var(--font-size-xs); }
.password-validated { justify-content: space-between; }
.actions { margin-bottom: var(--spacing-md); }
.count-info { display: flex; align-items: center; gap: var(--spacing-xs); margin-left: auto; color: var(--text-secondary); font-size: var(--font-size-sm); }
.count-info strong { color: var(--primary-color); font-size: var(--font-size-md); }
.auto-section { padding: var(--spacing-sm); }
.conditions-list, .add-condition { margin-bottom: var(--spacing-sm); }
.condition-item { margin-bottom: var(--spacing-sm); padding: var(--spacing-sm); border: 1px solid var(--border-light); border-radius: var(--border-radius-medium); background: rgb(0 0 0 / 5%); }
.add-condition { display: flex; justify-content: flex-start; }
.delay-setting { padding-top: var(--spacing-sm); border-top: 1px dashed var(--border-light); }
.form-item { display: flex; align-items: center; gap: var(--spacing-xs); }

@media (max-width: 720px) {
  .hero-item { flex-basis: calc(50% - 4px); }
  .equip-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .count-info { width: 100%; margin-left: 0; }
}
</style>
