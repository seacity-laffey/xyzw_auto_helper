<template>
  <MyCard class="lineup-saver" :status-class="{ active: state.isRunning }">
    <template #icon>
      <img
        alt="阵容图标"
        src="/icons/Ob7pyorzmHiJcbab2c25af264d0758b527bc1b61cc3b.png"
      >
    </template>
    <template #title>
      <h3>阵容助手</h3>
      <p>保存阵容、快速切换</p>
    </template>
    <template #badge>
      <span>{{ state.isRunning ? "运行中" : "已停止" }}</span>
    </template>
    <template #default>
      <div class="lineup-container">
        <div class="toolbar">
          <n-button
            size="small"
            type="primary"
            :loading="loading"
            @click="refreshTeamInfo"
          >
            刷新数据
          </n-button>
          <n-button
            size="small"
            :disabled="editingHeroes.length === 0"
            @click="saveCurrentLineup"
          >
            保存阵容
          </n-button>
          <n-button
            size="small"
            type="success"
            :disabled="editingHeroes.length >= 5"
            @click="openAddHeroModal"
          >
            上阵英雄
          </n-button>
          <n-button
            size="small"
            type="info"
            @click="savedLineupsModalVisible = true"
          >
            已保存阵容 ({{ savedLineups.length }})
          </n-button>
        </div>

        <div class="quick-switch-section">
          <h4>阵容槽位</h4>
          <div class="team-selector">
            <n-button
              v-for="teamId in availableTeams"
              :key="teamId"
              size="small"
              :loading="switchingTeamId === teamId"
              :type="currentTeamId === teamId ? 'primary' : 'default'"
              @click="switchTeam(teamId)"
            >
              阵容{{ teamId }}
            </n-button>
          </div>
        </div>

        <UnlimitedLineupBoard
          v-if="currentTeamInfo"
          :drag-over-position="dragOverPosition"
          :dragged-hero-id="draggedHeroId"
          :heroes="editingHeroCards"
          :team-id="currentTeamId"
          @drag-end="onDragEnd"
          @drag-leave="onDragLeave"
          @drag-over="onDragOver"
          @drag-start="onDragStart"
          @drop="onDrop"
          @exchange="openExchangeModal"
          @refine="showHeroRefineModal"
          @remove="removeHero"
        ></UnlimitedLineupBoard>
      </div>

      <UnlimitedLineupSavedDialog
        v-model:open="savedLineupsModalVisible"
        v-model:selected-team-id="selectedTeamTab"
        :available-teams="availableTeams"
        :current-team-id="currentTeamId"
        :lineups="savedLineupCards"
        @apply="applySavedLineup"
        @delete="deleteLineup"
        @export-lineups="exportLineups"
        @import-lineups="importLineups"
        @rename="renameLineup"
        @tech="showSavedLineupTech"
        @toggle="toggleSavedLineup"
      ></UnlimitedLineupSavedDialog>

      <UnlimitedLineupTechDialog
        v-model:open="techModalVisible"
        :tech-data="selectedTechData"
      ></UnlimitedLineupTechDialog>

      <UnlimitedLineupRefineDialog
        v-model:open="refineModalVisible"
        :loading="refineModalLoading"
        :parts="refineEquipmentParts"
        :title="refineModalTitle"
      ></UnlimitedLineupRefineDialog>

      <UnlimitedLineupExchangeDialog
        v-model:open="exchangeModalVisible"
        v-model:search-keyword="heroSearchKeyword"
        v-model:selected-country="selectedCountry"
        v-model:selected-quality="selectedQuality"
        :countries="heroCountries"
        :current-hero-name="exchangeHeroName"
        :empty-slot="getFirstEmptySlot()"
        :heroes="filteredHeroList"
        :loading="exchangeLoading"
        :mode="exchangeMode"
        :qualities="heroQualities"
        :selected-hero-id="exchangeTargetHeroId"
        @confirm="confirmHeroAction"
        @select="selectExchangeHeroById"
      ></UnlimitedLineupExchangeDialog>
    </template>
  </MyCard>
</template>

