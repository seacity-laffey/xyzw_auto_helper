<template>
  <div class="fight-pvp-container">
    <!-- 主卡片容器 -->
    <div class="status-card main-card">
      <!-- 卡片头部 -->
      <div class="card-header">
        <img
          alt="切磋图标"
          class="status-icon"
          src="/icons/Ob7pyorzmHiJcbab2c25af264d0758b527bc1b61cc3b.png"
        >
        <div class="status-info">
          <h3>切磋系统</h3>
          <p>查询对手信息并进行切磋</p>
        </div>
      </div>

      <!-- 操作区域 -->
      <div class="action-section">
        <div class="input-group">
          <n-input
            class="target-input"
            placeholder="请输入对手ID"
            size="medium"
            type="text"
            v-model:value="targetId"
          ></n-input>
          <n-button
            size="medium"
            type="primary"
            :disabled="loading1 || !targetId"
            @click="getTargetInfo"
          >
            <template #icon>
              <n-icon>
                <Refresh></Refresh>
              </n-icon>
            </template>
            查询对手
          </n-button>
        </div>

        <div class="fight-options">
          <div class="option-item">
            <span class="option-label">切磋次数：</span>
            <n-select
              allow-create
              filterable
              tag
              class="fight-count-select"
              placeholder="请选择或输入切磋次数"
              size="medium"
              v-model:value="fightNum"
              :options="options"
              @update:value="handleFightNumChange"
            ></n-select>
          </div>

          <div class="option-actions">
            <n-button
              size="medium"
              type="success"
              :disabled="loading1 || !targetId || !memberData"
              @click="fightPVPRefresh"
            >
              <template #icon>
                <n-icon>
                  <Trophy></Trophy>
                </n-icon>
              </template>
              开始切磋
            </n-button>

            <n-button
              size="medium"
              type="default"
              :disabled="loading1 || !memberData"
              @click="handleExport1"
            >
              <template #icon>
                <n-icon>
                  <Copy></Copy>
                </n-icon>
              </template>
              导出数据
            </n-button>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading1" class="loading-section">
        <n-spin size="large">
          <template #description>
            {{ loadingText }}
          </template>
        </n-spin>
      </div>

      <!-- 对手信息卡片 -->
      <div ref="exportDom" v-else-if="memberData" class="content-section">
        <FightPvpOpponentPanel
          :legacy-colors="legacyColorMap"
          :member="memberData"
          @select-hero="selectHeroInfo"
        ></FightPvpOpponentPanel>
        <FightPvpResultPanel
          v-if="fightResult"
          :fight-num="fightNum"
          :result="fightResult"
        ></FightPvpResultPanel>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <n-empty description="请输入对手ID并点击查询按钮获取对手信息"></n-empty>
      </div>
    </div>

    <ClubHeroDetailDialog
      v-model:open="showHeroModal"
      :hero="heroModealTemp"
    ></ClubHeroDetailDialog>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { Copy, Refresh, Trophy } from "@vicons/ionicons5";
import ClubHeroDetailDialog from "@/components/Club/ClubHeroDetailDialog.vue";
import FightPvpOpponentPanel from "./FightPvpOpponentPanel.vue";
import FightPvpResultPanel from "./FightPvpResultPanel.vue";
import html2canvas from "html2canvas";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import { formatWeapon, HERO_DICT, HeroFillInfo, legacycolor } from "@/utils/heroList";
import { extractClubHeroInfo } from "@/utils/clubPlayerInfo";
import { useTokenStore } from "@/stores/tokenStore";

// 确保legacycolor在模板中可用
const legacyColorMap = legacycolor;

const message = useMessage();
const tokenStore = useTokenStore();

const exportDom = ref(null);
const loading1 = ref(false);
const loadingText = ref("正在查询对手信息...");
const targetId = ref("");
// 切磋对手信息
const memberData = ref(null);
// 批量数量
const fightNum = ref(1);
// 战斗结果
const fightResult = ref(null);

