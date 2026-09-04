<template>
  <div class="batch-daily-tasks h-screen min-h-screen overflow-hidden bg-background p-0 text-foreground max-md:h-auto max-md:min-h-[calc(100vh-56px)] max-md:overflow-visible">
    <header
      class="flex min-h-20 items-center justify-between gap-6 border-b border-border bg-background px-6 py-3 max-xl:flex-wrap max-md:gap-4 max-md:px-3"
      data-testid="batch-control-header"
    >
      <div class="flex min-w-0 items-center gap-8 max-md:w-full max-md:justify-between max-md:gap-3">
        <div class="shrink-0 max-md:hidden">
          <h2 class="m-0 whitespace-nowrap text-2xl font-extrabold text-on-surface max-md:text-xl">批量日常任务</h2>
          <div class="mt-1 flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-primary"></span>
            <span class="text-[10px] font-bold uppercase text-primary">
              系统就绪 · {{ scheduledTasks.length }} 个定时任务
            </span>
          </div>
        </div>
        <div class="h-10 w-px bg-[color-mix(in_srgb,var(--outline-variant)_30%,transparent)] max-md:hidden"></div>
        <button
          class="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          type="button"
          :aria-expanded="showAccountTools"
          @click="showAccountTools = !showAccountTools"
        >
          <PeopleOutline class="h-4 w-4"></PeopleOutline>
          <span>账号工具</span>
          <small class="text-muted-foreground">{{ selectedTokens.length }}/{{ tokens.length }}</small>
        </button>
        <div class="flex items-center gap-1 rounded-md border border-border bg-background p-1">
          <button
            class="flex items-center gap-2 whitespace-nowrap rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_88%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 max-md:px-3"
            type="button"
            :disabled="isRunning || selectedTokens.length === 0"
            @click="startBatch"
          >
            <Play class="h-4 w-4"></Play>
            {{ isRunning ? "执行中..." : "开始执行" }}
          </button>
          <button
            class="flex items-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 text-sm font-semibold text-error transition-colors hover:bg-[color-mix(in_srgb,var(--error)_10%,transparent)] disabled:cursor-not-allowed disabled:opacity-40 max-md:px-3"
            type="button"
            :disabled="!isRunning"
            @click="stopBatch"
          >
            <Stop class="h-4 w-4"></Stop>
            停止
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3 max-md:w-full max-md:justify-end">
        <div class="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1" data-testid="batch-tool-cluster">
          <button aria-label="新增定时任务" class="batch-tool-button" title="新增定时任务" type="button" @click="schedulerManagerRef?.openNew()">
            <Add class="h-5 w-5"></Add>
          </button>
          <button aria-label="查看定时任务" class="batch-tool-button" title="查看定时任务" type="button" @click="schedulerManagerRef?.openList()">
            <CalendarOutline class="h-5 w-5"></CalendarOutline>
          </button>
          <button aria-label="任务模板" class="batch-tool-button" title="任务模板" type="button" @click="showTemplateManagerModal = true">
            <DocumentTextOutline class="h-5 w-5"></DocumentTextOutline>
          </button>
          <span class="mx-1 h-5 w-px bg-[color-mix(in_srgb,var(--outline-variant)_20%,transparent)]"></span>
          <button aria-label="导出配置" class="batch-tool-button" title="导出配置" type="button" @click="exportConfig">
            <CloudUploadOutline class="h-5 w-5"></CloudUploadOutline>
          </button>
          <n-upload accept=".json" class="batch-tool-upload" :custom-request="importConfig" :show-file-list="false">
            <button aria-label="导入配置" class="batch-tool-button" title="导入配置" type="button">
              <CloudDownloadOutline class="h-5 w-5"></CloudDownloadOutline>
            </button>
          </n-upload>
          <span class="mx-1 h-5 w-px bg-[color-mix(in_srgb,var(--outline-variant)_20%,transparent)]"></span>
          <button aria-label="批量设置" class="batch-tool-button" title="批量设置" type="button" @click="openBatchSettings">
            <Settings class="h-5 w-5"></Settings>
          </button>
        </div>
        <button
          class="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted"
          type="button"
          :aria-label="showLogPanel ? '隐藏日志面板' : '显示日志面板'"
          :title="showLogPanel ? '隐藏日志面板' : '显示日志面板'"
          @click="showLogPanel = !showLogPanel"
        >
          <TerminalOutline
            class="h-5 w-5 transition-transform duration-300"
            :class="showLogPanel ? 'rotate-0' : 'rotate-180'"
          ></TerminalOutline>
        </button>
      </div>
    </header>

    <div
      class="grid h-[calc(100%-80px)] min-h-0 gap-y-6 overflow-hidden p-6 transition-[grid-template-columns,column-gap] duration-300 ease-out max-lg:h-auto max-lg:overflow-visible max-md:gap-y-4 max-md:p-3"
      data-testid="batch-workspace"
      :class="showLogPanel
        ? 'grid-cols-[minmax(0,1fr)_384px] gap-x-6 max-xl:grid-cols-[minmax(0,1fr)_340px] max-lg:grid-cols-1 max-md:gap-x-0'
        : 'grid-cols-[minmax(0,1fr)_0px] gap-x-0 max-lg:grid-cols-1'"
    >
      <div class="flex min-w-0 flex-col gap-6 overflow-hidden max-lg:overflow-visible max-md:gap-4">
        <BatchAccountPanel
          v-if="showAccountTools"
          v-model:selected-tokens="selectedTokens"
          :groups="tokenGroups"
          :is-opening-games="isOpeningGames"
          :is-running="isRunning"
          :selected-groups="selectedGroups"
          :sort-config="sortConfig"
          :sort-options="batchSortOptions"
          :token-status="tokenStatus"
          :tokens="sortedTokens"
          @clear-groups="clearAllGroupSelection"
          @manage-groups="showGroupManageModal = true"
          @open-games="openSelectedGames"
          @open-settings="openSettings"
          @sort="toggleSort"
          @toggle-group="toggleGroupSelection"
        ></BatchAccountPanel>

        <BatchFunctionPanel
          v-model:weird-tower-max-climb="weirdTowerMaxClimb"
          :arena-activity-open="isarenaActivityOpen"
          :dream-activity-open="ismengjingActivityOpen"
          :is-running="isRunning"
          :selected-count="selectedTokens.length"
          :war-guess-activity-open="isWarGuessActivityOpen"
          :war-guess-activity-tip="warGuessActivityTip"
          :weird-tower-activity-open="isWeirdTowerActivityOpen"
          @action="handleBatchFunctionAction"
        ></BatchFunctionPanel>
      </div>

      <BatchExecutionLog
        :completed-count="completedTokenCount"
        :current-token-name="currentRunningTokenName"
        :failed-count="failedTokenCount"
        :is-running="isRunning"
        :logs="logs"
        :max-entries="batchSettings.maxLogEntries || 1000"
        :progress="currentProgress"
        :visible="showLogPanel"
        @clear="clearLogs"
        @copy="copyLogs"
      ></BatchExecutionLog>
    </div>

    <BatchTaskSettingsDialog
      v-model:open="showSettingsModal"
      :boss-times-options="bossTimesOptions"
      :formation-options="formationOptions"
      :model-value="currentSettings"
      :title="`任务设置 - ${currentSettingsTokenName}`"
      @save="saveSettings"
      @update:model-value="Object.assign(currentSettings, $event)"
    ></BatchTaskSettingsDialog>

    <BatchTemplateManager
      v-model:open="showTemplateManagerModal"
      :boss-times-options="bossTimesOptions"
      :formation-options="formationOptions"
      :groups="tokenGroups"
      :tokens="sortedTokens"
      @notify="handleTemplateNotice"
    ></BatchTemplateManager>

    <BatchSchedulerManager
      ref="schedulerManagerRef"
      :countdowns="taskCountdowns"
      :executing-task-ids="executingTaskIds"
      :groups="tokenGroups"
      :tasks="scheduledTasks"
      :tokens="sortedTokens"
      @delete="deleteTask"
      @execute="manualExecuteTask"
      @manage-groups="showGroupManageModal = true"
      @notify="handleSchedulerNotice"
      @save="saveScheduledTask"
      @toggle="toggleTaskEnabled"
    ></BatchSchedulerManager>

    <!-- Legacy Gift Modal -->
    <n-modal
      preset="card"
      style="width: 90%; max-width: 600px"
      title="批量功法残卷赠送"
      v-model:show="showLegacyGiftModal"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <!-- 接收者ID输入 -->
          <div class="setting-item">
            <label class="setting-label">接收者ID</label>
            <n-space>
              <n-input-number
                placeholder="ID"
                style="width: 180px"
                v-model:value="recipientIdInput"
                :show-button="false"
                @update:value="clearRecipientError"
              ></n-input-number>
              <n-input
                placeholder="请输入安全密码"
                style="width: 180px"
                type="password"
                v-model:value="securityPassword"
                @input="clearRecipientError"
              ></n-input>
              <n-button
                type="primary"
                :disabled="
                  !recipientIdInput || isQueryingRecipient || !securityPassword
                "
                @click="queryRecipientInfo"
              >
                查询
              </n-button>
            </n-space>
            <n-text
              v-if="recipientIdError"
              style="margin-top: 5px; display: block"
              type="error"
            >
              {{ recipientIdError }}
            </n-text>
          </div>

          <!-- 接收者信息展示 -->
          <div v-if="recipientInfo" class="setting-item">
            <label class="setting-label">接收者信息</label>
            <div
              class="recipient-info"
              style="
                background: #f7f8fa;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
                display: flex;
                align-items: flex-start;
                gap: 16px;
                transition: all 0.3s ease;
              "
            >
              <!-- 头像部分 -->
              <div
                class="avatar-container"
                style="
                  position: relative;
                  width: 80px;
                  height: 80px;
                  border-radius: 50%;
                  overflow: hidden;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.3s ease;
                "
              >
                <img
                  v-if="recipientInfo.avatarUrl && !avatarLoadError"
                  alt="角色头像"
                  style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: all 0.3s ease;
                  "
                  :src="recipientInfo.avatarUrl"
                  @error="handleAvatarError"
                  @load="handleAvatarLoad"
                >
                <!-- 头像加载失败或未设置时的 fallback -->
                <div
                  v-else
                  class="avatar-fallback"
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    color: white;
                    font-size: 24px;
                    font-weight: bold;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                  "
                >
                  {{ (recipientInfo.name || "未知角色")[0] || "?" }}
                </div>
                <!-- 加载指示器 -->
                <div
                  v-if="isAvatarLoading"
                  class="avatar-loading"
                  style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                  "
                >
                  <div
                    class="loading-spinner"
                    style="
                      width: 30px;
                      height: 30px;
                      border: 3px solid rgba(255, 255, 255, 0.3);
                      border-top: 3px solid white;
                      border-radius: 50%;
                      animation: spin 1s linear infinite;
                    "
                  ></div>
                </div>
              </div>

              <!-- 角色信息部分 -->
              <div class="role-info" style="flex: 1; min-width: 0">
                <div
                  style="
                    margin-bottom: 12px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #1d2129;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                  "
                >
                  {{ recipientInfo.name || "未知角色" }}
                </div>
                <div
                  class="role-info-grid"
                  style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                  "
                >
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      角色ID
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.roleId }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      服务器
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.serverName }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      战力
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 16px; font-weight: 600; color: #667eea"
                    >
                      {{ recipientInfo.power }} {{ recipientInfo.powerUnit }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      军团
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.legionName || "无" }}
                    </div>
                  </div>
                  <div class="info-item" style="grid-column: 1 / -1">
                    <div
                      class="info-label"
                      style="
                        font-size: 12px;
                        color: #86909c;
                        margin-bottom: 2px;
                      "
                    >
                      军团ID
                    </div>
                    <div
                      class="info-value"
                      style="font-size: 14px; font-weight: 500; color: #1d2129"
                    >
                      {{ recipientInfo.legionId || "无" }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 赠送数量 -->
          <div class="setting-item">
            <label class="setting-label">赠送数量</label>
            <n-input-number
              placeholder="请输入赠送数量"
              v-model:value="giftQuantity"
              :max="1000"
              :min="1"
              :step="1"
            ></n-input-number>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            style="margin-right: 12px"
            @click="showLegacyGiftModal = false"
          >
            取消
          </n-button>
          <n-button
            type="primary"
            :disabled="!recipientIdInput || !recipientInfo"
            @click="confirmLegacyGift"
          >
            开始赠送
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- Helper Modal (开箱/钓鱼/招募/按积分开箱) -->
    <n-modal
      preset="card"
      style="width: 90%; max-width: 400px"
      v-model:show="showHelperModal"
      :title="helperModalTitle"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <div v-if="helperType === 'box'" class="setting-item">
            <label class="setting-label">宝箱类型</label>
            <n-select
              size="small"
              v-model:value="helperSettings.boxType"
              :options="boxTypeOptions"
            ></n-select>
          </div>
          <div v-if="helperType === 'fish'" class="setting-item">
            <label class="setting-label">鱼竿类型</label>
            <n-select
              size="small"
              v-model:value="helperSettings.fishType"
              :options="fishTypeOptions"
            ></n-select>
          </div>
          <div v-if="helperType === 'pointsBox'" class="setting-item">
            <label class="setting-label">目标积分</label>
            <n-input-number
              size="small"
              style="width: 100%"
              v-model:value="helperSettings.targetPoints"
              :max="1000000"
              :min="1"
              :step="100"
            ></n-input-number>
          </div>
          <n-alert
            v-if="helperType === 'pointsBox'"
            style="margin-bottom: 12px"
            type="info"
          >
            开箱优先级: 木质宝箱(保留200个) → 青铜宝箱 → 黄金宝箱 → 铂金宝箱<br>
            积分: 木质=1分, 青铜=10分, 黄金=20分, 铂金=50分
          </n-alert>
          <div v-if="helperType !== 'pointsBox'" class="setting-item">
            <label class="setting-label">消耗数量（10的倍数）</label>
            <n-input-number
              size="small"
              v-model:value="helperSettings.count"
              :max="10000"
              :min="10"
              :step="10"
            ></n-input-number>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            style="margin-right: 12px"
            @click="showHelperModal = false"
          >
            取消
          </n-button>
          <n-button type="primary" @click="executeHelper">开始执行</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Dream Buy Modal -->
    <n-modal
      preset="card"
      style="width: 90%; max-width: 600px"
      title="梦境商品购买配置"
      v-model:show="showDreamBuyModal"
    >
      <div class="settings-content">
        <div class="settings-grid">
          <n-alert show-icon style="margin-bottom: 12px" type="info">
            请勾选需要购买的商品。只会购买列表中存在的商品。
          </n-alert>

          <div style="display: flex; gap: 12px; margin-bottom: 12px">
            <n-button size="small" type="warning" @click="selectGoldItems">
              一键勾选金币商品
            </n-button>
            <n-button size="small" @click="selectAllItems"> 全选所有 </n-button>
            <n-button size="small" @click="clearAllItems"> 清空选择 </n-button>
          </div>

          <div
            v-for="(merchant, id) in merchantConfig"
            :key="id"
            style="margin-bottom: 16px"
          >
            <div style="font-weight: bold; margin-bottom: 8px">
              {{ merchant.name }}
            </div>
            <n-grid :cols="3" :x-gap="12" :y-gap="8">
              <n-grid-item v-for="(item, index) in merchant.items" :key="index">
                <n-checkbox
                  :checked="dreamBuyList.includes(`${id}-${index}`)"
                  :value="`${id}-${index}`"
                  @update:checked="
                    (checked) => toggleDreamItem(`${id}-${index}`, checked)
                  "
                >
                  {{ item }}
                </n-checkbox>
              </n-grid-item>
            </n-grid>
          </div>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            style="margin-right: 12px"
            @click="showDreamBuyModal = false"
          >
            取消
          </n-button>
          <n-button
            type="primary"
            @click="saveDreamBuyConfig"
          >
            保存配置
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- Batch Settings Modal -->
    <n-modal
      preset="card"
      style="width: 90%; max-width: 700px"
      title="任务设置"
      v-model:show="showBatchSettingsModal"
    >
      <div class="settings-content">
        <n-grid :cols="2" :x-gap="24">
          <!-- 左列：批量操作设置 -->
          <n-grid-item>
            <n-divider
              style="margin: 1px 0 8px 0"
              title-placement="left"
            >
              批量操作设置
            </n-divider>
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">开箱数量(10倍)</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.boxCount"
                  :max="10000"
                  :min="10"
                  :step="10"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">钓鱼数量(10倍)</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.fishCount"
                  :max="10000"
                  :min="10"
                  :step="10"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">招募数量(10倍)</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.recruitCount"
                  :max="10000"
                  :min="10"
                  :step="10"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">默认宝箱类型</label>
                <n-select
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.defaultBoxType"
                  :options="boxTypeOptions"
                ></n-select>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">默认鱼竿类型</label>
                <n-select
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.defaultFishType"
                  :options="fishTypeOptions"
                ></n-select>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">按积分开箱目标</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.targetBoxPoints"
                  :max="1000000"
                  :min="1"
                  :step="100"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">梦境商品购买配置</label>
                <n-button
                  size="small"
                  @click="openDreamBuyModal"
                >
                  点击配置
                </n-button>
              </div>
            </div>
            <n-divider
              style="margin: 12px 0 8px 0"
              title-placement="left"
            >
              功法赠送设置
            </n-divider>
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">接收者ID</label>
                <n-input-number
                  placeholder="ID"
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.receiverId"
                  :show-button="false"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">密码</label>
                <n-input
                  placeholder="密码"
                  size="small"
                  style="width: 100px"
                  type="password"
                  v-model:value="batchSettings.password"
                ></n-input>
              </div>
            </div>
          </n-grid-item>
          <!-- 右列：延迟与连接设置 -->
          <n-grid-item>
            <n-divider
              style="margin: 1px 0 8px 0"
              title-placement="left"
            >
              延迟设置(ms)
            </n-divider>
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">命令延迟</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.commandDelay"
                  :max="2000"
                  :min="100"
                  :step="100"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">任务间延迟</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.taskDelay"
                  :max="2000"
                  :min="100"
                  :step="100"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">操作延迟</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.actionDelay"
                  :max="2000"
                  :min="100"
                  :step="100"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">战斗延迟</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.battleDelay"
                  :max="2000"
                  :min="100"
                  :step="100"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">刷新延迟</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.refreshDelay"
                  :max="3000"
                  :min="500"
                  :step="100"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">长延迟</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.longDelay"
                  :max="10000"
                  :min="1000"
                  :step="500"
                ></n-input-number>
              </div>
            </div>
            <n-divider
              style="margin: 12px 0 8px 0"
              title-placement="left"
            >
              连接设置
            </n-divider>
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">最大并发数</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.maxActive"
                  :max="20"
                  :min="1"
                  :step="1"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">连接超时(ms)</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.connectionTimeout"
                  :max="30000"
                  :min="1000"
                  :step="1000"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">重连等待(ms)</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.reconnectDelay"
                  :max="5000"
                  :min="100"
                  :step="100"
                ></n-input-number>
              </div>
            </div>
            <n-divider
              style="margin: 12px 0 8px 0"
              title-placement="left"
            >
              系统设置
            </n-divider>
            <div class="settings-grid">
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">列表每行数量</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.tokenListColumns"
                  :max="10"
                  :min="1"
                  :step="1"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">最大日志条目</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.maxLogEntries"
                  :max="5000"
                  :min="100"
                  :step="100"
                ></n-input-number>
              </div>
              <div
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">定时刷新页面</label>
                <n-switch v-model:value="batchSettings.enableRefresh"></n-switch>
              </div>
              <div
                v-if="batchSettings.enableRefresh"
                class="setting-item"
                style="
                  flex-direction: row;
                  justify-content: space-between;
                  align-items: center;
                "
              >
                <label class="setting-label">刷新间隔(分钟)</label>
                <n-input-number
                  size="small"
                  style="width: 100px"
                  v-model:value="batchSettings.refreshInterval"
                  :max="1440"
                  :min="10"
                  :step="30"
                ></n-input-number>
              </div>
            </div>
          </n-grid-item>
        </n-grid>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button
            style="margin-right: 12px"
            @click="showBatchSettingsModal = false"
          >
            取消
          </n-button>
          <n-button
            type="primary"
            @click="saveBatchSettings"
          >
            保存设置
          </n-button>
        </div>
      </div>
    </n-modal>

    <!-- War Guess Modal -->
    <n-modal
      preset="card"
      style="width: 90%; max-width: 800px"
      title="月赛助威"
      v-model:show="showWarGuessModal"
    >
      <div class="settings-content">
        <div class="settings-grid" style="display: block">
          <div
            style="
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 12px;
            "
          >
            <span style="font-size: 16px">拍手器:</span>
            <n-input-number
              placeholder="拍手器"
              style="width: 120px"
              v-model:value="warGuessCoin"
              :max="20"
              :min="1"
            >
            </n-input-number>
            <n-button
              type="primary"
              :disabled="!selectedWarGuessLegionId || isRunning"
              @click="handleWarGuessCheer"
            >
              助威
            </n-button>
            <n-button :loading="warGuessLoading" @click="fetchWarGuessRank">
              刷新数据
            </n-button>
          </div>

          <n-data-table
            flex-height
            style="height: 400px; flex: 1"
            :checked-row-keys="
              selectedWarGuessLegionId ? [selectedWarGuessLegionId] : []
            "
            :columns="warGuessColumns"
            :data="warGuessList"
            :loading="warGuessLoading"
            :row-key="(row) => row.id"
            :row-props="warGuessRowProps"
            @update:checked-row-keys="
              (keys) => (selectedWarGuessLegionId = keys[0])
            "
          ></n-data-table>
        </div>
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showWarGuessModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>

    <!-- Token Group Management Modal -->
    <n-modal
      preset="card"
      style="width: 90%; max-width: 800px"
      title="分组管理"
      v-model:show="showGroupManageModal"
    >
      <div class="settings-content">
        <!-- 创建新分组 -->
        <n-divider style="margin: 0 0 16px 0" title-placement="left">
          创建新分组
        </n-divider>
        <div style="margin-bottom: 24px">
          <div
            style="
              display: flex;
              gap: 12px;
              align-items: center;
              margin-bottom: 12px;
              flex-wrap: wrap;
            "
          >
            <n-input
              placeholder="输入分组名称"
              size="small"
              style="width: 200px"
              v-model:value="newGroupName"
            ></n-input>
            <div style="display: flex; gap: 8px; align-items: center">
              <span style="font-size: 12px">选择颜色:</span>
              <div style="display: flex; gap: 6px">
                <div
                  v-for="color in groupColors"
                  :key="color"
                  :style="{
                    width: '24px',
                    height: '24px',
                    backgroundColor: color,
                    borderRadius: '4px',
                    border:
                      newGroupColor === color
                        ? '3px solid #000'
                        : '2px solid #ddd',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }"
                  @click="newGroupColor = color"
                  @mouseleave="$event.target.style.transform = 'scale(1)'"
                  @mouseover="$event.target.style.transform = 'scale(1.1)'"
                ></div>
              </div>
            </div>
            <n-button size="small" type="primary" @click="createNewGroup">
              创建分组
            </n-button>
          </div>

          <!-- 选择包含的账号 -->
          <div
            style="
              background: #f9f9f9;
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #eee;
            "
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
              "
            >
              <span style="font-size: 13px; font-weight: bold">包含账号 ({{ newGroupSelectedTokens.length }})</span>
              <n-space size="small">
                <n-button size="tiny" @click="selectAllNewGroup">全选</n-button>
                <n-button
                  size="tiny"
                  @click="deselectAllNewGroup"
                >
                  全不选
                </n-button>
              </n-space>
            </div>
            <div style="max-height: 150px; overflow-y: auto">
              <n-checkbox-group v-model:value="newGroupSelectedTokens">
                <n-grid :cols="3" :x-gap="12" :y-gap="8">
                  <n-grid-item v-for="token in sortedTokens" :key="token.id">
                    <n-checkbox :value="token.id">{{ token.name }}</n-checkbox>
                  </n-grid-item>
                </n-grid>
              </n-checkbox-group>
            </div>
          </div>
        </div>

        <!-- 分组列表 -->
        <n-divider style="margin: 0 0 16px 0" title-placement="left">
          分组列表
        </n-divider>
        <div
          style="
            max-height: 500px;
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
          "
        >
          <div
            v-for="group in tokenGroups"
            :key="group.id"
            style="
              padding: 12px;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              margin-bottom: 12px;
              background: #fafafa;
            "
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 12px;
              "
            >
              <div style="flex: 1">
                <!-- 编辑模式 -->
                <div
                  v-if="editingGroupId === group.id"
                  style="display: flex; gap: 8px"
                >
                  <n-input
                    placeholder="分组名称"
                    size="small"
                    style="width: 150px"
                    v-model:value="editingGroupName"
                  ></n-input>
                  <div style="display: flex; gap: 6px; align-items: center">
                    <div
                      v-for="color in groupColors"
                      :key="color"
                      :style="{
                        width: '20px',
                        height: '20px',
                        backgroundColor: color,
                        borderRadius: '4px',
                        border:
                          editingGroupColor === color
                            ? '3px solid #000'
                            : '2px solid #ddd',
                        cursor: 'pointer',
                      }"
                      @click="editingGroupColor = color"
                    ></div>
                  </div>
                  <n-button
                    size="small"
                    style="width: 60px"
                    type="primary"
                    @click="saveEditGroup"
                  >
                    保存
                  </n-button>
                  <n-button
                    size="small"
                    style="width: 60px"
                    @click="cancelEditGroup"
                  >
                    取消
                  </n-button>
                </div>
                <!-- 显示模式 -->
                <div v-else>
                  <div
                    style="
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      margin-bottom: 8px;
                    "
                  >
                    <div
                      :style="{
                        width: '16px',
                        height: '16px',
                        backgroundColor: group.color,
                        borderRadius: '3px',
                      }"
                    ></div>
                    <span style="font-weight: 500; font-size: 14px">
                      {{ group.name }}
                    </span>
                    <n-tag size="small" type="info">
                      {{ getValidGroupTokenIds(group.id).length }} 个账号
                    </n-tag>
                  </div>
                  <div
                    style="
                      display: flex;
                      gap: 4px;
                      flex-wrap: wrap;
                      margin-bottom: 8px;
                    "
                  >
                    <div
                      v-for="tokenId in getValidGroupTokenIds(group.id)"
                      :key="tokenId"
                      style="
                        padding: 2px 8px;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                      "
                    >
                      {{ tokens.find((t) => t.id === tokenId)?.name }}
                      <n-button
                        text
                        size="tiny"
                        type="error"
                        @click="removeTokenFromSelectedGroup(group.id, tokenId)"
                      >
                        ×
                      </n-button>
                    </div>
                  </div>
                  <!-- 添加token到分组 -->
                  <div style="margin-bottom: 8px">
                    <n-select
                      filterable
                      placeholder="添加账号到分组"
                      size="small"
                      :options="
                        tokens
                          .filter(
                            (t) =>
                              !getValidGroupTokenIds(group.id).includes(t.id),
                          )
                          .map((t) => ({ label: t.name, value: t.id }))
                      "
                      @update:value="
                        (tokenId) => {
                          if (tokenId) {
                            addTokenToSelectedGroup(group.id, tokenId);
                          }
                        }
                      "
                    ></n-select>
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div
                v-if="editingGroupId !== group.id"
                style="display: flex; gap: 8px"
              >
                <n-button size="small" @click="startEditGroup(group.id)">
                  编辑
                </n-button>
                <n-button
                  size="small"
                  type="error"
                  @click="deleteGroup(group.id)"
                >
                  删除
                </n-button>
              </div>
            </div>
          </div>

          <div
            v-if="tokenGroups.length === 0"
            style="text-align: center; padding: 24px; color: #86909c"
          >
            暂无分组，请创建一个新分组
          </div>
        </div>

        <!-- 关闭按钮 -->
        <div class="modal-actions" style="margin-top: 20px; text-align: right">
          <n-button @click="showGroupManageModal = false">关闭</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