<script setup>
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { useUnlimitedLineupApplication } from "@/composables/useUnlimitedLineupApplication";
import { useUnlimitedLineupCapture } from "@/composables/useUnlimitedLineupCapture";
import { useUnlimitedLineupData } from "@/composables/useUnlimitedLineupData";
import { useUnlimitedLineupStorage } from "@/composables/useUnlimitedLineupStorage";
import MyCard from "../../Common/MyCard.vue";
import UnlimitedLineupBoard from "./UnlimitedLineupBoard.vue";
import UnlimitedLineupExchangeDialog from "./UnlimitedLineupExchangeDialog.vue";
import UnlimitedLineupRefineDialog from "./UnlimitedLineupRefineDialog.vue";
import UnlimitedLineupSavedDialog from "./UnlimitedLineupSavedDialog.vue";
import UnlimitedLineupTechDialog from "./UnlimitedLineupTechDialog.vue";
import {
  color,
  FishMap,
  HERO_DICT,
  PearlMap,
  weapon,
} from "@/utils/heroList";

const tokenStore = useTokenStore();
const message = useMessage();
const {
  deleteLineup,
  exportLineups,
  generateLineupId,
  importLineups,
  loadSavedLineups,
  renameLineup,
  savedLineups,
  saveLineupsToStorage,
} = useUnlimitedLineupStorage(tokenStore);

const editingTeamHeroes = ref({});
const COMMAND_DELAY = 500;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatPower = (power) => {
  if (!power)
    return "0";
  if (power >= 100000000) {
    return `${(power / 100000000).toFixed(2)}亿`;
  }
  if (power >= 10000) {
    return `${(power / 10000).toFixed(2)}万`;
  }
  return power.toString();
};

const state = ref({
  isRunning: false,
});

const {
  allHeroesData,
  artifactBooks,
  availableTeams,
  currentTeamId,
  currentTeamInfo,
  forceRefreshTeamInfo,
  loading,
  pearlMap,
  refreshTeamInfo,
  roleHeroesData,
  switchingTeamId,
  switchTeam,
} = useUnlimitedLineupData({
  tokenStore,
  message,
  editingTeamHeroes,
  state,
  loadSavedLineups,
});

const { applyLineup } = useUnlimitedLineupApplication({
  tokenStore,
  message,
  currentTeamId,
  roleHeroesData,
  state,
  forceRefreshTeamInfo,
});

const refineModalVisible = ref(false);
const refineModalLoading = ref(false);
const refineModalTitle = ref("");
const selectedHeroEquipment = ref(null);

const exchangeModalVisible = ref(false);
const exchangeLoading = ref(false);
const exchangeMode = ref("exchange");
const exchangeHero = ref(null);
const exchangeTargetHeroId = ref(null);
const heroSearchKeyword = ref("");
const selectedQuality = ref("全部");
const selectedCountry = ref("全部");
const savedLineupsModalVisible = ref(false);
const selectedTeamTab = ref(1);
const expandedLineup = ref(null);
const techModalVisible = ref(false);
const selectedTechData = ref(null);

const draggedHeroId = ref(null);
const dragOverPosition = ref(null);

const partMap = {
  1: "武器",
  2: "铠甲",
  3: "头冠",
  4: "坐骑",
};

const attrMap = {
  1: "攻击",
  2: "血量",
  3: "防御",
  4: "速度",
  5: "破甲",
  6: "破甲抵抗",
  7: "精准",
  8: "格挡",
  9: "减伤",
  10: "暴击",
  11: "暴击抵抗",
  12: "爆伤",
  13: "爆伤抵抗",
  14: "技能伤害",
  15: "免控",
  16: "眩晕免疫",
  17: "冰冻免疫",
  18: "沉默免疫",
  19: "流血免疫",
  20: "中毒免疫",
  21: "灼烧免疫",
};

const heroQualities = computed(() => {
  return ["全部", "红将", "橙将", "紫将"];
});

const heroCountries = computed(() => {
  const countries = new Set(["全部"]);
  Object.values(HERO_DICT).forEach((hero) => {
    if (hero.type)
      countries.add(hero.type);
  });
  return Array.from(countries);
});

const getHeroQuality = (heroId) => {
  const prefix = Math.floor(heroId / 100);
  if (prefix === 1)
    return "红将";
  if (prefix === 2)
    return "橙将";
  if (prefix === 3)
    return "紫将";
  return "其他";
};

const getFishInfo = (artifactId) => {
  if (!artifactId || artifactId === -1)
    return null;

  for (const [fishId, book] of Object.entries(artifactBooks.value)) {
    if (book.artifactId === artifactId) {
      const fishData = FishMap[fishId];
      if (fishData) {
        return {
          fishId: Number(fishId),
          name: fishData.name,
          artifactId: book.artifactId,
          star: book.claimedStar || 0,
        };
      }
    }
  }
  return null;
};