// 监听targetId变化，清除之前的切磋结果
watch(targetId, (newId, oldId) => {
  if (newId !== oldId) {
    fightResult.value = null;
  }
});
// 模态框控制符
const showHeroModal = ref(false);
// 选中的武将信息
const heroModealTemp = ref(null);
const options = [
  {
    label: "1",
    value: 1,
  },
  {
    label: "10",
    value: 10,
  },
  {
    label: "25",
    value: 25,
  },
  {
    label: "50",
    value: 50,
  },
];
const selectHeroInfo = (heroInfo) => {
  showHeroModal.value = true;
  heroModealTemp.value = heroInfo;
};
// 格式化战力
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

// 切磋
const fetchfightPVP = async () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法查询战绩");
    return;
  }

  loading1.value = true;
  loadingText.value = "正在进行切磋，请稍候...";

  try {
    let winCount = 0;
    let ourTotalDieHeroCount = 0; // 我方总掉落将领数
    let enemyTotalDieHeroCount = 0; // 敌方总掉落将领数
    const resultCount = [];
    for (let i = 0; i < fightNum.value; i++) {
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        "fight_startpvp",
        {
          targetId: targetId.value,
        },
        5000,
      );
      if (!result.battleData) {
        fightResult.value = null;
        message.warning("切磋错误");
        return;
      }
      // 处理掉将情况
      let leftCount = 0;
      result.battleData.result.sponsor.teamInfo.forEach((item) => {
        if (item.hp === 0) {
          leftCount++;
        }
      });
      ourTotalDieHeroCount += leftCount;

      let rightCount = 0;
      result.battleData.result.accept.teamInfo.forEach((item) => {
        if (item.hp === 0) {
          rightCount++;
        }
      });
      enemyTotalDieHeroCount += rightCount;

      const tempObj = {
        leftName: result.battleData.leftTeam.name,
        leftheadImg: result.battleData.leftTeam.headImg,
        leftpower: formatPower(result.battleData.leftTeam.power),
        rightName: result.battleData.rightTeam.name,
        rightheadImg: result.battleData.rightTeam.headImg,
        rightpower: formatPower(result.battleData.rightTeam.power),
        // 掉将情况
        leftDieHero: leftCount,
        rightDieHero: rightCount,
        isWin: !!result.battleData.result.isWin, // 对战结果
      };
      if (result.battleData.result.isWin) {
        winCount++;
      }
      resultCount.push(tempObj);
    }
    const teamData = {
      winCount,
      ourTotalDieHeroCount,
      enemyTotalDieHeroCount,
      resultCount,
    };
    fightResult.value = teamData;
    message.success("切磋完成");
    return teamData;
  } catch (error) {
    message.error(`查询失败: ${error.message}`);
  } finally {
    loading1.value = false;
    loadingText.value = "正在查询对手信息...";
  }
};

// 查询
const fetchTargetInfo = async () => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法查询战绩");
    return;
  }

  // 清除之前的切磋结果
  fightResult.value = null;

  loading1.value = true;
  loadingText.value = "正在查询对手信息...";

  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId: targetId.value,
      },
      5000,
    );

    if (!result.roleInfo && !result.legionInfo) {
      memberData.value = null;
      message.warning("未查询到对手信息");
      return;
    }
    const teamData = {};
    const heroAndholdAndRed = extractClubHeroInfo(result.roleInfo.heroes, HERO_DICT);
    // 处理鱼灵信息
    const fishInfo = HeroFillInfo(result.roleInfo);
    // 将鱼灵信息添加到英雄列表中
    heroAndholdAndRed.heroList.forEach((hero) => {
      hero.PearlInfo = fishInfo[hero.artifactId] || {};
      hero.power = formatPower(hero.power);
    });
    // 俱乐部名称
    teamData.legionName = result.legionInfo?.name || "无俱乐部";
    // 俱乐部当前红数
    teamData.legionRed
      = result.legionInfo?.statistics?.["battle:red:quench"] || "无";
    // 俱乐部历史最高红数
    teamData.legionMaxRed = result.legionInfo?.statistics?.["red:quench"] || "无";
    // 俱乐部历史最高战力
    teamData.MaxPower = formatPower(
      result.legionInfo?.statistics?.["max:power"] || "0",
    );
    // 切磋对手武将信息
    teamData.heroList = heroAndholdAndRed.heroList;
    // 切磋对手玩家头像
    teamData.headImg = result.roleInfo.headImg;
    teamData.lordWeaponId = formatWeapon(result.roleInfo.lordWeaponId);
    // 切磋对手玩家名称
    teamData.name = result.roleInfo.name;
    teamData.power = formatPower(result.roleInfo.power);
    teamData.serverName = result.roleInfo.serverName;
    teamData.hole = heroAndholdAndRed.holeCount;
    teamData.red = heroAndholdAndRed.redCount;
    teamData.legacy = result.roleInfo.legacy?.color || 0; // 功法等级
    memberData.value = teamData;
    message.success("对手信息加载成功");
    return teamData;
  } catch (error) {
    message.error(`查询失败: ${error.message}`);
  } finally {
    loading1.value = false;
    loadingText.value = "正在查询对手信息...";
  }
};