// Import required dependencies
import {
  computed,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import {
  batchSelectedTokenIds,
  gameTokens,
  tokenGroups,
  useTokenStore,
} from "@/stores/tokenStore";
import { $emit } from "@/stores/events/index";
import { DailyTaskRunner } from "@/utils/dailyTaskRunner";
import { useMessage } from "naive-ui";
import { useRouter } from "vue-router";
import BatchAccountPanel from "@/components/Batch/BatchAccountPanel.vue";
import BatchExecutionLog from "@/components/Batch/BatchExecutionLog.vue";
import BatchFunctionPanel from "@/components/Batch/BatchFunctionPanel.vue";
import BatchSchedulerManager from "@/components/Batch/BatchSchedulerManager.vue";
import BatchTaskSettingsDialog from "@/components/Batch/BatchTaskSettingsDialog.vue";
import BatchTemplateManager from "@/components/Batch/BatchTemplateManager.vue";
import {
  Add,
  CalendarOutline,
  CloudDownloadOutline,
  CloudUploadOutline,
  DocumentTextOutline,
  PeopleOutline,
  Play,
  Settings,
  Stop,
  TerminalOutline,
} from "@vicons/ionicons5";
import { DEFAULT_WEIRD_TOWER_MAX_CLIMB } from "@/utils/towerClimbLimit.js";
import useIndexedDB from "@/hooks/useIndexedDB";
import { prepareEmbeddedGameSession } from "@/utils/gameLauncher";
import { buildEmbeddedGameLocation } from "@/utils/embeddedGameRoute.js";
import { resolveEmbeddedGameBinData } from "@/utils/embeddedGameStorage.js";
import { getTokenId } from "@/utils/token";

// Import batch task modules
import {
  addTaskSaveLog,
  availableTasks,
  bossTimesOptions,
  // Constants
  boxTypeOptions,
  calculateMonthProgress,
  calculateNextExecutionTime,
  // Task factories
  createTasksArena,
  createTasksBottle,
  createTasksDungeon,
  createTasksHangUp,
  createTasksItem,
  createTasksLegacy,
  createTasksStore,
  createTasksTower,
  fishTypeOptions,
  formationOptions,
  formatTimeDifference,
  getTodayStartSec,
  isTodayAvailable,
  matchesCronExpression,
  pickArenaTargetId,
} from "@/utils/batch";

import { goldItemsConfig, merchantConfig } from "@/utils/dreamConstants";

// Initialize token store, message service, and task runner
const tokenStore = useTokenStore();
const message = useMessage();
const router = useRouter();
const { getArrayBuffer } = useIndexedDB();
const weirdTowerMaxClimb = ref(DEFAULT_WEIRD_TOWER_MAX_CLIMB);

// 排序配置（从localStorage读取，与TokenImport共享）
const savedSortConfig = localStorage.getItem("tokenSortConfig");
const sortConfig = ref(
  savedSortConfig
    ? JSON.parse(savedSortConfig)
    : {
        field: "createdAt", // 排序字段：name, server, createdAt, lastUsed
        direction: "asc", // 排序方向：asc, desc
      },
);

const batchSortOptions = [
  { label: "名称", value: "name" },
  { label: "服务器", value: "server" },
  { label: "创建时间", value: "createdAt" },
  { label: "最后使用", value: "lastUsed" },
];

// 排序后的游戏角色Token列表
const sortedTokens = computed(() => {
  return [...tokenStore.gameTokens].sort((tokenA, tokenB) => {
    let valueA, valueB;

    // 根据排序字段获取比较值
    switch (sortConfig.value.field) {
      case "name":
        valueA = tokenA.name?.toLowerCase() || "";
        valueB = tokenB.name?.toLowerCase() || "";
        break;
      case "server":
        valueA = tokenA.server?.toLowerCase() || "";
        valueB = tokenB.server?.toLowerCase() || "";
        break;
      case "createdAt":
        valueA = new Date(tokenA.createdAt || 0).getTime();
        valueB = new Date(tokenB.createdAt || 0).getTime();
        break;
      case "lastUsed":
        valueA = new Date(tokenA.lastUsed || 0).getTime();
        valueB = new Date(tokenB.lastUsed || 0).getTime();
        break;
      default:
        valueA = tokenA.name?.toLowerCase() || "";
        valueB = tokenB.name?.toLowerCase() || "";
    }

    // 根据排序方向比较值
    if (valueA < valueB) {
      return sortConfig.value.direction === "asc" ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortConfig.value.direction === "asc" ? 1 : -1;
    }
    return 0;
  });
});

// 切换排序
const toggleSort = (field) => {
  if (sortConfig.value.field === field) {
    // 如果点击的是当前排序字段，则切换排序方向
    sortConfig.value.direction
      = sortConfig.value.direction === "asc" ? "desc" : "asc";
  } else {
    // 如果点击的是新的排序字段，则默认升序
    sortConfig.value.field = field;
    sortConfig.value.direction = "asc";
  }

  // 保存排序设置到localStorage
  localStorage.setItem("tokenSortConfig", JSON.stringify(sortConfig.value));
};

const tokens = computed(() => tokenStore.gameTokens);
const ismengjingActivityOpen = computed(() => {
  const day = new Date().getDay();
  return day === 0 || day === 1 || day === 3 || day === 4;
});
const isarenaActivityOpen = computed(() => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 22;
});
const getCurrentActivityWeek = computed(() => {
  const now = new Date();
  const start = new Date("2025-12-12T12:00:00"); // 起始时间：黑市周开始
  const weekDuration = 7 * 24 * 60 * 60 * 1000; // 一周毫秒数
  const cycleDuration = 3 * weekDuration; // 三周期毫秒数

  const elapsed = now - start;
  if (elapsed < 0)
    return null; // 活动开始前

  const cyclePosition = elapsed % cycleDuration;

  if (cyclePosition < weekDuration) {
    return "黑市周";
  } else if (cyclePosition < 2 * weekDuration) {
    return "招募周";
  } else {
    return "宝箱周";
  }
});