const getFishNameByArtifactId = (artifactId) => {
  const fishInfo = getFishInfo(artifactId);
  return fishInfo ? fishInfo.name : null;
};

const getFishNameById = (fishId) => {
  if (!fishId)
    return null;
  const fishData = FishMap[fishId];
  return fishData ? fishData.name : `鱼灵${fishId}`;
};

const getPearlSkillNameById = (skillId) => {
  if (!skillId)
    return null;
  const skillData = PearlMap[skillId];
  return skillData ? skillData.name : null;
};

const getSlotColors = (slotMap) => {
  if (!slotMap)
    return null;
  const colors = [];
  for (const slot of Object.values(slotMap)) {
    if (slot.colorId) {
      const colorData = color[slot.colorId];
      colors.push(colorData ? colorData.value : "white");
    }
  }
  return colors.length > 0 ? colors : null;
};

const getPearlDataByArtifactId = (artifactId) => {
  if (!artifactId || artifactId === -1)
    return null;
  for (const [pearlId, pearlData] of Object.entries(pearlMap.value)) {
    if (pearlData.artifactId === artifactId) {
      return pearlData;
    }
  }
  return null;
};

const getPearlSkillNameByArtifactId = (artifactId) => {
  const pearlData = getPearlDataByArtifactId(artifactId);
  if (!pearlData || !pearlData.skillId)
    return null;
  const skillData = PearlMap[pearlData.skillId];
  return skillData ? skillData.name : null;
};

const getSlotColorsByArtifactId = (artifactId) => {
  const pearlData = getPearlDataByArtifactId(artifactId);
  if (!pearlData || !pearlData.slotMap)
    return null;
  const colors = [];
  for (const slot of Object.values(pearlData.slotMap)) {
    if (slot.colorId) {
      const colorData = color[slot.colorId];
      colors.push(colorData ? colorData.value : "white");
    }
  }
  return colors.length > 0 ? colors : null;
};

const allHeroList = computed(() => {
  const heroes = Object.entries(roleHeroesData.value).map(([id, hero]) => {
    const heroInfo = HERO_DICT[hero.heroId] || {};
    return {
      id: Number(hero.heroId),
      name: heroInfo.name || `武将${hero.heroId}`,
      type: heroInfo.type || "未知",
      avatar: heroInfo.avatar || null,
      quality: getHeroQuality(Number(hero.heroId)),
      artifactId: hero.artifactId || null,
      attachmentUid: hero.attachmentUid || null,
      heroData: hero,
    };
  });

  const countryOrder = { 魏国: 1, 蜀国: 2, 吴国: 3, 群雄: 4 };
  const qualityOrder = { 红将: 1, 橙将: 2, 紫将: 3, 其他: 4 };

  return heroes.sort((a, b) => {
    const countryA = countryOrder[a.type] || 99;
    const countryB = countryOrder[b.type] || 99;
    if (countryA !== countryB)
      return countryA - countryB;

    const qualityA = qualityOrder[a.quality] || 99;
    const qualityB = qualityOrder[b.quality] || 99;
    if (qualityA !== qualityB)
      return qualityA - qualityB;

    return a.id - b.id;
  });
});

const filteredHeroList = computed(() => {
  let list = allHeroList.value;

  if (selectedQuality.value !== "全部") {
    list = list.filter((hero) => hero.quality === selectedQuality.value);
  }

  if (selectedCountry.value !== "全部") {
    list = list.filter((hero) => hero.type === selectedCountry.value);
  }

  if (heroSearchKeyword.value) {
    const keyword = heroSearchKeyword.value.toLowerCase();
    list = list.filter((hero) => hero.name.toLowerCase().includes(keyword));
  }

  return list;
});

const currentTeamHeroes = computed(() => {
  if (!currentTeamInfo.value)
    return [];
  const teamInfo = currentTeamInfo.value;
  return Object.entries(teamInfo)
    .map(([key, hero]) => {
      const heroData = roleHeroesData.value[String(hero?.heroId || hero?.id)];
      return {
        position: hero?.battleTeamSlot ?? Number(key),
        heroId: hero?.heroId || hero?.id,
        level: hero?.level || null,
        artifactId: hero?.artifactId || null,
        attachmentUid: hero?.attachmentUid || null,
        power: heroData?.power || null,
        attack: heroData?.attack || null,
        hp: heroData?.hp || null,
        speed: heroData?.speed || null,
      };
    })
    .filter((h) => h.heroId)
    .sort((a, b) => a.position - b.position);
});

