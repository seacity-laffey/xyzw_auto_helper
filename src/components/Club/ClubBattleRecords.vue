<template>
  <div class="records-container">
    <!-- 头部信息区 -->
      <div class="header-section">
        <div class="header-left">
          <img
            src="/icons/moonPalace.png"
            alt="俱乐部图标"
            class="header-icon"
          />
          <div class="header-title">
            <h2>俱乐部盐场战绩</h2>
            <p>查看俱乐部成员的详细战绩数据</p>
          </div>
        </div>

        <!-- 数据统计区 -->
        <div class="stats-section" v-if="battleRecords && battleRecords.roleDetailsList">
          <div class="stat-item">
            <span class="stat-label">查询日期:</span>
            <n-tag type="info">{{ queryDate }}</n-tag>
          </div>
          <div class="stat-item">
            <span class="stat-label">总人数:</span>
            <n-tag type="success">{{ battleRecords.roleDetailsList.length }}</n-tag>
          </div>
        </div>
      </div>

      <!-- 功能操作区 -->
      <div class="function-section">
        <div class="function-left">
          <div class="export-options">
            <n-checkbox-group v-model:value="exportmethod" name="group-exportmethod" size="small">
              <n-checkbox value="1">表格导出</n-checkbox>
              <n-checkbox value="2">图片导出</n-checkbox>
            </n-checkbox-group>
          </div>
        </div>

        <div class="function-right">
          <a-date-picker 
            v-model:value="queryDate" 
            :defaultValue="queryDate"
            @change="fetchBattleRecordsByDate" 
            valueFormat="YYYY/MM/DD" 
            format="YYYY/MM/DD"
            :disabled-date="disabledDate"
          />
          <n-button 
            size="small" 
            :disabled="loading" 
            @click="handleRefresh"
            class="action-btn refresh-btn"
          >
            <template #icon>
              <n-icon>
                <Refresh />
              </n-icon>
            </template>
            刷新
          </n-button>
          <n-button 
            type="primary" 
            size="small" 
            :disabled="!battleRecords || loading" 
            @click="handleExport"
            class="action-btn export-btn"
          >
            <template #icon>
              <n-icon>
                <Copy />
              </n-icon>
            </template>
            导出
          </n-button>
        </div>
      </div>

      <div class="battle-records-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <n-spin size="large">
            <template #description>正在加载战绩数据...</template>
          </n-spin>
        </div>

        <!-- 战绩列表 -->
        <div
          v-else-if="battleRecords && battleRecords.roleDetailsList"
          ref="exportDom"
          class="records-wrapper"
        >
          <ClubBattleRecordsReport
            variant="style1"
            :club-name="club?.name || ''"
            :date="queryDate"
            :records="roleDetails"
            :stats="battleStats"
          ></ClubBattleRecordsReport>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <n-empty description="暂无战绩数据" size="large">
            <template #icon>
              <n-icon>
                <DocumentText />
              </n-icon>
            </template>
          </n-empty>
        </div>
      </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useMessage, NCheckboxGroup, NCheckbox } from 'naive-ui'
import { useTokenStore } from '@/stores/tokenStore'
import html2canvas from 'html2canvas';
import ClubBattleRecordsReport from "@/components/Club/ClubBattleRecordsReport.vue";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import { createClubBattleRecordSummary } from "@/utils/clubBattleRecordData";
import { createLatestRequestController } from "@/utils/latestRequest";
import {
  Refresh,
  Copy,
  DocumentText
} from '@vicons/ionicons5'
import {
  getLastSaturday,
  formatBattleRecordsForExport,
  copyToClipboard
} from '@/utils/clubBattleUtils'

const exportmethod = ref(['2']);
const exportDom = ref(null);

const message = useMessage()
const tokenStore = useTokenStore()
const info = computed(() => tokenStore.gameData?.legionInfo || null);
const club = computed(() => info.value?.info || null);

const loading = ref(false)
const battleRecordRequests = createLatestRequestController((isLoading) => {
  loading.value = isLoading;
});
const battleRecords = ref(null)
const queryDate = ref(getLastSaturday())

const roleDetails = computed(() => battleRecords.value?.roleDetailsList || [])
const battleStats = computed(() => createClubBattleRecordSummary(roleDetails.value))

const disabledDate = current => {
  return (current.getDay() != 6 && current.getDay() != 0) || current > Date.now()
}

//日期选择时调用查询战绩方法
const fetchBattleRecordsByDate = (val)=>{
  if(undefined != val){
    queryDate.value = val
  }else{
    queryDate.value = getLastSaturday();
  }
  fetchBattleRecords();
} 