const isWeirdTowerActivityOpen = computed(() => {
  if (getCurrentActivityWeek.value !== "黑市周")
    return false;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  // 如果是周五，必须在12点之后
  if (day === 5) {
    return hour >= 12;
  }
  return true;
});

// 获取本月第四个周日的日期
const getFourthSundayOfMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 当月第一天
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0-6

  // 计算第一个周日的日期 (1号是周日则为1，否则为 1 + 7 - dayOfWeek)
  let firstSundayDate = 1 + ((7 - dayOfWeek) % 7);

  // 仅针对2026年3月进行特殊处理
  if (year === 2026 && month === 2 && dayOfWeek === 0) {
    firstSundayDate = 8;
  }

  // 第四个周日 = 第一个周日 + 21天
  return new Date(year, month, firstSundayDate + 21);
};

const isWarGuessActivityOpen = computed(() => {
  const now = new Date();

  // 手动修正：2026年3月1日开放
  if (
    now.getFullYear() === 2026
    && now.getMonth() === 2
    && now.getDate() === 1
  ) {
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (hour < 19 || (hour === 19 && minute <= 55))
      return true;
  }

  const fourthSunday = getFourthSundayOfMonth();

  // 检查是否是今天
  if (now.getDate() !== fourthSunday.getDate())
    return false;

  // 检查时间 00:00 - 19:55
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour > 19 || (hour === 19 && minute > 55))
    return false;

  return true;
});