const editingHeroes = computed(() => {
  if (Object.keys(editingTeamHeroes.value).length > 0) {
    return Object.entries(editingTeamHeroes.value)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([pos, hero]) => {
        const heroData = roleHeroesData.value[String(hero?.heroId)];
        return {
          position: Number(pos),
          heroId: hero?.heroId,
          level: hero?.level || null,
          artifactId: hero?.artifactId || null,
          attachmentUid: hero?.attachmentUid || null,
          power: heroData?.power || null,
          attack: heroData?.attack || null,
          hp: heroData?.hp || null,
          speed: heroData?.speed || null,
        };
      })
      .filter((h) => h.heroId);
  }
  return currentTeamHeroes.value;
});

const { saveCurrentLineup } = useUnlimitedLineupCapture({
  tokenStore,
  message,
  currentTeamId,
  editingHeroes,
  loading,
  savedLineups,
  generateLineupId,
  saveLineupsToStorage,
});

const editingHeroCards = computed(() =>
  editingHeroes.value.map((hero) => {
    const fishInfo = getFishInfo(hero.artifactId);
    return {
      ...hero,
      key: `${hero.heroId}-${hero.position}`,
      name: getHeroName(hero.heroId) || `武将${hero.heroId}`,
      avatar: getHeroAvatar(hero.heroId),
      fishName: fishInfo?.name || null,
      pearlSkillName: getPearlSkillNameByArtifactId(hero.artifactId),
      slotColors: getSlotColorsByArtifactId(hero.artifactId),
      power: hero.power ? formatPower(hero.power) : null,
      attack: hero.attack ? formatPower(hero.attack) : null,
      hp: hero.hp ? formatPower(hero.hp) : null,
    };
  }),
);

const getFirstEmptySlot = () => {
  for (let i = 0; i < 5; i++) {
    const hero = editingHeroes.value.find((h) => h.position === i);
    if (!hero)
      return i;
  }
  return 0;
};

const toggleLineupExpand = (lineup) => {
  if (expandedLineup.value === lineup) {
    expandedLineup.value = null;
  } else {
    expandedLineup.value = lineup;
  }
};

const hasEditingChanges = computed(() => {
  if (Object.keys(editingTeamHeroes.value).length === 0)
    return false;
  const current = JSON.stringify(
    currentTeamHeroes.value
      .map((h) => `${h.position}:${h.heroId}`)
      .sort()
      .join(","),
  );
  const editing = JSON.stringify(
    editingHeroes.value
      .map((h) => `${h.position}:${h.heroId}`)
      .sort()
      .join(","),
  );
  return current !== editing;
});

const getHeroName = (heroId) => {
  if (!heroId)
    return null;
  return HERO_DICT[heroId]?.name || null;
};

const getHeroAvatar = (heroId) => {
  if (!heroId)
    return null;
  return HERO_DICT[heroId]?.avatar || null;
};