// 刷新战绩
const fightPVPRefresh = () => {
  fetchfightPVP();
};

// 处理切磋次数变化
const handleFightNumChange = (value) => {
  // 确保输入的是有效的数字
  if (typeof value === "string") {
    // 如果是字符串，转换为数字
    const num = Number.parseInt(value, 10);
    // 确保数字有效且大于0,尽量限制最大次数,万一谁请求打多了,可不是什么好事情
    if (!Number.isNaN(num) && num > 0 && num <= 50) {
      fightNum.value = num;
    } else {
      // 否则重置为默认值1
      fightNum.value = 1;
    }
  } else {
    if (value > 0 && value <= 50) {
      // 如果已经是数字类型，直接使用
      fightNum.value = value;
    } else {
      fightNum.value = 1;
    }
  }
};

// 获取对手信息
const getTargetInfo = () => {
  fetchTargetInfo();
};

const handleExport1 = async () => {
  // 校验：确保DOM已正确绑定
  if (!exportDom.value) {
    message.error("未找到要导出的内容");
    return;
  }

  try {
    // 获取结果列表元素
    const resultList = exportDom.value.querySelector(".result-list");
    let originalMaxHeight = "";
    let originalOverflow = "";
    let originalPaddingRight = "";

    // 临时移除结果列表的高度限制，让所有结果都可见
    if (resultList) {
      originalMaxHeight = resultList.style.maxHeight;
      originalOverflow = resultList.style.overflowY;
      originalPaddingRight = resultList.style.paddingRight;

      resultList.style.maxHeight = "none";
      resultList.style.overflowY = "visible";
      resultList.style.paddingRight = "0";
    }

    // 等待DOM更新
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 生成canvas并导出
    const canvas = await html2canvas(exportDom.value, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片（若DOM内有远程图片，需开启）
      backgroundColor: "#ffffff", // 避免透明背景（默认透明）
      logging: false, // 关闭控制台日志
      allowTaint: true, // 允许跨域图片
      taintTest: false, // 关闭跨域测试
    });

    // 恢复原始样式
    if (resultList) {
      resultList.style.maxHeight = originalMaxHeight;
      resultList.style.overflowY = originalOverflow;
      resultList.style.paddingRight = originalPaddingRight;
    }

    downloadCanvasAsImage(canvas, "切磋结果.png");
  } catch (err) {
    console.error("导出图片失败:", err);
    message.error("导出图片失败，请重试");
  }
};

// 暴露方法给父组件
defineExpose({
  fetchfightPVP,
});
</script>

<style scoped lang="scss">
.fight-pvp-container {
  width: 100%;
  // padding: 16px;
}

.main-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-xl);
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.main-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.card-header .status-icon {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 12px;
  margin-right: 16px;
}

.card-header .status-info {
  flex: 1;
}

.card-header .status-info h3 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-header .status-info p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.action-section {
  margin-bottom: 24px;
}

.action-section .input-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.action-section .input-group .target-input {
  flex: 1;
}

.action-section .fight-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.action-section .fight-options .option-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-section .fight-options .option-item .option-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.action-section .fight-options .option-item .fight-count-select {
  width: 120px;
}

.action-section .fight-options .option-actions {
  display: flex;
  gap: 12px;
}

.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
}

.empty-state {
  padding: 40px 20px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
  text-align: center;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .action-section .fight-options {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .main-card {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .action-section .input-group {
    flex-direction: column;
  }
}
</style>