const warGuessActivityTip = computed(() => {
  if (isWarGuessActivityOpen.value)
    return "";

  const fourthSunday = getFourthSundayOfMonth();
  const month = fourthSunday.getMonth() + 1;
  const date = fourthSunday.getDate();
  return `月赛助威仅在每月第四个周日 (${month}月${date}日) 00:00-19:55 开放`;
});

const selectedTokens = batchSelectedTokenIds;
const showAccountTools = ref(false);
const isOpeningGames = ref(false);
const tokenStatus = ref({}); // { tokenId: 'waiting' | 'running' | 'completed' | 'failed' }
const isRunning = ref(false);
const shouldStop = ref(false);

watch(
  tokens,
  (currentTokens) => {
    const validTokenIds = new Set(currentTokens.map((token) => token.id));
    selectedTokens.value = selectedTokens.value.filter((tokenId) => validTokenIds.has(tokenId));
  },
  { immediate: true },
);

const openSelectedGames = async () => {
  if (selectedTokens.value.length === 0 || isOpeningGames.value)
    return;

  isOpeningGames.value = true;
  const readyIds = [];
  const skippedNames = [];

  try {
    for (const tokenId of selectedTokens.value) {
      const token = tokens.value.find((item) => item.id === tokenId);
      if (!token)
        continue;

      const binData = await resolveEmbeddedGameBinData(token, getArrayBuffer, {
        identifyBuffer: getTokenId,
      });
      if (!binData) {
        skippedNames.push(token.name || token.id);
        continue;
      }

      prepareEmbeddedGameSession(token, binData);
      readyIds.push(token.id);
    }

    if (readyIds.length === 0) {
      message.error("所选账号均未找到本机 BIN 数据，请先重新导入 BIN");
      return;
    }

    if (skippedNames.length > 0) {
      const names = skippedNames.slice(0, 3).join("、");
      const remaining = skippedNames.length > 3
        ? ` 等 ${skippedNames.length} 个账号`
        : "";
      message.warning(`已跳过缺少 BIN 数据的账号：${names}${remaining}`);
    }

    await router.push(buildEmbeddedGameLocation(readyIds, "batch"));
  } catch (error) {
    message.error(`打开游戏失败：${error?.message || error}`);
  } finally {
    isOpeningGames.value = false;
  }
};

// =====================
// Token分组管理状态
// =====================
const showGroupManageModal = ref(false);
const selectedGroups = ref([]); // 选中的分组ID列表
const newGroupName = ref("");
const newGroupColor = ref("#1677ff");
const newGroupSelectedTokens = ref([]); // 新建分组时选中的Token ID列表
const editingGroupId = ref(null);
const editingGroupName = ref("");
const editingGroupColor = ref("");
const groupColors = [
  "#1677ff", // 蓝色
  "#52c41a", // 绿色
  "#faad14", // 橙色
  "#f5222d", // 红色
  "#722ed1", // 紫色
  "#13c2c2", // 青色
  "#eb2f96", // 粉色
  "#fa8c16", // 赤红色
];

// ======================
// War Guess Feature
// ======================
const showWarGuessModal = ref(false);
const warGuessList = ref([]);
const warGuessLoading = ref(false);
const warGuessCoin = ref(20);
const selectedWarGuessLegionId = ref(null);

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

const warGuessColumns = [
  {
    type: "selection",
    multiple: false,
  },
  { title: "ID", key: "id", width: 100 },
  {
    title: "头像",
    key: "logo",
    render(row) {
      return h("img", {
        src: row.logo,
        style: { width: "30px", height: "30px", borderRadius: "50%" },
      });
    },
    width: 60,
  },
  { title: "区服", key: "serverId", width: 80 },
  { title: "俱乐部", key: "name", width: 120 },
  {
    title: "战力",
    key: "power",
    render(row) {
      return formatPower(row.power);
    },
    width: 100,
  },
  { title: "红淬", key: "quenchNum" },
  { title: "已助威", key: "guessNum" },
  {
    title: "总热度",
    key: "totalNum",
    render(row) {
      return formatPower(row.totalNum || 0);
    },
    width: 100,
  },
];

const warGuessRowProps = (row) => {
  return {
    style: "cursor: pointer",
    onClick: () => {
      selectedWarGuessLegionId.value = row.id;
    },
  };
};

const openWarGuessModal = () => {
  showWarGuessModal.value = true;
  // Reset selection
  selectedWarGuessLegionId.value = null;
  warGuessList.value = [];

  // Auto fetch if tokens selected
  if (selectedTokens.value.length > 0) {
    fetchWarGuessRank();
  }
};

const fetchWarGuessRank = async () => {
  if (selectedTokens.value.length === 0) {
    message.warning("请先选择一个账号用于获取月赛助威数据");
    return;
  }

  const tokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === tokenId);

  warGuessLoading.value = true;
  try {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在使用 ${token.name} 获取月赛助威数据...`,
      type: "info",
    });

    // Ensure connection
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
      await new Promise((r) => setTimeout(r, 2000)); // Wait for connection
    }

    // Fetch rank
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "warguess_getrank",
      { bfId: "" },
      5000,
    );

    if (res && res.list) {
      let list = [];
      if (Array.isArray(res.list)) {
        list = res.list;
      } else {
        list = Object.values(res.list);
      }

      // Sort by totalNum desc
      warGuessList.value = list
        .sort((a, b) => (b.totalNum || 0) - (a.totalNum || 0))
        .slice(0, 20);
    } else {
      message.warning("获取月赛助威数据为空");
    }
  } catch (error) {
    console.error("Fetch rank error:", error);
    message.error(`获取月赛助威数据失败: ${error.message}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `获取月赛助威数据失败: ${error.message}`,
      type: "error",
    });
  } finally {
    warGuessLoading.value = false;
  }
};

const handleWarGuessCheer = async () => {
  if (!selectedWarGuessLegionId.value) {
    message.warning("请先选择一个俱乐部");
    return;
  }
  // Close modal
  showWarGuessModal.value = false;
  // Call the batch function
  await batchWarGuessCheer(selectedWarGuessLegionId.value, warGuessCoin.value);
};

// Settings Modal State
const showSettingsModal = ref(false);
const currentSettingsTokenId = ref(null);
const currentSettingsTokenName = ref("");
const currentSettings = reactive({
  arenaFormation: 1,
  towerFormation: 1,
  bossFormation: 1,
  bossTimes: 2,
  claimBottle: true,
  payRecruit: true,
  openBox: true,
  arenaEnable: true,
  claimHangUp: true,
  claimEmail: true,
  blackMarketPurchase: true,
});

const showTemplateManagerModal = ref(false);
const handleTemplateNotice = ({ type, text }) => {
  message[type](text);
};

// Helper Modal State
const showHelperModal = ref(false);
const helperType = ref("box"); // 'box' | 'fish' | 'recruit'
const helperSettings = reactive({
  boxType: 2001,
  fishType: 1,
  count: 100,
  targetPoints: 1000,
});

const helperModalTitle = computed(() => {
  const titles = {
    box: "批量开宝箱",
    fish: "批量钓鱼",
    recruit: "批量招募",
    pointsBox: "按积分开箱",
  };
  return titles[helperType.value] || "批量助手";
});

// Batch Settings State
const showBatchSettingsModal = ref(false);

const defaultDreamPurchaseList = [];
for (const merchantId in goldItemsConfig) {
  goldItemsConfig[merchantId].forEach((index) => {
    defaultDreamPurchaseList.push(`${merchantId}-${index}`);
  });
}

const batchSettings = reactive({
  dreamPurchaseList: defaultDreamPurchaseList,
  boxCount: 100,
  fishCount: 100,
  recruitCount: 100,
  defaultBoxType: 2001,
  defaultFishType: 1,
  targetBoxPoints: 1000,
  receiverId: "",
  password: "",
  tokenListColumns: 2,
  // 延迟配置（毫秒）
  commandDelay: 500, // 命令间延迟
  taskDelay: 500, // 任务间延迟
  actionDelay: 300, // 一般操作延迟（开箱、钓鱼、招募等）
  battleDelay: 500, // 战斗延迟（宝库、竞技场等）
  refreshDelay: 1000, // 刷新类任务延迟
  longDelay: 3000, // 长延迟（功法赠送等）
  // 其他配置
  maxActive: 2,
  connectionTimeout: 10000,
  reconnectDelay: 1000,
  maxLogEntries: 1000,
  // 页面刷新配置
  enableRefresh: false,
  refreshInterval: 360, // 分钟
});

// Load batch settings from localStorage
const loadBatchSettings = () => {
  try {
    const saved = localStorage.getItem("batchSettings");
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(batchSettings, parsed);
    }
  } catch (error) {
    console.error("Failed to load batch settings:", error);
  }
};

// Save batch settings to localStorage
const saveBatchSettings = () => {
  try {
    localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
    message.success("定时批量任务设置已保存");
    showBatchSettingsModal.value = false;
  } catch (error) {
    console.error("Failed to save batch settings:", error);
    message.error("保存设置失败");
  }
};

// Open batch settings modal
const openBatchSettings = () => {
  loadBatchSettings();
  showBatchSettingsModal.value = true;
};

// Load settings on component mount
loadBatchSettings();

// ======================
// Legacy Gift Feature
// ======================

// Legacy Gift Modal State
const showLegacyGiftModal = ref(false);
const recipientIdInput = ref("");
const recipientIdError = ref("");
const recipientInfo = ref(null);
const isQueryingRecipient = ref(false);
const giftQuantity = ref(10);
const securityPassword = ref(""); // 安全密码
// 头像加载状态
const isAvatarLoading = ref(false);
const avatarLoadError = ref(false);

// ======================
// Scheduled Tasks Feature
// ======================

const scheduledTasks = ref([]);
const schedulerManagerRef = ref(null);

const handleSchedulerNotice = ({ type, text }) => {
  message[type](text);
};

// ======================
// Scheduled Tasks Storage
// ======================

const retiredScheduledTaskNames = new Set([
  "batchSmartSendCar",
  "batchClaimCars",
  "batchbaoku13",
  "batchbaoku45",
]);

const withoutRetiredScheduledTasks = (task) => {
  const selectedTasks = Array.isArray(task?.selectedTasks)
    ? task.selectedTasks.filter(
        (taskName) => !retiredScheduledTaskNames.has(taskName),
      )
    : [];

  return {
    ...task,
    selectedTasks,
    enabled: selectedTasks.length > 0 ? task.enabled : false,
  };
};

// Track executing tasks for UI loading state
const executingTaskIds = ref([]);

// Manual execute task
const manualExecuteTask = async (task) => {
  if (executingTaskIds.value.includes(task.id))
    return;

  // Reset stop flag if not running, to allow manual execution
  if (!isRunning.value && shouldStop.value) {
    shouldStop.value = false;
  }

  executingTaskIds.value.push(task.id);
  try {
    message.info(`开始执行任务: ${task.name}`);
    await executeScheduledTask(task);
    message.success(`任务 ${task.name} 执行完成`);
  } catch (e) {
    console.error(`执行任务 ${task.name} 失败:`, e);
    message.error(`任务 ${task.name} 执行失败`);
  } finally {
    executingTaskIds.value = executingTaskIds.value.filter(
      (id) => id !== task.id,
    );
  }
};

// Load scheduled tasks from localStorage
const loadScheduledTasks = () => {
  try {
    const saved = localStorage.getItem("scheduledTasks");

    if (saved) {
      const parsed = JSON.parse(saved);

      // Ensure we have an array
      scheduledTasks.value = Array.isArray(parsed)
        ? parsed.map(withoutRetiredScheduledTasks)
        : [];
    } else {
      scheduledTasks.value = [];
    }
  } catch (error) {
    console.error("Failed to load scheduled tasks:", error);
    scheduledTasks.value = [];
  }
};