const formatTime = (timestamp) => {
  if (!timestamp)
    return "";
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const formatLevel = (level) => {
  if (!level)
    return "";
  return String(level);
};

const savedLineupCards = computed(() =>
  savedLineups.value.map((lineup, index) => ({
    index,
    key: `${lineup.id || "lineup"}-${index}`,
    name: lineup.name,
    teamId: lineup.teamId,
    applying: Boolean(lineup.applying),
    expanded: expandedLineup.value === lineup,
    hasTech: Boolean(
      lineup.legionResearch
      && Object.keys(lineup.legionResearch).length > 0,
    ),
    savedAtLabel: formatTime(lineup.savedAt),
    weaponLabel:
      lineup.weaponId === undefined || lineup.weaponId === null
        ? null
        : weapon[lineup.weaponId] || lineup.weaponId,
    heroes: lineup.heroes.map((hero, heroIndex) => ({
      key: `${hero.heroId}-${heroIndex}`,
      name: getHeroName(hero.heroId) || `武将${hero.heroId}`,
      avatar: getHeroAvatar(hero.heroId),
      level: formatLevel(hero.level),
      fishName: hero.fishId ? getFishNameById(hero.fishId) : null,
      skillName: hero.skillId ? getPearlSkillNameById(hero.skillId) : null,
      slotColors: getSlotColors(hero.slotMap),
      power: hero.power ? formatPower(hero.power) : null,
      attack: hero.attack ? formatPower(hero.attack) : null,
      hp: hero.hp ? formatPower(hero.hp) : null,
      speed: hero.speed || null,
    })),
  })),
);

const getAttrName = (attrId) => {
  return attrMap[attrId] || `属性${attrId}`;
};

const getEquipBonus = (partId) => {
  if (!selectedHeroEquipment.value || !selectedHeroEquipment.value[partId]) {
    return 0;
  }
  const equip = selectedHeroEquipment.value[partId];
  const bonusType
    = partId === 1
      ? "quenchAttackExt"
      : partId === 3
        ? "quenchDefenseExt"
        : "quenchHpExt";
  return equip[bonusType] || 0;
};

const getEquipSlots = (partId) => {
  if (!selectedHeroEquipment.value || !selectedHeroEquipment.value[partId]) {
    return [];
  }
  const quenches = selectedHeroEquipment.value[partId].quenches || {};
  const slotList = [];
  const slotKeys = Object.keys(quenches).sort((a, b) => Number(a) - Number(b));

  for (const key of slotKeys) {
    const slotId = Number(key);
    const slot = quenches[key];
    slotList.push({
      id: slotId,
      attrId: slot.attrId || null,
      attrNum: slot.attrNum || 0,
      isLocked: slot.isLocked || slot.locked || false,
      colorId: slot.colorId || 0,
    });
  }

  return slotList;
};

const refineEquipmentParts = computed(() => {
  if (!selectedHeroEquipment.value)
    return [];

  return [1, 2, 3, 4].map((partId) => ({
    id: partId,
    name: partMap[partId],
    level: selectedHeroEquipment.value[partId]?.level || 0,
    hasEquipment: Boolean(selectedHeroEquipment.value[partId]),
    bonus: getEquipBonus(partId),
    bonusLabel: partId === 1 ? "攻击" : partId === 3 ? "防御" : "血量",
    slots: getEquipSlots(partId).map((slot) => ({
      ...slot,
      attrName: slot.attrId ? getAttrName(slot.attrId) : null,
    })),
  }));
});

const exchangeHeroName = computed(() =>
  getHeroName(exchangeHero.value?.heroId)
  || `武将${exchangeHero.value?.heroId || ""}`,
);

const showHeroRefineModal = async (hero) => {
  refineModalTitle.value = `${getHeroName(hero.heroId) || `武将${hero.heroId}`} - 装备洗练`;
  refineModalVisible.value = true;
  refineModalLoading.value = true;
  selectedHeroEquipment.value = null;

  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    refineModalLoading.value = false;
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法获取装备信息");
    refineModalLoading.value = false;
    return;
  }

  try {
    const heroData = allHeroesData.value[String(hero.heroId)];
    if (heroData?.equipment) {
      selectedHeroEquipment.value = heroData.equipment;
    } else {
      const roleInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        {},
      );
      const role = roleInfo?.role || roleInfo;
      const heroes = role?.heroes || {};
      allHeroesData.value = heroes;

      const currentHero = heroes[String(hero.heroId)];
      selectedHeroEquipment.value = currentHero?.equipment || null;
    }

    if (!selectedHeroEquipment.value) {
      message.warning("未找到该武将的装备数据");
    }
  } catch (error) {
  } finally {
    refineModalLoading.value = false;
  }
  await delay(COMMAND_DELAY);
};

const openExchangeModal = (hero) => {
  exchangeMode.value = "exchange";
  exchangeHero.value = hero;
  exchangeTargetHeroId.value = null;
  heroSearchKeyword.value = "";
  selectedQuality.value = "全部";
  selectedCountry.value = "全部";
  exchangeModalVisible.value = true;
};

const openAddHeroModal = () => {
  if (editingHeroes.value.length >= 5) {
    message.warning("阵容已满，无法上阵更多英雄");
    return;
  }
  exchangeMode.value = "add";
  exchangeHero.value = null;
  exchangeTargetHeroId.value = null;
  heroSearchKeyword.value = "";
  selectedQuality.value = "全部";
  selectedCountry.value = "全部";
  exchangeModalVisible.value = true;
};

const selectExchangeHeroById = (heroId) => {
  exchangeTargetHeroId.value = heroId;
};