// 查询战绩
const fetchBattleRecords = async () => {
  if (!tokenStore.selectedToken) {
    battleRecordRequests.cancel();
    message.warning('请先选择游戏角色');
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== 'connected') {
    battleRecordRequests.cancel();
    message.error('WebSocket未连接，无法查询战绩');
    return;
  }

  const requestedDate = queryDate.value;
  return battleRecordRequests.run(
    `${tokenId}:${requestedDate}`,
    async (isCurrentRequest) => {
      try {
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          'legionwar_getdetails',
          { date: requestedDate },
          10000,
        );
        if (!isCurrentRequest())
          return;

        if (result && result.roleDetailsList) {
          // 按击杀数从高到低排序
          const sortedRoleDetailsList = [...result.roleDetailsList].sort((a, b) => {
            return (b.winCnt || 0) - (a.winCnt || 0);
          });
          battleRecords.value = {
            ...result,
            roleDetailsList: sortedRoleDetailsList,
          };
          message.success('战绩加载成功，已按击杀数从高到低排序');
        } else {
          battleRecords.value = null;
          message.warning('未查询到战绩数据');
        }
      } catch (error) {
        if (!isCurrentRequest())
          return;
        console.error('查询战绩失败:', error);
        message.error(`查询失败: ${error.message}`);
        battleRecords.value = null;
      }
    },
  );
};

// 刷新战绩
const handleRefresh = () => {
  fetchBattleRecords()
}

// 导出战绩
const handleExport = async () => {
  if (!battleRecords.value || !battleRecords.value.roleDetailsList) {
    message.warning('没有可导出的数据')
    return
  }

  try {
    if (exportmethod.value.includes('1')) {
      const exportText = formatBattleRecordsForExport(battleRecords.value.roleDetailsList, queryDate.value)
      await copyToClipboard(exportText)
    }
    if (exportmethod.value.includes('2')) {
      await exportToImage()
    }
    message.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    message.error('导出失败，请重试')
  }
}

const exportToImage = async () => {
  // 校验：确保DOM已正确绑定
  if (!exportDom.value) {
    alert('未找到要导出的DOM元素');
    return;
  }

  try {
    // 临时移除战神榜内容区域的最大高度限制，确保所有内容都可见
    const godRankingContents = exportDom.value.querySelectorAll('.god-ranking-content');
    const originalStyles = [];
    
    godRankingContents.forEach(content => {
      originalStyles.push({
        element: content,
        maxHeight: content.style.maxHeight,
        overflow: content.style.overflow
      });
      content.style.maxHeight = 'none';
      content.style.overflow = 'visible';
    });

    // 5. 用html2canvas渲染DOM为Canvas
    const canvas = await html2canvas(exportDom.value, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片（若DOM内有远程图片，需开启）
      backgroundColor: '#ffffff', // 避免透明背景（默认透明）
      logging: false // 关闭控制台日志
    });

    // 恢复战神榜内容区域的原始样式
    originalStyles.forEach(({ element, maxHeight, overflow }) => {
      element.style.maxHeight = maxHeight;
      element.style.overflow = overflow;
    });

    // 6. Canvas转图片链接并下载
    const filename = queryDate.value.replace("/",'年').replace("/",'月')+'日盐场战报.png';
    downloadCanvasAsImage(canvas, filename);
  } catch (err) {
    console.error('DOM转图片失败：', err);
    alert('导出图片失败，请重试');
  }
};

// 暴露方法给父组件
defineExpose({
  fetchBattleRecords
})

// 初始化：挂载后自动拉取
onMounted(() => {
  fetchBattleRecords()
})

onBeforeUnmount(() => {
  battleRecordRequests.cancel();
});

watch(
  () => tokenStore.selectedToken?.id,
  (newTokenId, oldTokenId) => {
    if (!newTokenId || newTokenId === oldTokenId)
      return;
    battleRecords.value = null;
    fetchBattleRecords();
  },
);
</script>

<style scoped lang="scss">
.records-container {
  background: var(--bg-primary);
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
}

// 头部信息区
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .header-icon {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: var(--border-radius-md);
    background: var(--bg-secondary);
    padding: var(--spacing-xs);
    box-sizing: border-box;
  }

  .header-title {
    h2 {
      margin: 0;
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
      color: var(--text-primary);
    }

    p {
      margin: var(--spacing-xs) 0 0 0;
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  }

  // 数据统计区
  .stats-section {
    display: flex;
    gap: var(--spacing-lg);
    align-items: center;

    .stat-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      .stat-label {
        font-size: var(--font-size-sm);
        color: var(--text-secondary);
        font-weight: var(--font-weight-medium);
      }

      :deep(.n-tag) {
        font-size: var(--font-size-sm);
        padding: 4px 8px;
      }
    }
  }
}

// 功能操作区
.function-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;

  .function-left {
    .export-options {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);

      :deep(.n-checkbox-group) {
        display: flex;
        gap: var(--spacing-md);

        .n-checkbox {
          font-size: var(--font-size-sm);
          color: var(--text-primary);
        }
      }
    }
  }

  .function-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    :deep(.n-date-picker) {
      font-size: var(--font-size-sm);
      width: 200px;

      .n-input-wrapper {
        font-size: var(--font-size-sm);
      }
    }

    .action-btn {
      font-size: var(--font-size-sm);
      padding: 6px 12px;
      border-radius: var(--border-radius-sm);
      transition: all var(--transition-fast);

      &:hover {
        transform: translateY(-1px);
      }
    }
  }
}

.battle-records-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
    
    .stats-section {
      width: 100%;
      justify-content: space-between;
    }
  }
  
  .function-section {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);
    
    .function-left, .function-right {
      width: 100%;
      justify-content: space-between;
    }
  }
}
</style>