// Save scheduled tasks to localStorage
const saveScheduledTasks = () => {
  try {
    const dataToSave = JSON.stringify(scheduledTasks.value);

    localStorage.setItem("scheduledTasks", dataToSave);
  } catch (error) {
    console.error("Failed to save scheduled tasks:", error);
  }
};

const saveScheduledTask = ({ task, isNew }) => {
  const index = scheduledTasks.value.findIndex((item) => item.id === task.id);
  if (index >= 0)
    scheduledTasks.value[index] = task;
  else
    scheduledTasks.value.push(task);
  saveScheduledTasks();
  addTaskSaveLog(task, isNew, addLog);
  message.success("定时任务已保存");
};

// Delete task
const deleteTask = (taskId) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    scheduledTasks.value = scheduledTasks.value.filter((t) => t.id !== taskId);
    saveScheduledTasks();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已删除 ===`,
      type: "info",
    });
    message.success("定时任务已删除");
  }
};

// Toggle task enabled state
const toggleTaskEnabled = (taskId, enabled) => {
  const task = scheduledTasks.value.find((t) => t.id === taskId);
  if (task) {
    task.enabled = enabled;
    saveScheduledTasks();
    message.success(`定时任务已${enabled ? "启用" : "禁用"}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已${enabled ? "启用" : "禁用"} ===`,
      type: "info",
    });
  }
};

// ======================
// Import/Export Config
// ======================

// Export all tokens and scheduled tasks configuration
const exportConfig = () => {
  try {
    // Get all valid token IDs
    const validTokenIds = new Set(tokens.value.map((t) => t.id));

    // Filter scheduled tasks: remove invalid token IDs from selectedTokens
    const filteredScheduledTasks = scheduledTasks.value
      .map((task) => ({
        ...task,
        selectedTokens:
          task.selectedTokens?.filter((tokenId) =>
            validTokenIds.has(tokenId),
          ) || [],
      }))
      .filter((task) => task.selectedTokens.length > 0); // Remove tasks with no valid tokens

    // Gather token settings
    const tokenSettings = [];
    tokens.value.forEach((token) => {
      const settings = localStorage.getItem(`daily-settings:${token.id}`);
      if (settings) {
        try {
          tokenSettings.push({
            tokenId: token.id,
            settings: JSON.parse(settings),
          });
        } catch (e) {
          console.warn(`Failed to parse settings for token ${token.id}`, e);
        }
      }
    });

    const exportData = {
      version: "1.1",
      exportTime: new Date().toISOString(),
      tokens: tokens.value.map((t) => ({
        id: t.id,
        name: t.name,
        token: t.token,
        server: t.server,
        wsUrl: t.wsUrl,
        remark: t.remark,
        importMethod: t.importMethod,
        sourceUrl: t.sourceUrl,
        upgradedToPermanent: true,
        upgradedAt: t.upgradedAt,
        updatedAt: t.updatedAt,
      })),
      scheduledTasks: filteredScheduledTasks,
      batchSettings: {
        boxCount: batchSettings.boxCount,
        fishCount: batchSettings.fishCount,
        recruitCount: batchSettings.recruitCount,
        defaultBoxType: batchSettings.defaultBoxType,
        defaultFishType: batchSettings.defaultFishType,
        commandDelay: batchSettings.commandDelay,
        taskDelay: batchSettings.taskDelay,
        actionDelay: batchSettings.actionDelay,
        battleDelay: batchSettings.battleDelay,
        refreshDelay: batchSettings.refreshDelay,
        longDelay: batchSettings.longDelay,
        maxActive: batchSettings.maxActive,
        tokenListColumns: batchSettings.tokenListColumns,
      },
      tokenSettings,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `xyzw_config_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    message.success(
      `导出成功: ${exportData.tokens.length} 个账号, ${exportData.scheduledTasks.length} 个定时任务`,
    );
  } catch (error) {
    console.error("Export failed:", error);
    message.error(`导出失败: ${error.message}`);
  }
};

// Import tokens and scheduled tasks configuration
const importConfig = async ({ file }) => {
  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // Validate structure
        if (
          !importData.version
          || !importData.tokens
          || !importData.scheduledTasks
        ) {
          message.error("无效的配置文件格式");
          return;
        }

        let importedTokens = 0;
        let importedTasks = 0;

        // Import tokens
        if (Array.isArray(importData.tokens)) {
          importData.tokens.forEach((token) => {
            // Check if token already exists
            const exists = gameTokens.value.some(
              (t) => t.token === token.token || t.id === token.id,
            );
            if (!exists && token.token) {
              // Add new token directly to gameTokens (useLocalStorage)
              gameTokens.value.push({
                id:
                  token.id
                  || `token_${Date.now()}${Math.random().toString(36).slice(2)}`,
                name: token.name || "",
                token: token.token,
                server: token.server || "",
                wsUrl: token.wsUrl || null,
                remark: token.remark || "",
                importMethod: "import",
                sourceUrl: token.sourceUrl || null,
                upgradedToPermanent: true,
                upgradedAt: token.upgradedAt || null,
                updatedAt: token.updatedAt || new Date().toISOString(),
                createdAt: new Date().toISOString(),
                lastUsed: new Date().toISOString(),
              });
              importedTokens++;
            }
          });
        }

        // Import scheduled tasks
        if (Array.isArray(importData.scheduledTasks)) {
          importData.scheduledTasks.forEach((task) => {
            // Check if task already exists
            const exists = scheduledTasks.value.some((t) => t.id === task.id);
            if (!exists && task.id) {
              scheduledTasks.value.push(withoutRetiredScheduledTasks(task));
              importedTasks++;
            }
          });
          saveScheduledTasks();
        }

        // Import batch settings if provided
        if (importData.batchSettings) {
          Object.assign(batchSettings, importData.batchSettings);
          saveBatchSettings();
        }

        // Import token settings
        if (Array.isArray(importData.tokenSettings)) {
          importData.tokenSettings.forEach((item) => {
            if (item.tokenId && item.settings) {
              localStorage.setItem(
                `daily-settings:${item.tokenId}`,
                JSON.stringify(item.settings),
              );
            }
          });
        }

        message.success(
          `导入成功: ${importedTokens} 个新账号, ${importedTasks} 个新定时任务`,
        );
      } catch (parseError) {
        console.error("Parse error:", parseError);
        message.error("解析配置文件失败");
      }
    };
    reader.readAsText(file.file);
  } catch (error) {
    console.error("Import failed:", error);
    message.error(`导入失败: ${error.message}`);
  }
};

// ======================
// Scheduled Tasks Countdown
// ======================

// 注: parseCronField, calculateNextExecutionTime, formatTimeDifference 已从 @/utils/batch 导入

// Task countdowns ref
const taskCountdowns = ref({});
const nextExecutionTimes = ref({});

// Update countdowns for all tasks
const updateCountdowns = () => {
  const now = Date.now();

  scheduledTasks.value.forEach((task) => {
    if (!task.enabled) {
      // Clear countdown for disabled tasks
      delete taskCountdowns.value[task.id];
      return;
    }

    if (
      !nextExecutionTimes.value[task.id]
      || nextExecutionTimes.value[task.id] <= now
    ) {
      // Calculate next execution time if not set or passed
      nextExecutionTimes.value[task.id] = calculateNextExecutionTime(task);
    }

    if (nextExecutionTimes.value[task.id]) {
      const timeDiff = nextExecutionTimes.value[task.id] - now;
      taskCountdowns.value[task.id] = {
        remainingTime: Math.max(0, timeDiff),
        formatted: formatTimeDifference(Math.max(0, timeDiff)),
        isNearExecution: timeDiff < 5 * 60 * 1000, // Less than 5 minutes
      };
    }
  });
};

// Start countdown interval
let countdownInterval = null;

const startCountdown = () => {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update countdowns immediately
  updateCountdowns();

  // Update countdowns every second
  countdownInterval = setInterval(updateCountdowns, 1000);
};

// ======================
// Scheduled Tasks Scheduler
// ======================

// Initialize scheduled tasks from localStorage
loadScheduledTasks();

// Watch for changes to scheduledTasks for debugging
watch(
  scheduledTasks,
  () => {
    // Reset countdowns when tasks change
    nextExecutionTimes.value = {};
    taskCountdowns.value = {};
    updateCountdowns();
  },
  { deep: true },
);

// Task scheduler variables - moved to component level scope
const intervalId = ref(null);
let lastTaskExecution = null;
let healthCheckInterval = null;
const pageLoadTime = Date.now();

// Health check for the scheduler
const healthCheck = () => {
  // If interval is not running, restart it
  if (!intervalId.value) {
    console.error(
      `[${new Date().toISOString()}] Task scheduler interval is not running, restarting...`,
    );
    startScheduler();
  }

  // Add a safety mechanism to prevent isRunning from being stuck
  if (isRunning.value) {
    const now = Date.now();
    const tenMinutesAgo = now - 10 * 60 * 1000; // 10 minutes ago
    if (lastTaskExecution && lastTaskExecution < tenMinutesAgo) {
      console.error(
        `[${new Date().toISOString()}] isRunning has been true for more than 10 minutes, resetting to false`,
      );
      isRunning.value = false;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "=== 检测到任务执行超时，已重置isRunning状态 ===",
        type: "warning",
      });
    }
  }

  // Check for page refresh
  if (batchSettings.enableRefresh && batchSettings.refreshInterval > 0) {
    const elapsedMinutes = (Date.now() - pageLoadTime) / 1000 / 60;
    if (elapsedMinutes >= batchSettings.refreshInterval) {
      if (!isRunning.value) {
        console.log(
          `[${new Date().toISOString()}] Refreshing page as scheduled (Interval: ${batchSettings.refreshInterval}m, Elapsed: ${elapsedMinutes.toFixed(1)}m)`,
        );
        window.location.reload();
      } else {
        console.log(
          `[${new Date().toISOString()}] Scheduled refresh postponed due to running task`,
        );
      }
    }
  }
};

// Start the scheduler
const startScheduler = () => {
  // Clear any existing interval first
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }

  // Check every 10 seconds instead of 60 seconds for more timely task execution
  intervalId.value = setInterval(() => {
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Don't skip all tasks if isRunning is true, just skip individual task execution if already running
      const tasksToRun = scheduledTasks.value.filter((task) => task.enabled);

      if (tasksToRun.length === 0) {
        return;
      }

      tasksToRun.forEach((task) => {
        let shouldRun = false;

        if (task.runType === "daily") {
          // Check if current time matches the scheduled time
          const taskTime = task.runTime;
          const nowTime = now.toLocaleTimeString("zh-CN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
          shouldRun = nowTime === taskTime;
        } else if (task.runType === "cron") {
          // Improved cron expression parsing using shared utility
          try {
            shouldRun = matchesCronExpression(task.cronExpression, now);
          } catch (error) {
            console.error(
              `[${new Date().toISOString()}] Error parsing cron expression ${task.cronExpression}:`,
              error,
            );
            addLog({
              time: currentTime,
              message: `=== 解析定时任务 ${task.name} 的Cron表达式失败: ${error.message} ===`,
              type: "error",
            });
            return;
          }
        }

        if (shouldRun) {
          // Check if the task was already executed in the last minute to avoid duplicate execution
          const taskExecutionKey = `${task.id}_${now.getDate()}_${now.getHours()}_${now.getMinutes()}`;
          const lastExecutionKey = localStorage.getItem(
            `lastTaskExecution_${task.id}`,
          );

          if (lastExecutionKey !== taskExecutionKey) {
            // Update last execution time
            localStorage.setItem(
              `lastTaskExecution_${task.id}`,
              taskExecutionKey,
            );

            // Execute the task
            lastTaskExecution = Date.now();
            executeScheduledTask(task);
          } else {
            // Only log once per minute to avoid spamming logs
            // But since we check every 10s, this might log multiple times if we don't track logged state
            // For now, we can skip logging "already executed" to keep logs clean
          }
        }
      });
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error in task scheduler:`,
        error,
      );
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务调度服务发生错误: ${error.message} ===`,
        type: "error",
      });
    }
  }, 10000); // Check every 10 seconds
};

