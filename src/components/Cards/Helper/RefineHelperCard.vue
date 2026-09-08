<template>
  <RefineHelperPanel
    :attr-name="getAttrName"
    :attr-options="attrOptions"
    :color-jade-count="colorJadeCount"
    :delay="delay"
    :equip-bonus-name="equipBonusName"
    :equip-bonus-value="equipBonusValue"
    :equip-parts="equipParts"
    :hero-dictionary="HERO_DICT"
    :heroes="heroes"
    :jade-count="jadeCount"
    :loading="loading"
    :password="password"
    :password-error="passwordError"
    :password-validated="isPasswordValidated"
    :quench-count="quenchCount"
    :quench-times="quenchTimes"
    :selected-hero-id="selectedHeroId"
    :selected-part="selectedPart"
    :slots="slots"
    :state="state"
    :target-conditions="targetConditions"
    :verifying="isVerifying"
    @add-condition="addCondition"
    @quench-continuous="quenchContinuous"
    @quench-once="quenchOnce"
    @refresh="refreshHeroes"
    @remove-condition="removeCondition"
    @reset-count="resetCount"
    @reset-password="resetPasswordValidation"
    @select-hero="selectHero"
    @select-part="selectPart"
    @start-auto-quench="startAutoQuench"
    @stop-quench="stopQuench"
    @toggle-slot="toggleSlot"
    @update-condition="updateCondition"
    @update-delay="delay = $event"
    @update-password="updatePassword"
    @verify-password="verifyPassword"
  ></RefineHelperPanel>
</template>

<script setup>
import { computed, ref } from "vue";
import { useMessage } from "naive-ui";
import RefineHelperPanel from "@/components/Cards/Helper/RefineHelperPanel.vue";
import { useTokenStore } from "@/stores/tokenStore";
import { HERO_DICT } from "@/utils/heroList";
import {
  buildRefineHeroList,
  getEquipFromQuenchResult,
  hasHighQualityRefine,
  matchesRefineConditions,
  normalizeRefineSlots,
  parsePresetTeamData,
  REFINE_ATTR_MAP,
  REFINE_PART_MAP,
} from "@/utils/refineHelper";

const tokenStore = useTokenStore();
const message = useMessage();

// 响应式数据
const loading = ref(false);
const heroes = ref([]);
const selectedHeroId = ref(null);
const selectedPart = ref(null);
const quenchCount = ref(0);
const delay = ref(350);
// 将单个条件改为数组形式，支持多个条件
const targetConditions = ref([{
  attrId: null,
  attrValue: null,
}]);
const jadeCount = ref(0);
const colorJadeCount = ref(0);
// 密码验证相关
const password = ref("");
const isPasswordValidated = ref(false);
const passwordError = ref("");
const isVerifying = ref(false);

// 状态
const state = ref({
  isRunning: false,
  continuousQuenching: false,
  autoQuenching: false,
  stopRequested: false,
});

// WebSocket相关
let continuousTimer = null;
let autoTimer = null;

// 英雄数据
const allHeroesData = ref({});
const heroEquipment = ref({});
const slots = ref([]);
const quenchTimes = ref(0);
const equipBonusName = ref("攻击");
const equipBonusValue = ref(0);

// 属性选项
const attrOptions = computed(() => {
  return Object.entries(REFINE_ATTR_MAP).map(([id, name]) => ({
    label: name,
    value: Number(id),
  }));
});

// 装备部位列表
const equipParts = computed(() => {
  if (!heroEquipment.value)
    return [];
  return Object.entries(heroEquipment.value).map(([id, equip]) => ({
    id: Number(id),
    name: REFINE_PART_MAP[Number(id)] || `装备${id}`,
    level: equip?.level || 1,
  }));
});