const confirmHeroAction = () => {
  if (!exchangeTargetHeroId.value) {
    message.warning("请选择武将");
    return;
  }

  if (Object.keys(editingTeamHeroes.value).length === 0) {
    currentTeamHeroes.value.forEach((h) => {
      editingTeamHeroes.value[h.position] = {
        heroId: h.heroId,
        level: h.level || null,
        artifactId: h.artifactId || null,
        attachmentUid: h.attachmentUid || null,
      };
    });
  }

  if (exchangeMode.value === "add") {
    const slot = getFirstEmptySlot();
    const targetHeroData
      = roleHeroesData.value[String(exchangeTargetHeroId.value)];
    const currentTeamHeroInfo = currentTeamInfo.value?.[slot];
    editingTeamHeroes.value[slot] = {
      heroId: exchangeTargetHeroId.value,
      level: currentTeamHeroInfo?.level || targetHeroData?.level || null,
      artifactId: targetHeroData?.artifactId || null,
      attachmentUid: targetHeroData?.attachmentUid || null,
    };
    message.success(
      `${getHeroName(exchangeTargetHeroId.value)} 已上阵到位置 ${slot + 1}`,
    );
  } else {
    if (!exchangeHero.value) {
      message.warning("请选择要更换的武将");
      return;
    }
    const originalArtifactId = exchangeHero.value.artifactId;
    const originalAttachmentUid = exchangeHero.value.attachmentUid;
    const targetHeroData
      = roleHeroesData.value[String(exchangeTargetHeroId.value)];
    editingTeamHeroes.value[exchangeHero.value.position] = {
      heroId: exchangeTargetHeroId.value,
      level: targetHeroData?.level || null,
      artifactId: originalArtifactId,
      attachmentUid: originalAttachmentUid,
    };
    message.success(
      `已将 ${getHeroName(exchangeHero.value.heroId)} 更换为 ${getHeroName(exchangeTargetHeroId.value)}`,
    );
  }

  exchangeModalVisible.value = false;
};

const removeHero = (hero) => {
  if (Object.keys(editingTeamHeroes.value).length === 0) {
    currentTeamHeroes.value.forEach((h) => {
      editingTeamHeroes.value[h.position] = {
        heroId: h.heroId,
        level: h.level || null,
        artifactId: h.artifactId || null,
        attachmentUid: h.attachmentUid || null,
      };
    });
  }

  delete editingTeamHeroes.value[hero.position];
  message.success(`${getHeroName(hero.heroId)} 已下阵`);
};

const onDragStart = (event, hero) => {
  draggedHeroId.value = hero.heroId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(hero));
};

const onDragEnd = () => {
  draggedHeroId.value = null;
  dragOverPosition.value = null;
};

const onDragOver = (event, hero) => {
  if (draggedHeroId.value !== hero.heroId) {
    dragOverPosition.value = hero.position;
  }
};

const onDragLeave = () => {
  dragOverPosition.value = null;
};

const onDrop = (event, targetHero) => {
  event.preventDefault();
  dragOverPosition.value = null;

  if (!draggedHeroId.value || draggedHeroId.value === targetHero.heroId) {
    return;
  }

  const draggedHero = editingHeroes.value.find(
    (h) => h.heroId === draggedHeroId.value,
  );
  if (!draggedHero)
    return;

  if (Object.keys(editingTeamHeroes.value).length === 0) {
    currentTeamHeroes.value.forEach((h) => {
      editingTeamHeroes.value[h.position] = {
        heroId: h.heroId,
        level: h.level || null,
        artifactId: h.artifactId || null,
        attachmentUid: h.attachmentUid || null,
      };
    });
  }

  const draggedPos = draggedHero.position;
  const targetPos = targetHero.position;

  const draggedHeroData = editingTeamHeroes.value[draggedPos];
  const targetHeroData = editingTeamHeroes.value[targetPos];

  editingTeamHeroes.value[draggedPos] = targetHeroData;
  editingTeamHeroes.value[targetPos] = draggedHeroData;

  message.success(
    `已将 ${getHeroName(draggedHero.heroId)} 与 ${getHeroName(targetHero.heroId)} 交换位置`,
  );

  draggedHeroId.value = null;
};

const showTechModal = (lineup) => {
  selectedTechData.value = lineup.legionResearch || null;
  techModalVisible.value = true;
};

const toggleSavedLineup = (index) => {
  const lineup = savedLineups.value[index];
  if (lineup)
    toggleLineupExpand(lineup);
};

const showSavedLineupTech = (index) => {
  const lineup = savedLineups.value[index];
  if (lineup)
    showTechModal(lineup);
};

const applySavedLineup = (index) => {
  const lineup = savedLineups.value[index];
  if (!lineup)
    return;
  void applyLineup(lineup);
  savedLineupsModalVisible.value = false;
};
</script>

<style scoped lang="scss">
.lineup-saver {
  min-height: 300px;
}

.lineup-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.toolbar {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.quick-switch-section {
  h4 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
}

.team-selector {
  display: flex;
  gap: var(--spacing-xs);
}
</style>
