<template>
  <div class="legion-war-map-container">
    <div class="legion-war-map-card">
      <div v-if="!isAccessible" class="access-denied-container">
        <n-result
          description="该功能仅在特定时间开放"
          status="403"
          title="暂未开放"
        >
          <template #footer>
            <div class="access-denied-info">
              <p>开放时间：</p>
              <p>1. 每月前四周的周六 19:55 - 21:00</p>
              <p>2. 每月第四周的周日 19:55 - 21:30</p>
              <p>3. 2026年3月年赛特殊开放</p>
            </div>
          </template>
        </n-result>
      </div>
      <template v-else>
        <!-- 头部信息区 -->
        <div class="header-section">
          <div class="header-left">
            <img
              alt="盐场图标"
              class="header-icon"
              src="/icons/moonPalace.png"
            >
            <div class="header-title">
              <h2>盐场实时地图</h2>
              <p>获取盐场位置分布</p>
            </div>
          </div>

          <!-- 数据统计区 -->
          <div class="stats-section">
            <div class="stat-item">
              <span class="stat-label">连接状态:</span>
              <n-tag :type="isConnected ? 'success' : 'error'">
                {{ isConnected ? "已连接" : "未连接" }}
              </n-tag>
            </div>
            <div class="stat-item">
              <span class="stat-label">战场数据:</span>
              <n-tag :type="battlefieldId ? 'success' : 'error'">{{
                battlefieldId ? "已成功获取战场数据" : "未获取到战场数据"
              }}</n-tag>
            </div>
            <div class="stat-item">
              <n-button
                size="small"
                :loading="connecting"
                :type="isEntireBattlefield ? 'success' : 'warning'"
                @click="toggleBattlefieldEntry"
              >
                <template #icon>
                  <n-icon>
                    <LogInOutline ></LogInOutline>
                  </n-icon>
                </template>
                {{ isEntireBattlefield ? "已进入战场" : "进入战场" }}
              </n-button>
              <n-button
                size="small"
                style="margin-right: 8px"
                type="primary"
                :disabled="!isConnected && !isEntireBattlefield"
                @click="refreshData"
              >
                <template #icon>
                  <n-icon>
                    <RefreshOutline ></RefreshOutline>
                  </n-icon>
                </template>
                刷新数据
              </n-button>
              <n-button
                size="small"
                type="info"
                :disabled="!validData"
                :loading="exporting"
                @click="exportImage"
              >
                <template #icon>
                  <n-icon>
                    <ImageOutline ></ImageOutline>
                  </n-icon>
                </template>
                导出图片
              </n-button>
            </div>
          </div>
        </div>

        <!-- 主要内容区：地图 + 侧边栏 -->
        <div class="main-content-layout">
          <!-- 地图区域 -->
          <div class="map-container-wrapper">
            <div class="map-container">
              <canvas ref="legionWarMapDom" class="mapCanvas"></canvas>
            </div>

            <div v-if="!validData" class="empty-state-overlay">
              <div class="empty-content">
                <template v-if="connecting">
                  <n-spin size="large" ></n-spin>
                  <p>正在连接战场...</p>
                </template>
                <template v-else-if="isConnected">
                  <n-spin size="large" ></n-spin>
                  <p>正在获取地图数据...</p>
                </template>
                <template v-else>
                  <n-icon color="#ccc" size="48">
                    <MapOutline ></MapOutline>
                  </n-icon>
                  <p>暂无地图数据，请手动刷新数据</p>
                </template>
              </div>
            </div>
          </div>

          <!-- 右侧信息栏 -->
          <div
            v-if="validData && sortedLegions.length > 0"
            class="side-info-panel"
          >
            <div class="legion-list">
              <template
                v-for="(group, groupName) in allianceGroups"
                :key="groupName"
              >
                <div v-if="group.length > 0" class="alliance-group">
                  <div class="group-header">
                    <span class="group-name">{{ groupName }}</span>
                    <span class="group-count">({{ group.length }})</span>
                  </div>
                  <div
                    v-for="legion in group"
                    :key="legion.id"
                    class="legion-item"
                    :style="{ borderLeftColor: legion.color }"
                  >
                    <div class="rank-badge">
                      {{ sortedLegions.indexOf(legion) + 1 }}
                    </div>
                    <div class="legion-info">
                      <div class="legion-name" :title="legion.name">
                        <span class="legion-id">[{{ legion.serverId }}]</span>
                        {{ legion.name }}
                      </div>
                      <div class="legion-stats">
                        <span class="stat-red">红: {{ legion.redCount }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { useLegionWarStore } from "@/stores/legionWarStore";
import { roadPointList } from "@/utils/legionWar";
import { renderLegionWarMap } from "@/utils/legionWarMapRenderer.js";
import { getCurrentTimeByFormat } from "@/utils/dateTimeUtils";
import {
  ImageOutline,
  LogInOutline,
  MapOutline,
  RefreshOutline,
} from "@vicons/ionicons5";
import { allianceincludes } from "@/utils/clubWarrankUtils";
import { isLegionWarAccessible } from "@/utils/clubBattleUtils";
import { storeToRefs } from "pinia";
import html2canvas from "html2canvas";

const message = useMessage();
const legionWarStore = useLegionWarStore();

const isAccessible = ref(isLegionWarAccessible());

// Store 状态
const {
  isConnected,
  connecting,
  validData,
  battlefieldId,
  legionDetails,
  isJoined: isEntireBattlefield,
} = storeToRefs(legionWarStore);

// 本地状态
const legionWarMapDom = ref(null);
let resizeHandler = null;

const exporting = ref(false);

const exportImage = async () => {
  const element = document.querySelector(
    ".legion-war-map-card .main-content-layout",
  );
  if (!element) {
    message.error("未找到导出内容");
    return;
  }

  exporting.value = true;
  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      scale: 2, // Higher quality
      backgroundColor: "#ffffff",
      ignoreElements: (el) => el.classList.contains("no-export"),
    });

    const link = document.createElement("a");
    link.download = `盐场地图_${getCurrentTimeByFormat("yyyyMMdd_HHmmss")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    message.success("导出成功");
  } catch (error) {
    console.error("导出失败:", error);
    message.error("导出失败");
  } finally {
    exporting.value = false;
  }
};

// 俱乐部排序
const sortedLegions = computed(() => {
  if (!validData.value || !validData.value.legionInfo)
    return [];

  // 将对象转换为数组并排序
  // 排序规则：红度 > 战力 > ID
  const list = Object.values(validData.value.legionInfo).map((legion) => {
    // 尝试获取公告信息，如果还没有详情则为空
    const detail = legionDetails.value[legion.id] || {};
    // 根据公告判断联盟
    const alliance = detail.announcement
      ? allianceincludes(detail.announcement)
      : "未知联盟";

    // 优先使用详情中的红淬数据
    const redCount
      = detail.quenchNum !== undefined ? detail.quenchNum : legion.redCount;

    return {
      ...legion,
      announcement: detail.announcement || "",
      alliance,
      redCount,
    };
  });

  return list.sort((a, b) => {
    // 1. 红度降序
    if (b.redCount !== a.redCount) {
      return b.redCount - a.redCount;
    }
    // 2. 战力降序 (如果有)
    if (b.power && a.power && b.power !== a.power) {
      return b.power - a.power;
    }
    // 3. ID 升序
    return Number.parseInt(a.id) - Number.parseInt(b.id);
  });
});

// 监听数据变化以重绘地图
watch(
  validData,
  (newVal) => {
    if (newVal) {
      nextTick(() => {
        resizeAndRedraw();
      });
    }
  },
  { deep: true },
);

// 监听联盟详情数据变化以重绘地图（因为颜色依赖于详情中的公告）
watch(
  legionDetails,
  () => {
    nextTick(() => {
      resizeAndRedraw();
    });
  },
  { deep: true },
);

// 监听连接状态变化
watch(isConnected, (newVal) => {
  if (!newVal) {
    // 断开连接后，重新绘制基础地图
    nextTick(() => {
      resizeAndRedraw();
    });
  }
});

// 获取联盟分组的列表
const allianceGroups = computed(() => {
  const groups = {};

  // 初始化分组
  const allianceTypes = [
    "大联盟",
    "梦盟",
    "正义联盟",
    "龙盟",
    "曦盟",
    "未知联盟",
  ];
  allianceTypes.forEach((type) => {
    groups[type] = [];
  });

  // 分配俱乐部到对应分组
  sortedLegions.value.forEach((legion) => {
    const alliance = legion.alliance;
    if (groups[alliance]) {
      groups[alliance].push(legion);
    } else {
      // 如果有其他未定义的类型，归入未知
      groups["未知联盟"].push(legion);
    }
  });

  return groups;
});

const resizeAndRedraw = () =>
  renderLegionWarMap({
    canvas: legionWarMapDom.value,
    data: validData.value,
    legionDetails: legionDetails.value,
    pixelRatio: window.devicePixelRatio || 1,
    resolveAlliance: allianceincludes,
    roadPoints: roadPointList,
  });

const toggleBattlefieldEntry = async () => {
  if (isEntireBattlefield.value) {
    legionWarStore.disconnect(true); // 强制断开
  } else {
    try {
      await legionWarStore.connect();
    } catch (error) {
      message.error(error.message);
    }
  }
};

const refreshData = () => {
  try {
    legionWarStore.refreshData();
    message.success("已发送刷新请求");
  } catch (error) {
    message.warning(error.message);
  }
};

const initializeCanvas = async () => {
  await nextTick();
  if (!legionWarMapDom.value)
    return false;

  if (!resizeHandler) {
    resizeHandler = () => resizeAndRedraw();
    window.addEventListener("resize", resizeHandler);
  }

  return resizeAndRedraw();
};

// 生命周期钩子
onMounted(async () => {
  await initializeCanvas();

  try {
    legionWarStore.connect().catch((e) => {
      console.error("Auto connect failed", e);
    });
  } catch (e) {}
});

watch(isAccessible, async (accessible) => {
  if (accessible) {
    await initializeCanvas();
  }
});

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }
  legionWarStore.disconnect();
});
</script>

<style scoped lang="scss">
.legion-war-map-container {
  padding: 8px;

  .legion-war-map-card {
    background: #fff;
    border-radius: 8px;
    box-shadow:
      0 1px 2px -2px rgba(0, 0, 0, 0.08),
      0 3px 6px 0 rgba(0, 0, 0, 0.06),
      0 5px 12px 4px rgba(0, 0, 0, 0.04);

    .access-denied-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 600px; /* 给个固定高度或者 min-height */
      padding: 40px;
    }

    .access-denied-info {
      margin-top: 16px;
      text-align: left;
      color: #666;

      p {
        margin: 4px 0;
      }
    }

    .header-section {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #eee;
      flex-wrap: wrap;
      gap: 12px;

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;

        .header-icon {
          width: 40px;
          height: 40px;
        }

        .header-title {
          h2 {
            margin: 0;
            font-size: 18px;
            color: #333;
          }
          p {
            margin: 4px 0 0;
            font-size: 12px;
            color: #999;
          }
        }
      }

      .stats-section {
        display: flex;
        gap: 16px;
        align-items: center;

        .stat-item {
          display: flex;
          align-items: center;
          gap: 8px;

          .stat-label {
            font-size: 13px;
            color: #666;
          }
        }
      }
    }

    .main-content-layout {
      position: relative;
      width: 100%;
      height: 960px;
      display: flex;
      overflow: hidden;

      .map-container-wrapper {
        flex: 1;
        height: 100%;
        position: relative;
        background-color: #f5f5f5;
        overflow: hidden;

        .map-container {
          width: 100%;
          height: 100%;

          .mapCanvas {
            width: 100%;
            height: 100%;
            display: block;
          }
        }

        .empty-state-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: rgba(255, 255, 255, 0.8);
          z-index: 10;

          .empty-content {
            text-align: center;
            color: #999;

            p {
              margin-top: 12px;
            }
          }
        }
      }

      .side-info-panel {
        width: 300px;
        height: 100%;
        background: #fff;
        border-left: 1px solid #eee;
        display: flex;
        flex-direction: column;
        z-index: 20;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);

        .panel-header {
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          background: #f9f9f9;

          h3 {
            margin: 0;
            font-size: 16px;
            color: #333;
          }
        }

        .legion-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;

          .legion-item {
            display: flex;
            align-items: center;
            padding: 2px 4px; /* 进一步减小内边距 */
            margin-bottom: 2px; /* 进一步减小外边距 */
            background: #f8f9fa;
            border-radius: 4px;
            border-left: 4px solid transparent;
            transition: all 0.2s;
            height: 32px; /* 进一步减小固定高度 */

            &:hover {
              background: #f0f0f0;
              transform: translateX(2px);
            }

            .rank-badge {
              width: 18px;
              height: 18px;
              background: #e0e0e0;
              color: #666;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: bold;
              margin-right: 6px;
              flex-shrink: 0;
            }

            .legion-info {
              flex: 1;
              overflow: hidden;
              display: flex; /* 改为 flex 布局 */
              align-items: center; /* 垂直居中 */
              justify-content: space-between; /* 两端对齐 */

              .legion-name {
                font-size: 13px; /* 缩小字体 */
                color: #333;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 0; /* 移除底部边距 */
                margin-right: 8px; /* 添加右侧间距 */
                flex: 1; /* 占据剩余空间 */

                .legion-id {
                  color: #999;
                  font-size: 11px;
                  margin-right: 4px;
                  font-weight: normal;
                }
              }

              .legion-stats {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                flex-shrink: 0; /* 防止被压缩 */

                .stat-red {
                  color: #d03050;
                  background: rgba(208, 48, 80, 0.1);
                  padding: 1px 4px; /* 减小内边距 */
                  border-radius: 3px;
                }
              }
            }
          }

          .alliance-group {
            margin-bottom: 4px; /* 进一步减小分组间距 */

            .group-header {
              display: flex;
              align-items: center;
              padding: 2px 4px; /* 进一步减小标题内边距 */
              margin-bottom: 2px;

              .group-name {
                font-weight: bold;
                font-size: 13px; /* 缩小字体 */
                color: #333;
                margin-right: 6px;
              }

              .group-count {
                font-size: 11px;
                color: #999;
              }
            }
          }
        }
      }
    }
  }
}

// 响应式调整
@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;

    .stats-section {
      width: 100%;
      justify-content: space-between;
    }
  }

  .map-container-wrapper {
    height: 400px !important;
  }
}
</style>