// 刷新阵容
const refreshHeroes = async () => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法刷新阵容");
    return;
  }

  loading.value = true;
  try {
    // 获取预设队伍信息和角色信息
    const [presetTeamInfo, roleInfo] = await Promise.all([
      tokenStore.sendMessageWithPromise(tokenId, "presetteam_getinfo", {}),
      tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}),
    ]);

    const teamData = parsePresetTeamData(presetTeamInfo);
    const role = roleInfo?.role || roleInfo;
    const heroData = role?.heroes || {};
    const items = role?.items || {};

    jadeCount.value = items["1022"]?.quantity || 0;
    colorJadeCount.value = items["1023"]?.quantity || 0;
    heroes.value = buildRefineHeroList(teamData, heroData, HERO_DICT);
    allHeroesData.value = heroData;

    message.success("阵容刷新成功");
  } catch (error) {
    message.error(`刷新阵容失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 选择英雄
const selectHero = (heroId) => {
  selectedHeroId.value = heroId;
  selectedPart.value = null;
  quenchCount.value = 0;

  // 获取英雄装备
  const heroDetail = allHeroesData.value[String(heroId)] || {};
  heroEquipment.value = heroDetail?.equipment || {};
};

// 选择装备部位
const selectPart = (partId) => {
  selectedPart.value = partId;
  quenchCount.value = 0;

  // 获取装备详情
  const equip = heroEquipment.value[partId];
  if (equip) {
    // 更新洗练次数和加成
    quenchTimes.value = equip.quenchTimes || 0;

    // 根据部位类型更新加成名称
    const bonusType
      = partId === 1
        ? "quenchAttackExt"
        : partId === 3
          ? "quenchDefenseExt"
          : "quenchHpExt";
    equipBonusName.value
      = partId === 1 ? "攻击" : partId === 3 ? "防御" : "血量";
    equipBonusValue.value = equip[bonusType] || 0;

    // 更新孔位信息
    updateSlots(equip.quenches || {});
  } else {
    quenchTimes.value = 0;
    equipBonusValue.value = 0;
    slots.value = [];
  }
};

// 更新孔位信息
const updateSlots = (quenches) => {
  slots.value = normalizeRefineSlots(quenches);
};

// 获取属性名称
const getAttrName = (attrId) => {
  return REFINE_ATTR_MAP[attrId] || `属性${attrId}`;
};

// 密码验证
const verifyPassword = async () => {
  if (!password.value) {
    passwordError.value = "请输入密码";
    return;
  }

  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法验证密码");
    return;
  }

  isVerifying.value = true;
  passwordError.value = "";

  try {
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_commitpassword",
      {
        password: password.value,
        passwordType: 1,
      },
    );

    isPasswordValidated.value = true;
    message.success("密码验证成功");
  } catch (error) {
    passwordError.value = `验证失败: ${error.message}`;
    message.error(`密码验证失败: ${error.message}`);
  } finally {
    isVerifying.value = false;
  }
};

// 重置密码验证
const resetPasswordValidation = () => {
  isPasswordValidated.value = false;
  password.value = "";
  passwordError.value = "";
};

// 处理孔位锁定
const handleSlotLock = async (slotId, isLocked) => {
  const token = tokenStore.selectedToken;
  if (!token || !selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备");
    return;
  }

  // 解锁时需要验证密码
  if (!isLocked && !isPasswordValidated.value) {
    message.warning("请先验证二级密码以解锁孔位");
    // 恢复锁定状态
    const slot = slots.value.find((s) => s.id === slotId);
    if (slot) {
      slot.isLocked = true;
    }
    return;
  }

  const tokenId = token.id;
  try {
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "equipment_updatequenchlock",
      {
        heroId: selectedHeroId.value,
        part: selectedPart.value,
        slot: slotId,
        isLocked,
      },
    );

    // 更新孔位状态
    const slot = slots.value.find((s) => s.id === slotId);
    if (slot) {
      slot.isLocked = isLocked;
    }

    message.success(isLocked ? "孔位已锁定" : "孔位已解锁");
  } catch (error) {
    message.error(`锁定孔位失败: ${error.message}`);
  }
};

const toggleSlot = (slotId, isLocked) => {
  const slot = slots.value.find((item) => item.id === slotId);
  if (slot)
    slot.isLocked = isLocked;
  handleSlotLock(slotId, isLocked);
};

// 淬炼一次
const quenchOnce = async () => {
  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  await executeQuench();
};

// 连续淬炼
const quenchContinuous = () => {
  if (state.value.continuousQuenching)
    return;

  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  state.value.continuousQuenching = true;
  state.value.isRunning = true;
  message.info("开始连续淬炼，出现橙色或红色属性时自动暂停");

  const continuousQuench = async () => {
    if (!state.value.continuousQuenching)
      return;

    try {
      const result = await executeQuench();
      if (result && checkHighQualityAttr(result)) {
        message.success("发现橙色或红色属性，已自动暂停");
        stopQuench();
        return;
      }

      // 随机延迟
      const randomDelay = Math.floor(Math.random() * 150) + delay.value;
      continuousTimer = setTimeout(continuousQuench, randomDelay);
    } catch (error) {
      message.error(`连续淬炼失败: ${error.message}`);
      stopQuench();
    }
  };

  continuousQuench();
};

// 添加条件
const addCondition = () => {
  targetConditions.value.push({
    attrId: null,
    attrValue: null,
  });
};

// 删除条件
const removeCondition = (index) => {
  if (targetConditions.value.length <= 1) {
    message.warning("至少需要保留一个条件");
    return;
  }
  targetConditions.value.splice(index, 1);
};

// 自动淬炼
const startAutoQuench = () => {
  // 检查是否有有效的条件
  const hasValidCondition = targetConditions.value.some((condition) =>
    condition.attrId !== null && condition.attrValue !== null,
  );

  if (!hasValidCondition) {
    message.warning("请至少设置一个有效的目标属性和数值");
    return;
  }

  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  state.value.autoQuenching = true;
  state.value.isRunning = true;

  // 生成条件描述
  const conditionDescriptions = targetConditions.value
    .filter((condition) => condition.attrId && condition.attrValue)
    .map((condition) => `${getAttrName(condition.attrId)} ≥ ${condition.attrValue}`);

  message.info(
    `开始自动淬炼，目标：${conditionDescriptions.join(" 或 ")}`,
  );

  const autoQuench = async () => {
    if (!state.value.autoQuenching)
      return;

    try {
      const result = await executeQuench();
      if (result && checkTargetAttr(result)) {
        message.success(
          `已达到目标条件，自动淬炼已停止`,
        );
        stopQuench();
        return;
      }

      // 随机延迟
      const randomDelay = Math.floor(Math.random() * 150) + delay.value;
      autoTimer = setTimeout(autoQuench, randomDelay);
    } catch (error) {
      message.error(`自动淬炼失败: ${error.message}`);
      stopQuench();
    }
  };

  autoQuench();
};

// 执行淬炼
const executeQuench = async () => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return null;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法执行淬炼");
    return null;
  }

  // 检查武器等级（如果是武器）
  if (selectedPart.value === 1) {
    const equip = heroEquipment.value[selectedPart.value];
    if (equip?.level < 4000) {
      message.warning(
        `武器等级不足，需要4000级以上（当前${equip?.level || 0}级）`,
      );
      return null;
    }
  }

  try {
    // 获取当前孔位信息
    const currentEquip = heroEquipment.value[selectedPart.value];
    if (!currentEquip?.quenches) {
      message.error("未获取到装备孔位信息");
      return null;
    }

    // 检查是否有孔位的attrNum值超过50且未被锁定
    const highAttrSlots = Object.values(currentEquip.quenches).filter((slot) =>
      slot.attrNum > 50 && !slot.isLocked,
    );
    const hasHighAttrSlot = highAttrSlots.length > 0;

    // 如果有高属性孔位且未锁定，先发送equipment_confirm命令
    let seedFromConfirm = 0;
    if (hasHighAttrSlot) {
      // 构建确认请求参数
      const confirmParams = {
        heroId: selectedHeroId.value,
        part: selectedPart.value,
        quenchId: 0,
        quenches: currentEquip.quenches,
      };

      // 发送确认请求并获取响应
      const confirmResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "equipment_confirm",
        confirmParams,
        15000,
      );

      // 从确认响应中提取seed值 - WebSocket客户端已返回body部分
      if (confirmResult?.role?.heroes) {
        // 处理响应格式1: role.heroes[heroId].equipment[part].seed
        const hero = confirmResult.role.heroes[String(selectedHeroId.value)];
        if (hero?.equipment?.[selectedPart.value]?.seed) {
          seedFromConfirm = hero.equipment[selectedPart.value].seed;
          console.log("✅ 从Equipment_ConfirmResp中提取seed:", seedFromConfirm);
        }
      } else if (confirmResult?.seed) {
        // 处理响应格式2: seed直接在body中
        seedFromConfirm = confirmResult.seed;
        console.log("✅ 从Equipment_ConfirmResp的body中提取seed:", seedFromConfirm);
      } else if (confirmResult?.equipment?.seed) {
        // 处理响应格式3: equipment.seed
        seedFromConfirm = confirmResult.equipment.seed;
        console.log("✅ 从Equipment_ConfirmResp的equipment中提取seed:", seedFromConfirm);
      } else {
        // 所有格式都未匹配，记录完整响应以便调试
        console.log("❌ 未能从Equipment_ConfirmResp中提取seed，响应内容:", JSON.stringify(confirmResult));
      }
    }

    // 构建淬炼制请求参数
    const quenchParams = {
      heroId: selectedHeroId.value,
      part: selectedPart.value,
      quenchId: 0,
      quenches: currentEquip.quenches,
      seed: seedFromConfirm,
      skipOrange: false,
    };

    // 发送淬炼请求（设置更长的超时时间，淬炼操作可能较慢）
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "equipment_quench",
      quenchParams,
      15000,
    );

    // 更新淬炼次数
    quenchCount.value++;

    // 更新装备信息 - 处理不同格式的响应
    let updatedEquip = null;

    // 处理1: Equipment_QuenchResp响应直接包含装备数据
    if (result?.equipment) {
      updatedEquip = result.equipment;
    } else if (result?.role?.heroes) {
      // 处理2: 响应包含角色英雄数据
      const updatedHero = result.role.heroes[String(selectedHeroId.value)];
      if (updatedHero?.equipment) {
        updatedEquip = updatedHero.equipment[selectedPart.value];
      }
    } else if (result?.quenches) {
      // 处理3: 响应直接包含淬炼制结果
      // 基于现有装备创建更新后的装备对象
      updatedEquip = {
        ...heroEquipment.value[selectedPart.value],
        quenches: result.quenches,
        quenchTimes: (heroEquipment.value[selectedPart.value].quenchTimes || 0) + 1,
      };
    }

    // 如果获取到了更新的装备数据，更新界面
    if (updatedEquip) {
      // 更新装备对象
      heroEquipment.value[selectedPart.value] = updatedEquip;

      // 更新淬炼次数和加成
      quenchTimes.value = updatedEquip.quenchTimes || 0;
      const bonusType
        = selectedPart.value === 1
          ? "quenchAttackExt"
          : selectedPart.value === 3
            ? "quenchDefenseExt"
            : "quenchHpExt";
      equipBonusValue.value = updatedEquip[bonusType] || 0;

      // 更新孔位信息
      if (updatedEquip.quenches) {
        updateSlots(updatedEquip.quenches);
      }
    }

    // 更新白玉和彩玉数量
    if (result?.role?.items) {
      const items = result.role.items;
      jadeCount.value = items["1022"]?.quantity || jadeCount.value;
      colorJadeCount.value = items["1023"]?.quantity || colorJadeCount.value;
    }

    return result;
  } catch (error) {
    message.error(`淬炼失败: ${error.message}`);
    return null;
  }
};

// 从响应中获取最新的装备数据
const getEquipFromResult = (result) => getEquipFromQuenchResult({
  currentEquip: heroEquipment.value[selectedPart.value],
  heroId: selectedHeroId.value,
  partId: selectedPart.value,
  result,
});

const checkHighQualityAttr = (result) =>
  hasHighQualityRefine(getEquipFromResult(result));

const checkTargetAttr = (result) =>
  matchesRefineConditions(getEquipFromResult(result), targetConditions.value);

const updateCondition = (index, field, value) => {
  const condition = targetConditions.value[index];
  if (condition)
    condition[field] = value;
};

const updatePassword = (value) => {
  password.value = value;
  passwordError.value = "";
};

// 停止淬炼
const stopQuench = () => {
  state.value.continuousQuenching = false;
  state.value.autoQuenching = false;
  state.value.isRunning = false;

  if (continuousTimer) {
    clearTimeout(continuousTimer);
    continuousTimer = null;
  }

  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }

  message.success("淬炼已停止");
};

// 重置淬炼次数
const resetCount = () => {
  quenchCount.value = 0;
  message.success("本次洗练计数已清零");
};
</script>