// Token刷新等待处理函数
const handleTokenRefreshWaiting = (data) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `Token刷新限流等待中，预计等待 ${data.waitSeconds} 秒（队列: ${data.queueSize}）`,
    type: "warning",
  });
};

// Debug: Log initial state when component mounts
onMounted(() => {
  // Start the task scheduler after all functions are initialized
  scheduleTaskExecution();
  // Start countdown timer
  startCountdown();
  // 监听Token刷新等待事件
  $emit.on("token:refresh:waiting", handleTokenRefreshWaiting);
});

// Cleanup countdown interval on unmount
onBeforeUnmount(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // 移除Token刷新等待事件监听
  $emit.off("token:refresh:waiting", handleTokenRefreshWaiting);

  // Cleanup task scheduler intervals
  if (intervalId.value) {
    clearInterval(intervalId.value);
    intervalId.value = null;
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "=== 定时任务调度服务已停止 ===",
      type: "info",
    });
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
});

// Task scheduler - ensure it runs properly
const scheduleTaskExecution = () => {
  // Log the start of the scheduler
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "=== 定时任务调度服务已启动 ===",
    type: "info",
  });

  // Start the scheduler
  startScheduler();

  // Health check every 5 minutes instead of 1 hour for more frequent safety checks
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  healthCheckInterval = setInterval(healthCheck, 5 * 60 * 1000);

  // Initial health check
  healthCheck();
};

// Verify task dependencies - 只验证基础依赖，WebSocket连接由具体任务函数处理
const verifyTaskDependencies = async (task) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始验证定时任务 ${task.name} 的依赖 ===`,
    type: "info",
  });

  // Verify localStorage is available
  try {
    localStorage.setItem("test", "test");
    localStorage.removeItem("test");
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "✅ localStorage可用",
      type: "info",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `❌ localStorage不可用: ${error.message}`,
      type: "error",
    });
    return false;
  }

  // Verify token store is available
  if (!tokenStore || !tokenStore.gameTokens) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: "❌ Token存储不可用",
      type: "error",
    });
    return false;
  }

  // Verify task functions exist
  for (const taskName of task.selectedTasks) {
    const taskFunction = getScheduledTaskFunction(taskName);
    if (typeof taskFunction !== "function") {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `❌ 任务函数不存在: ${taskName}`,
        type: "error",
      });
      return false;
    }
  }

  // 直接使用所有选中的token，WebSocket连接由具体任务函数内部管理
  // ensureConnection函数会自动处理并行连接和连接池管理
  const connectedTokens = task.selectedTokens.map((tokenId) => {
    const tokenName
      = tokenStore.gameTokens.find((t) => t.id === tokenId)?.name || tokenId;
    return { id: tokenId, name: tokenName };
  });

  // Log connection status
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `✅ 将使用 ${connectedTokens.length} 个账号执行任务`,
    type: "info",
  });

  // Store connected tokens for execution
  task.connectedTokens = connectedTokens.map((t) => t.id);

  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 定时任务 ${task.name} 的依赖验证通过，将执行 ${connectedTokens.length} 个账号 ===`,
    type: "success",
  });
  return true;
};

