<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>武将详情</DialogTitle>
        <DialogDescription>武将属性、鱼灵与装备淬炼信息</DialogDescription>
      </DialogHeader>

      <template v-if="hero">
        <div class="hero-summary">
          <div class="hero-avatar">
            <img
              v-if="hero.heroAvate"
              :alt="hero.heroName || '武将头像'"
              :src="hero.heroAvate"
            >
            <span v-else>{{ hero.heroName?.substring(0, 2) || "?" }}</span>
          </div>
          <div>
            <h3>{{ hero.heroName || "未知武将" }}</h3>
            <div class="summary-badges">
              <Badge variant="outline">ID {{ hero.heroId || "未知" }}</Badge>
              <Badge variant="outline">{{ formatPower(hero.power) }}</Badge>
              <Badge variant="outline">等级 {{ hero.level || 0 }}</Badge>
              <Badge variant="outline">星级 {{ hero.star || 0 }}</Badge>
              <Badge :variant="hero.HolyBeast ? 'default' : 'secondary'">
                {{ hero.HolyBeast ? "四圣已激活" : "四圣未激活" }}
              </Badge>
            </div>
          </div>
        </div>

        <dl class="detail-grid">
          <div><dt>战力</dt><dd>{{ formatPower(hero.power) }}</dd></div>
          <div><dt>等级</dt><dd>{{ hero.level || 0 }}</dd></div>
          <div><dt>星级</dt><dd>{{ hero.star || 0 }}</dd></div>
          <div><dt>开孔数</dt><dd>{{ hero.hole || 0 }}</dd></div>
          <div><dt>红孔数</dt><dd>{{ hero.red || 0 }}</dd></div>
          <div><dt>四圣状态</dt><dd>{{ hero.HolyBeast ? "已激活" : "未激活" }}</dd></div>
          <div v-if="hero.HolyBeast"><dt>四圣等级</dt><dd>{{ hero.HBlevel || 0 }}</dd></div>
          <div><dt>鱼灵</dt><dd>{{ hero.PearlInfo?.FishInfo?.name || "无" }}</dd></div>
          <div><dt>鱼珠技能</dt><dd>{{ hero.PearlInfo?.PearlSkill?.name || "无" }}</dd></div>
          <div class="full-row">
            <dt>鱼灵洗练</dt>
            <dd v-if="hero.PearlInfo?.slotMap?.length" class="refine-slots">
              <span
                v-for="item in hero.PearlInfo.slotMap"
                :key="item.id"
                :style="{ backgroundColor: item.value }"
              ></span>
            </dd>
            <dd v-else>无</dd>
          </div>
        </dl>

        <section class="equipment-section">
          <h3>装备详情</h3>
          <div class="equipment-grid">
            <div
              v-for="equipment in equipmentList"
              :key="equipment.label"
              class="equipment-row"
            >
              <span>{{ equipment.label }}</span>
              <div class="equipment-slots">
                <i
                  v-for="(quench, quenchIndex) in equipment.quenches"
                  :key="quenchIndex"
                  :class="{ red: quench?.colorId === 6 }"
                ></i>
                <small v-if="!equipment.quenches.length">无洗练孔位</small>
              </div>
            </div>
          </div>
        </section>
      </template>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup>
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const props = defineProps({
  hero: { type: Object, default: null },
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["update:open"]);
const equipmentLabels = ["武器", "衣服", "头盔", "坐骑"];

const equipmentList = computed(() => {
  const values = Object.values(props.hero?.equipment || {});
  return equipmentLabels.map((label, index) => ({
    label,
    quenches: Object.values(values[index]?.quenches || {}),
  }));
});

const formatPower = (power) => {
  const value = Number(power) || 0;
  if (value >= 100000000)
    return `${(value / 100000000).toFixed(2)}亿`;
  if (value >= 10000)
    return `${(value / 10000).toFixed(2)}万`;
  return String(value);
};
</script>

<style scoped>
.hero-summary {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}

.hero-avatar {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--muted);
  font-size: 20px;
  font-weight: 700;
}

.hero-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-summary h3,
.equipment-section h3 {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 650;
}

.summary-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
}

.detail-grid > div {
  min-width: 0;
  padding: 10px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.detail-grid .full-row {
  grid-column: 1 / -1;
}

.detail-grid dt {
  color: var(--muted-foreground);
  font-size: 11px;
}

.detail-grid dd {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 550;
}

.refine-slots,
.equipment-slots {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.refine-slots span,
.equipment-slots i {
  width: 15px;
  height: 15px;
  border: 1px solid var(--border);
  border-radius: 2px;
}

.equipment-section {
  display: grid;
  gap: 8px;
}

.equipment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.equipment-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 9px;
  border: 1px solid var(--border);
  font-size: 12px;
}

.equipment-slots i {
  background: var(--muted);
}

.equipment-slots i.red {
  border-color: var(--destructive);
  background: var(--destructive);
}

.equipment-slots small {
  color: var(--muted-foreground);
}

@media (max-width: 620px) {
  .detail-grid,
  .equipment-grid {
    grid-template-columns: 1fr;
  }

  .detail-grid .full-row {
    grid-column: auto;
  }
}
</style>