// Execute a scheduled task with dependency verification
const executeScheduledTask = async (task) => {
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始执行定时任务: ${task.name} ===`,
    type: "info",
  });

  try {
    // Verify dependencies before executing task
    const dependenciesValid = await verifyTaskDependencies(task);
    if (!dependenciesValid) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 依赖验证失败，取消执行 ===`,
        type: "error",
      });
      return;
    }

    // Filter out tokens that don't exist in current tokens.value
    const availableTokens = (
      task.connectedTokens || task.selectedTokens
    ).filter((tokenId) => {
      return tokens.value.some((t) => t.id === tokenId);
    });

    const missingTokens = (task.connectedTokens || task.selectedTokens).filter(
      (tokenId) => {
        return !tokens.value.some((t) => t.id === tokenId);
      },
    );

    if (missingTokens.length > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `⚠️  跳过不存在的Token: ${missingTokens.join(", ")}`,
        type: "warning",
      });
    }

    if (availableTokens.length === 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 定时任务 ${task.name} 没有可用的Token，取消执行 ===`,
        type: "error",
      });
      return;
    }

    // Always use the latest selectedTokens from the task that exist in current tokens.value
    selectedTokens.value = [...availableTokens];

    // Execute selected tasks in parallel
    const taskPromises = task.selectedTasks.map(async (taskName) => {
      if (shouldStop.value)
        return;

      if (
        ["batchmengjing", "batchBuyDreamItems"].includes(taskName)
        && !ismengjingActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在梦境开放时间)`,
          type: "warning",
        });
        return;
      }

      if (
        ["batchTopUpArena", "batcharenafight"].includes(taskName)
        && !isarenaActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在竞技场开放时间)`,
          type: "warning",
        });
        return;
      }

      if (
        [
          "climbWeirdTower",
          "batchUseItems",
          "batchMergeItems",
          "batchClaimFreeEnergy",
        ].includes(taskName)
        && !isWeirdTowerActivityOpen.value
      ) {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `跳过任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName} (不在怪异塔开放时间)`,
          type: "warning",
        });
        return;
      }

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `执行任务: ${availableTasks.find((t) => t.value === taskName)?.label || taskName}`,
        type: "info",
      });

      // Call the task function from the explicit scheduled task registry
      const taskFunction = getScheduledTaskFunction(taskName);
      if (typeof taskFunction === "function") {
        // For batch operations, pass isScheduledTask = true
        // 具体的batch任务函数内部会使用ensureConnection管理并行连接
        if (
          [
            "batchOpenBox",
            "batchOpenBoxByPoints",
            "batchFish",
            "batchRecruit",
            "batchLegacyGiftSendEnhanced",
          ].includes(taskName)
        ) {
          await taskFunction(true);
        } else {
          await taskFunction();
        }
      } else {
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `任务函数不存在: ${taskName}`,
          type: "error",
        });
      }
    });

    // Wait for all tasks to complete
    await Promise.all(taskPromises);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行完成: ${task.name} ===`,
      type: "success",
    });
  } catch (error) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务执行失败: ${error.message} ===`,
      type: "error",
    });
    console.error(
      `[${new Date().toISOString()}] Error executing scheduled task ${task.name}:`,
      error,
    );
  }
};

// 注: boxTypeOptions, fishTypeOptions 已从 @/utils/batch 导入

const openHelperModal = (type) => {
  helperType.value = type;
  showHelperModal.value = true;
};

// 批量功法残卷赠送相关方法
const clearRecipientError = () => {
  recipientIdError.value = "";
};

// 头像处理方法
const handleAvatarLoad = () => {
  isAvatarLoading.value = false;
  avatarLoadError.value = false;
};

const handleAvatarError = () => {
  isAvatarLoading.value = false;
  avatarLoadError.value = true;
};

const resetAvatarState = () => {
  isAvatarLoading.value = true;
  avatarLoadError.value = false;
};

const queryRecipientInfo = async () => {
  // 1. 输入验证
  if (!recipientIdInput.value || recipientIdInput.value === "") {
    recipientIdError.value = "请输入接收者ID";
    return;
  }

  const recipientId = Number(recipientIdInput.value);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    recipientIdError.value = "请输入有效的数字ID";
    return;
  }

  // 2. 检查选中账号
  if (selectedTokens.value.length === 0) {
    recipientIdError.value = "请先选择要操作的角色";
    return;
  }

  // 3. 初始化状态
  isQueryingRecipient.value = true;
  recipientIdError.value = "";
  recipientInfo.value = null;
  // 重置头像状态
  resetAvatarState();

  const firstTokenId = selectedTokens.value[0];
  const token = tokens.value.find((t) => t.id === firstTokenId);

  // 记录开始查询
  addLog({
    time: new Date().toLocaleTimeString(),
    message: `=== 开始查询接收者信息: 使用账号 ${token.name} (ID: ${firstTokenId}) ===`,
    type: "info",
  });

  try {
    // 确保WebSocket连接
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在建立WebSocket连接...`,
      type: "info",
    });

    // 使用现有的ensureConnection函数，它已经包含了重连机制
    await ensureConnection(firstTokenId);

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `WebSocket连接成功`,
      type: "success",
    });

    // 发送查询命令
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在发送查询命令，接收者ID: ${recipientId}`,
      type: "info",
    });

    // 延长超时时间到10秒，确保有足够时间处理
    const resp = await tokenStore.sendMessageWithPromise(
      firstTokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId: recipientId,
      },
      10000,
    );

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `查询命令发送成功，正在处理响应...`,
      type: "info",
    });

    // 处理查询结果
    console.log("rank_getroleinfo 响应结果:", resp);

    // 兼容不同的响应结构
    const roleData = resp?.role || resp?.roleInfo;

    if (roleData) {
      // 构建完整的角色信息，移除等级和VIP字段
      recipientInfo.value = {
        roleId: roleData.roleId || roleData.role?.roleId,
        name: roleData.name || roleData.role?.name,
        // 添加头像URL
        avatarUrl:
          resp?.roleInfo?.headImg
          || roleData?.headImg
          || roleData?.role?.headImg
          || "",
        // 战力转换为亿为单位
        power: (function (p) {
          const billion = 100000000;
          return (p / billion).toFixed(2);
        })(roleData.power || roleData.role?.power || 0),
        powerUnit: "亿",
        // 扩展更多角色信息
        serverName: roleData.serverName || roleData.role?.serverName || "",
        legionName: resp?.legionInfo?.name || "",
        legionId: resp?.legionInfo?.id || 0,
      };

      // 格式化角色名，处理特殊字符
      const displayName = recipientInfo.value.name || "未知角色";

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询成功: 找到角色 ${displayName} (ID: ${recipientInfo.value.roleId})，战力: ${recipientInfo.value.power}${recipientInfo.value.powerUnit} ===`,
        type: "success",
      });

      message.success("查询成功");
    } else {
      const errorMsg = "未找到该角色信息";
      recipientIdError.value = errorMsg;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询失败: ${errorMsg} ===`,
        type: "error",
      });

      message.error(errorMsg);
    }
  } catch (error) {
    // 详细的错误处理
    console.error("查询接收者信息失败:", error);

    let errorMsg = "查询失败";
    let logType = "error";

    // 根据错误类型提供更友好的错误信息
    if (error.message.includes("连接失败")) {
      errorMsg = "WebSocket连接失败，请检查网络或账号状态";
    } else if (
      error.message.includes("timeout")
      || error.message.includes("超时")
    ) {
      errorMsg = "查询超时，请稍后重试";
      logType = "warning";
    } else if (error.message.includes("200160")) {
      errorMsg = "功法系统未开启";
    } else {
      errorMsg = `查询失败: ${error.message}`;
    }

    recipientIdError.value = errorMsg;

    // 记录错误日志
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== ${errorMsg} ===`,
      type: logType,
    });

    // 显示用户友好的错误提示
    message.error(errorMsg);
  } finally {
    isQueryingRecipient.value = false;

    // 记录查询完成
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 查询操作完成 ===`,
      type: "info",
    });
  }
};

const confirmLegacyGift = async () => {
  if (!recipientIdInput.value || !recipientInfo.value) {
    message.error("请先查询并确认接收者信息");
    return;
  }

  if (!securityPassword.value) {
    message.error("请输入安全密码");
    return;
  }

  // 调用增强版批量赠送功能
  await batchLegacyGiftSendEnhanced();

  // 关闭模态框
  showLegacyGiftModal.value = false;
  // 清空安全密码
  securityPassword.value = "";
};

const executeHelper = () => {
  if (helperType.value !== "pointsBox") {
    if (helperSettings.count % 10 !== 0 || helperSettings.count < 10) {
      message.warning("消耗数量必须是10的整数倍，最小为10");
      return;
    }
  }
  showHelperModal.value = false;
  if (helperType.value === "box") {
    batchOpenBox();
  } else if (helperType.value === "fish") {
    batchFish();
  } else if (helperType.value === "recruit") {
    batchRecruit();
  } else if (helperType.value === "pointsBox") {
    batchOpenBoxByPoints();
  }
};

// Dream Buy Modal Logic
const showDreamBuyModal = ref(false);
const dreamBuyList = ref([]);

const openDreamBuyModal = () => {
  // Load saved settings
  dreamBuyList.value = batchSettings.dreamPurchaseList || [];
  showDreamBuyModal.value = true;
};

const toggleDreamItem = (itemKey, checked) => {
  if (checked) {
    if (!dreamBuyList.value.includes(itemKey)) {
      dreamBuyList.value.push(itemKey);
    }
  } else {
    dreamBuyList.value = dreamBuyList.value.filter((k) => k !== itemKey);
  }
};

const saveDreamBuyConfig = () => {
  // Save settings
  batchSettings.dreamPurchaseList = [...dreamBuyList.value];
  saveBatchSettings();

  showDreamBuyModal.value = false;
  message.success("梦境购买配置已保存");
};

const selectGoldItems = () => {
  const newSelection = new Set(dreamBuyList.value);

  for (const merchantId in goldItemsConfig) {
    const items = goldItemsConfig[merchantId];
    items.forEach((index) => {
      newSelection.add(`${merchantId}-${index}`);
    });
  }

  dreamBuyList.value = Array.from(newSelection);
};

const selectAllItems = () => {
  const newSelection = new Set(dreamBuyList.value);

  for (const merchantId in merchantConfig) {
    const items = merchantConfig[merchantId].items;
    items.forEach((_, index) => {
      newSelection.add(`${merchantId}-${index}`);
    });
  }

  dreamBuyList.value = Array.from(newSelection);
};

const clearAllItems = () => {
  dreamBuyList.value = [];
};

// 注: formationOptions, bossTimesOptions 已从 @/utils/batch 导入

const loadSettings = (tokenId) => {
  try {
    const raw = localStorage.getItem(`daily-settings:${tokenId}`);
    const defaultSettings = {
      arenaFormation: 1,
      towerFormation: 1,
      bossFormation: 1,
      bossTimes: 2,
      claimBottle: true,
      payRecruit: true,
      openBox: true,
      arenaEnable: true,
      claimHangUp: true,
      claimEmail: true,
      blackMarketPurchase: true,
    };
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return null;
  }
};

const openSettings = (token) => {
  currentSettingsTokenId.value = token.id;
  currentSettingsTokenName.value = token.name;
  const saved = loadSettings(token.id);
  Object.assign(currentSettings, saved);
  showSettingsModal.value = true;
};

const saveSettings = () => {
  if (currentSettingsTokenId.value) {
    localStorage.setItem(
      `daily-settings:${currentSettingsTokenId.value}`,
      JSON.stringify(currentSettings),
    );
    message.success(`已保存 ${currentSettingsTokenName.value} 的设置`);
    showSettingsModal.value = false;
  }
};

const currentRunningTokenId = ref(null);
const currentProgress = ref(0);
const logs = ref([]);
const showLogPanel = ref(true);
const completedTokenCount = computed(
  () => Object.values(tokenStatus.value).filter((status) => status === "completed").length,
);
const failedTokenCount = computed(
  () => Object.values(tokenStatus.value).filter((status) => status === "failed").length,
);

const currentRunningTokenName = computed(() => {
  const t = tokens.value.find((x) => x.id === currentRunningTokenId.value);
  return t ? t.name : "";
});

// =====================
// Token分组管理相关方法
// =====================

/**
 * 创建新分组
 */
const createNewGroup = () => {
  if (!newGroupName.value.trim()) {
    message.warning("请输入分组名称");
    return;
  }

  const newGroup = tokenStore.createTokenGroup(
    newGroupName.value.trim(),
    newGroupColor.value,
  );

  // 添加选中的Token到新分组
  if (newGroupSelectedTokens.value.length > 0) {
    newGroupSelectedTokens.value.forEach((tokenId) => {
      tokenStore.addTokenToGroup(newGroup.id, tokenId);
    });
  }

  message.success("分组创建成功");
  newGroupName.value = "";
  newGroupColor.value = "#1677ff";
  newGroupSelectedTokens.value = [];
};

const selectAllNewGroup = () => {
  newGroupSelectedTokens.value = sortedTokens.value.map((t) => t.id);
};

const deselectAllNewGroup = () => {
  newGroupSelectedTokens.value = [];
};

/**
 * 删除分组
 */
const deleteGroup = (groupId) => {
  if (confirm("确定要删除这个分组吗？分组中的token不会被删除。")) {
    tokenStore.deleteTokenGroup(groupId);
    message.success("分组已删除");
  }
};

/**
 * 保存编辑的分组
 */
const saveEditGroup = () => {
  if (!editingGroupId.value)
    return;

  if (!editingGroupName.value.trim()) {
    message.warning("请输入分组名称");
    return;
  }

  tokenStore.updateTokenGroup(editingGroupId.value, {
    name: editingGroupName.value.trim(),
    color: editingGroupColor.value,
  });

  message.success("分组已更新");
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

/**
 * 开始编辑分组
 */
const startEditGroup = (groupId) => {
  const group = tokenGroups.value.find((g) => g.id === groupId);
  if (group) {
    editingGroupId.value = groupId;
    editingGroupName.value = group.name;
    editingGroupColor.value = group.color;
  }
};

/**
 * 取消编辑分组
 */
const cancelEditGroup = () => {
  editingGroupId.value = null;
  editingGroupName.value = "";
  editingGroupColor.value = "";
};

/**
 * 切换分组选择状态
 */
const toggleGroupSelection = (groupId) => {
  const index = selectedGroups.value.indexOf(groupId);
  if (index > -1) {
    selectedGroups.value.splice(index, 1);
  } else {
    selectedGroups.value.push(groupId);
  }

  // 更新selectedTokens
  updateSelectedTokensFromGroups();
};

/**
 * 根据选中的分组更新selectedTokens
 */
const updateSelectedTokensFromGroups = () => {
  const tokenIds = new Set();

  selectedGroups.value.forEach((groupId) => {
    const validTokenIds = tokenStore.getValidGroupTokenIds(groupId);
    validTokenIds.forEach((id) => tokenIds.add(id));
  });

  selectedTokens.value = Array.from(tokenIds);
};

/**
 * 一键清除所有分组选择
 */
const clearAllGroupSelection = () => {
  selectedGroups.value = [];
  selectedTokens.value = [];
};

/**
 * 添加token到分组
 */
const addTokenToSelectedGroup = (groupId, tokenId) => {
  tokenStore.addTokenToGroup(groupId, tokenId);
  message.success("已将token添加到分组");
};

/**
 * 从分组移除token
 */
const removeTokenFromSelectedGroup = (groupId, tokenId) => {
  tokenStore.removeTokenFromGroup(groupId, tokenId);
  message.success("已将token从分组移除");
};

/**
 * 获取分组中有效的token ID列表（用于模板中展示）
 */
const getValidGroupTokenIds = (groupId) => {
  return tokenStore.getValidGroupTokenIds(groupId);
};

// 注: pickArenaTargetId, FISH_TARGET, ARENA_TARGET, getTodayStartSec, isTodayAvailable, calculateMonthProgress 已从 @/utils/batch 导入

const addLog = (log) => {
  logs.value.push(log);

  const maxLogEntries = batchSettings.maxLogEntries || 1000;
  if (logs.value.length > maxLogEntries) {
    logs.value = logs.value.slice(-maxLogEntries);
  }
};

const copyLogs = () => {
  if (logs.value.length === 0) {
    message.warning("没有可复制的日志");
    return;
  }
  const logText = logs.value
    .map((log) => `${log.time} ${log.message}`)
    .join("\n");
  navigator.clipboard
    .writeText(logText)
    .then(() => {
      message.success("日志已复制到剪贴板");
    })
    .catch((err) => {
      message.error(`复制日志失败: ${err.message}`);
    });
};

const clearLogs = () => {
  logs.value = [];
  message.success("日志已清空");
};

const waitForConnection = async (
  tokenId,
  timeout = batchSettings.connectionTimeout,
) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status === "connected")
      return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

// 全局连接队列控制 - 限制并发连接数
const connectionQueue = { active: 0 };

const waitForConnectionSlot = async () => {
  while (connectionQueue.active >= batchSettings.maxActive) {
    await new Promise((r) => setTimeout(r, 1000));
  }
  connectionQueue.active++;
};

const releaseConnectionSlot = () => {
  if (connectionQueue.active > 0) {
    connectionQueue.active--;
  }
};

const ensureConnection = async (tokenId, maxRetries = 2) => {
  const latestToken = tokens.value.find((t) => t.id === tokenId);
  if (!latestToken) {
    throw new Error(`Token not found: ${tokenId}`);
  }

  const status = tokenStore.getWebSocketStatus(tokenId);
  let connected = status === "connected";

  if (!connected) {
    // 等待连接槽位，限制并发连接数
    await waitForConnectionSlot();

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `正在连接... (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
      type: "info",
    });

    tokenStore.createWebSocketConnection(
      tokenId,
      latestToken.token,
      latestToken.wsUrl,
    );
    connected = await waitForConnection(tokenId);

    if (!connected && maxRetries > 0) {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `连接超时，尝试重连...`,
        type: "warning",
      });

      tokenStore.closeWebSocketConnection(tokenId);
      await new Promise((r) => setTimeout(r, batchSettings.reconnectDelay));

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在重连...`,
        type: "info",
      });

      const refreshedToken = tokens.value.find((t) => t.id === tokenId);
      tokenStore.createWebSocketConnection(
        tokenId,
        refreshedToken.token,
        refreshedToken.wsUrl,
      );

      connected = await waitForConnection(tokenId);
    }

    if (!connected) {
      // 连接失败，释放槽位
      releaseConnectionSlot();
      throw new Error("连接失败 (重试后仍超时)");
    }
  }

  // 连接成功，槽位保持占用，直到任务完成后手动释放

  // Initialize Game Data (Critical for Battle Version and Session)
  try {
    // Fetch Role Info first (Standard flow)
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
      5000,
    );

    // Fetch Battle Version
    const res = await tokenStore.sendMessageWithPromise(
      tokenId,
      "fight_startlevel",
      {},
      5000,
    );
    if (res?.battleData?.version) {
      tokenStore.setBattleVersion(res.battleData.version);
    }
  } catch (e) {
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `初始化数据失败: ${e.message}`,
      type: "warning",
    });
  }

  return true;
};

const createTaskDeps = () => ({
  selectedTokens,
  tokens,
  tokenStatus,
  isRunning,
  shouldStop,
  ensureConnection,
  releaseConnectionSlot,
  connectionQueue,
  batchSettings,
  tokenStore,
  addLog,
  message,
  currentRunningTokenId,
  // 延迟配置
  delayConfig: {
    command: batchSettings.commandDelay,
    task: batchSettings.taskDelay,
    action: batchSettings.actionDelay,
    battle: batchSettings.battleDelay,
    refresh: batchSettings.refreshDelay,
    long: batchSettings.longDelay,
  },
  // 其他特定依赖
  logs,
  nextTick,
  // 设置相关
  currentSettings,
  helperSettings,
  weirdTowerMaxClimb,
  // 功法赠送相关
  recipientIdInput,
  recipientInfo,
  securityPassword,
  giftQuantity,
  // 竞技场相关辅助函数
  pickArenaTargetId,
  getTodayStartSec,
  isTodayAvailable,
  calculateMonthProgress,
  // 配置加载函数
  loadSettings,
});

// 初始化任务模块
const tasksHangUp = createTasksHangUp(createTaskDeps());
const {
  claimHangUpRewards,
  batchAddHangUpTime,
  batchStudy,
  batchclubsign,
  batchWarGuessCheer,
} = tasksHangUp;

const tasksBottle = createTasksBottle(createTaskDeps());
const { resetBottles, batchlingguanzi } = tasksBottle;

const tasksTower = createTasksTower(createTaskDeps());
const {
  climbTower,
  climbWeirdTower,
  batchClaimFreeEnergy,
  skinChallenge,
  batchUseItems,
  batchMergeItems,
} = tasksTower;

const tasksItem = createTasksItem(createTaskDeps());
const {
  batchOpenBox,
  batchOpenBoxByPoints,
  batchClaimBoxPointReward,
  batchFish,
  batchRecruit,
  batchHeroUpgrade,
  batchBookUpgrade,
  batchClaimStarRewards,
  batchClaimPeachTasks,
  batchGenieSweep,
} = tasksItem;

const tasksDungeon = createTasksDungeon(createTaskDeps());
const { batchmengjing, batchBuyDreamItems } = tasksDungeon;

const tasksArena = createTasksArena(createTaskDeps());
const { batcharenafight, batchTopUpFish, batchTopUpArena } = tasksArena;

const tasksStore = createTasksStore(createTaskDeps());
const {
  legion_storebuygoods,
  legionStoreBuySkinCoins,
  store_purchase,
  collection_claimfreereward,
} = tasksStore;

const tasksLegacy = createTasksLegacy(createTaskDeps());
const { batchLegacyClaim, batchLegacyGiftSendEnhanced } = tasksLegacy;

const batchFunctionActions = {
  claimHangUpRewards,
  batchAddHangUpTime,
  resetBottles,
  batchlingguanzi,
  batchclubsign,
  batchStudy,
  batcharenafight,
  storePurchase: store_purchase,
  claimCollectionReward: collection_claimfreereward,
  batchGenieSweep,
  climbTower,
  batchmengjing,
  skinChallenge,
  claimPeachTasks: batchClaimPeachTasks,
  buyDreamItems: batchBuyDreamItems,
  climbWeirdTower,
  useWeirdTowerItems: batchUseItems,
  mergeWeirdTowerItems: batchMergeItems,
  claimWeirdTowerEnergy: batchClaimFreeEnergy,
  openBoxes: () => openHelperModal("box"),
  openPointBoxes: () => openHelperModal("pointsBox"),
  claimBoxPointReward: batchClaimBoxPointReward,
  fish: () => openHelperModal("fish"),
  recruit: () => openHelperModal("recruit"),
  heroUpgrade: batchHeroUpgrade,
  bookUpgrade: batchBookUpgrade,
  claimStarRewards: batchClaimStarRewards,
  buyHolyBeastItems: legion_storebuygoods,
  buySkinCoins: legionStoreBuySkinCoins,
  claimLegacy: batchLegacyClaim,
  openLegacyGift: () => {
    showLegacyGiftModal.value = true;
  },
  topUpFish: batchTopUpFish,
  topUpArena: batchTopUpArena,
  openWarGuess: openWarGuessModal,
};

const handleBatchFunctionAction = (action) => {
  batchFunctionActions[action]?.();
};

const getScheduledTaskFunction = (taskName) => {
  const taskRegistry = {
    startBatch,
    claimHangUpRewards,
    batchAddHangUpTime,
    batchStudy,
    batchclubsign,
    batchWarGuessCheer,
    resetBottles,
    batchlingguanzi,
    climbTower,
    climbWeirdTower,
    batchClaimFreeEnergy,
    skinChallenge,
    batchUseItems,
    batchMergeItems,
    batchOpenBox,
    batchOpenBoxByPoints,
    batchClaimBoxPointReward,
    batchFish,
    batchRecruit,
    batchHeroUpgrade,
    batchBookUpgrade,
    batchClaimStarRewards,
    batchClaimPeachTasks,
    batchGenieSweep,
    batchmengjing,
    batchBuyDreamItems,
    batcharenafight,
    batchTopUpFish,
    batchTopUpArena,
    legion_storebuygoods,
    legionStoreBuySkinCoins,
    store_purchase,
    collection_claimfreereward,
    batchLegacyClaim,
    batchLegacyGiftSendEnhanced,
  };

  return taskRegistry[taskName];
};

const startBatch = async () => {
  if (selectedTokens.value.length === 0)
    return;

  isRunning.value = true;
  shouldStop.value = false;
  // 不再重置logs数组，保留之前的日志
  // logs.value = [];

  // Reset status
  selectedTokens.value.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });

  // 并行执行任务，但通过connectionQueue限制并发连接数
  const taskPromises = selectedTokens.value.map(async (tokenId) => {
    if (shouldStop.value)
      return;

    tokenStatus.value[tokenId] = "running";

    let retryCount = 0;
    const MAX_RETRIES = 1;
    let success = false;

    while (retryCount <= MAX_RETRIES && !success) {
      if (shouldStop.value)
        break;

      const token = tokens.value.find((t) => t.id === tokenId);

      try {
        if (retryCount === 0) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 开始执行: ${token.name} ===`,
            type: "info",
          });
        } else {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `=== 尝试重试: ${token.name} (第${retryCount}次) ===`,
            type: "info",
          });
        }

        await ensureConnection(tokenId);

        // Create runner with delay settings
        const runner = new DailyTaskRunner(tokenStore, {
          commandDelay: batchSettings.commandDelay,
          taskDelay: batchSettings.taskDelay,
        });

        // Run tasks
        await runner.run(tokenId, {
          onLog: (log) => addLog(log),
          onProgress: () => {
            // 每个token维护自己的进度
          },
        });

        success = true;
        tokenStatus.value[tokenId] = "completed";
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== ${token.name} 执行完成 ===`,
          type: "success",
        });
      } catch (error) {
        console.error(error);
        if (retryCount < MAX_RETRIES && !shouldStop.value) {
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行出错: ${error.message}，等待3秒后重试...`,
            type: "warning",
          });
          // Wait for potential token refresh in store
          await new Promise((r) => setTimeout(r, 3000));
          retryCount++;
        } else {
          tokenStatus.value[tokenId] = "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 执行失败: ${error.message}`,
            type: "error",
          });
        }
      } finally {
        // 完成后关闭连接并释放槽位
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `${token.name} 连接已关闭  (队列: ${connectionQueue.active}/${batchSettings.maxActive})`,
          type: "info",
        });
      }
    }
  });

  // 等待所有任务完成
  await Promise.all(taskPromises);

  // 等待所有任务完成后再继续
  await new Promise((r) => setTimeout(r, 1000));

  isRunning.value = false;
  currentRunningTokenId.value = null;
  message.success("批量任务执行结束");
};

const stopBatch = () => {
  shouldStop.value = true;
  addLog({
    time: new Date().toLocaleTimeString(),
    message: "正在停止...",
    type: "warning",
  });
};
</script>

<style scoped>
.batch-tool-button {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  color: var(--on-surface-variant);
  border-radius: var(--radius);
  transition: color 160ms ease, background 160ms ease;
}

.batch-tool-upload {
  width: 40px;
  flex: 0 0 40px;
}

.batch-tool-button:hover {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}

.batch-sort-active {
  color: var(--on-primary) !important;
}

@media (max-width: 768px) {
  .batch-tool-button {
    flex-basis: 34px;
    width: 34px;
    height: 34px;
  }

  .batch-tool-upload {
    width: 34px;
    flex-basis: 34px;
  }

}

.main-layout {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

.left-column {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  padding-right: 8px;
}

.right-column {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 700px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  color: var(--on-surface);
  font-size: 20px;
}

.page-header > div,
.page-header > div > div {
  border-color: var(--outline-variant) !important;
}

.page-header > div > div[style*="background-color"],
.page-header > div[style*="background-color"] {
  background-color: var(--surface-container-low) !important;
}

.batch-daily-tasks :deep(.n-card) {
  background: var(--surface-container-low);
  border-color: var(--outline-variant);
  border-top: 2px solid var(--secondary) !important;
}

.batch-daily-tasks :deep(.n-card-header__main),
.batch-daily-tasks :deep(.n-tabs-tab__label),
.batch-daily-tasks :deep(.n-checkbox__label) {
  color: var(--on-surface);
}

.batch-daily-tasks [style*="color: #495057"],
.batch-daily-tasks [style*="color: #333"],
.batch-daily-tasks [style*="color: #1d2129"] {
  color: var(--on-surface) !important;
}

.batch-daily-tasks [style*="color: #6c757d"],
.batch-daily-tasks [style*="color: #86909c"] {
  color: var(--on-surface-variant) !important;
}

.token-item {
  display: flex;
  align-items: center;
}

.log-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.custom-card-header {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}

.log-card :deep(.n-card__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-container {
  flex: 1;
  overflow-y: auto;
  background: var(--surface-container-lowest);
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  font-family: monospace;
  min-height: 200px;
}

.log-item {
  margin-bottom: 4px;
  font-size: 12px;
}

.log-item.error {
  color: #d03050;
}

.log-item.success {
  color: #18a058;
}

.log-item.warning {
  color: #f0a020;
}

.log-item.info {
  color: var(--on-surface);
}

.time {
  color: #999;
  margin-right: 8px;
}

.token-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 8px;
}

/* Settings Modal Styles */
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-size: 14px;
  color: #666;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .right-column {
    width: 380px;
  }
}

@media (max-width: 992px) {
  .batch-daily-tasks {
    height: auto;
    overflow: visible;
  }

  .main-layout {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .left-column {
    overflow-y: visible;
    padding-right: 0;
  }

  .right-column {
    width: 100%;
    height: auto;
    flex-shrink: 0;
  }

  .log-container {
    height: 300px;
    min-height: 300px;
  }
}

@media (max-width: 768px) {
  .batch-daily-tasks {
    padding: 12px;
    min-height: calc(100vh - 62px);
    height: auto;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .main-layout {
    height: auto;
    overflow: visible;
    flex-direction: column;
  }

  .left-column {
    overflow: visible;
    padding-right: 0;
    flex: none;
    height: auto;
  }

  .right-column {
    height: auto;
    width: 100%;
    flex: none;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .page-header > div,
  .page-header > div > div {
    width: 100%;
    align-items: stretch !important;
    flex-direction: column;
  }

  .page-header > div > div > div:last-child {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .page-header .actions {
    display: flex;
    gap: 8px;
  }

  .log-card {
    height: auto !important;
  }

  .log-card :deep(.n-card__content) {
    flex: none !important;
    overflow: visible !important;
    display: block !important;
  }

  .log-container {
    height: 300px;
    min-height: 300px;
    flex: none !important;
  }

  .log-header-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  /* 批量功法残卷赠送样式 */
  .recipient-info:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  }

  /* 头像悬停效果 */
  .avatar-container:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
  }

  /* 加载动画 */
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }

    100% {
      transform: rotate(360deg);
    }
  }

  /* Token分组管理样式 */
  .group-selection-section {
    padding: 12px;
    background-color: #f5f7fa;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .group-tag {
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s ease;
    user-select: none;
    text-align: center;
    font-weight: 500;
  }

  .group-tag:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .group-tag-selected {
    color: white;
    font-weight: 600;
  }

  /* 响应式设计 */
  @media (max-width: 600px) {
    .recipient-info {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .avatar-container {
      margin-bottom: 12px;
    }
  }
}
</style>
