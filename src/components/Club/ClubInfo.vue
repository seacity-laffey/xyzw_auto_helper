<template>
  <MyCard class="club-info" :status-class="{ active: !!club }">
    <template #icon>
      <img alt="俱乐部图标" src="/icons/1733492491706152.png">
    </template>
    <template #title>
      <h3>俱乐部信息</h3>
      <p>军团/俱乐部概览与成员</p>
    </template>
    <template #badge>
      <span>{{ club ? "已加入" : "暂无俱乐部" }}</span>
    </template>
    <template #default>
      <div v-if="!club" class="empty-club">
        <UsersRound :size="24"></UsersRound>
        <strong>暂无俱乐部</strong>
        <span>刷新后重新读取当前角色的俱乐部状态</span>
        <Button size="sm" variant="outline" @click="refreshClub">
          <RotateCw :size="14"></RotateCw>
          刷新
        </Button>
      </div>
      <div v-else>
        <div class="toolbar">
          <Button v-if="canKick" size="sm" variant="outline" @click="getApplyList">
            <UserRoundPlus :size="14"></UserRoundPlus>
            申请列表
          </Button>
          <Button size="sm" variant="outline" @click="refreshClub">
            <RotateCw :size="14"></RotateCw>
            刷新
          </Button>
        </div>

        <Dialog v-model:open="showApplyList">
          <DialogContent class="max-h-[80vh] max-w-[700px] overflow-hidden p-0">
            <DialogHeader class="border-b border-border px-5 py-4 pr-14">
              <DialogTitle>俱乐部申请列表</DialogTitle>
              <DialogDescription>审核申请加入当前俱乐部的角色</DialogDescription>
            </DialogHeader>
            <div class="dialog-toolbar">
              <Button
                size="sm"
                :disabled="applyList.length === 0"
                @click="approveAll"
              >
                一键通过
              </Button>
              <Button
                size="sm"
                variant="destructive"
                :disabled="applyList.length === 0"
                @click="rejectAll"
              >
                一键拒绝
              </Button>
            </div>
            <div v-if="loadingApply" class="loading">
              <LoaderCircle class="spinning" :size="17"></LoaderCircle>
              <span>正在加载申请列表...</span>
            </div>
            <div v-else-if="applyList.length === 0" class="empty-apply">
              <Inbox :size="22"></Inbox>
              <span>暂无申请</span>
            </div>
            <div v-else class="apply-list-container">
              <div class="apply-list">
                <div
                  v-for="apply in applyList"
                  :key="apply.roleId"
                  class="apply-item"
                  :class="{ 'apply-item-hover': hoveredItemId === apply.roleId }"
                  @mouseenter="hoveredItemId = apply.roleId"
                  @mouseleave="hoveredItemId = null"
                >
                  <div class="apply-left">
                    <img
                      alt="申请人头像"
                      class="apply-avatar"
                      :src="apply.headImg || '/icons/xiaoyugan.png'"
                    >
                    <div class="apply-info">
                      <div class="apply-name">
                        {{ apply.name }}(ID:{{ apply.roleId }})
                      </div>
                      <div class="apply-details">
                        <span>等级: {{ apply.level || 0 }}</span>
                        <span class="apply-power">{{
                          formatNumber(apply.power || 0)
                        }}</span>
                        <span v-if="apply.serverId">服务器: {{ apply.serverId }}</span>
                      </div>
                      <div v-if="apply.applyReason" class="apply-reason">
                        申请留言: {{ apply.applyReason }}
                      </div>
                    </div>
                  </div>
                  <div class="apply-right">
                    <Button
                      size="sm"
                      @click="approveApply(apply.roleId)"
                    >
                      通过
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      @click="rejectApply(apply.roleId)"
                    >
                      拒绝
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <nav aria-label="俱乐部信息视图" class="club-tabs" role="tablist">
          <button
            v-for="tab in clubTabs"
            :key="tab.value"
            class="club-tab"
            role="tab"
            type="button"
            :aria-selected="activeTab === tab.value"
            :class="{ active: activeTab === tab.value }"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div v-show="activeTab === 'overview'" class="overview" role="tabpanel">
          <section class="club-profile">
            <img
              alt="俱乐部头像"
              class="club-avatar"
              :src="club.logo || '/icons/xiaoyugan.png'"
            >
            <div class="club-profile-copy">
              <strong>{{ club.name }}</strong>
              <div class="club-meta">
                <Badge variant="outline">ID: {{ club.id }}</Badge>
                <Badge variant="outline">服务器: {{ club.serverId - 27 }}</Badge>
                <Badge variant="outline">成员: {{ memberCount }}</Badge>
              </div>
            </div>
            <Button
              size="sm"
              :disabled="legionSignedIn"
              :variant="legionSignedIn ? 'outline' : 'default'"
              @click="signInLegion"
            >
              <ShieldCheck :size="14"></ShieldCheck>
              {{ legionSignedIn ? "已签到" : "俱乐部签到" }}
            </Button>
          </section>

          <dl class="club-metrics">
            <div>
              <dt><ChartNoAxesCombined :size="15"></ChartNoAxesCombined>战力</dt>
              <dd>{{ formatNumber(clubOverview.power) }}</dd>
            </div>
            <div>
              <dt><Flame :size="15"></Flame>红粹</dt>
              <dd>{{ clubOverview.redQuench }}</dd>
            </div>
            <div>
              <dt><Skull :size="15"></Skull>当前 Boss ID</dt>
              <dd>{{ clubOverview.currentBossId }}</dd>
            </div>
            <div>
              <dt><HeartPulse :size="15"></HeartPulse>Boss 剩余血量</dt>
              <dd>{{ clubOverview.currentHP }}</dd>
            </div>
          </dl>

          <details
            v-if="clubOverview.unfoughtBosses?.length"
            class="boss-summary"
          >
            <summary>
              <span><Skull :size="16"></Skull>Boss 击杀情况</span>
              <span>
                已击杀 {{ 150 - clubOverview.unfoughtBosses.length }}/150，遗漏
                {{ clubOverview.unfoughtBosses.length }}
              </span>
            </summary>
            <div class="boss-list">
              <Badge
                v-for="boss in clubOverview.unfoughtBosses"
                :key="boss"
                variant="destructive"
              >
                {{ boss }}
              </Badge>
            </div>
          </details>

          <section v-if="club.announcement" class="club-detail-section">
            <header><Megaphone :size="16"></Megaphone><strong>公告</strong></header>
            <p>{{ club.announcement }}</p>
          </section>

          <section v-if="leader" class="club-detail-section">
            <header><UserRound :size="16"></UserRound><strong>会长</strong></header>
            <div class="leader-row">
              <img
                alt="会长头像"
                :src="leader.headImg || '/icons/xiaoyugan.png'"
              >
              <div>
                <strong>{{ leader.name }}</strong>
                <span>ID: {{ leader.roleId }}</span>
              </div>
            </div>
          </section>
        </div>

        <div
          ref="exportDom"
          v-show="activeTab === 'members'"
          class="members"
          :class="{ exporting: isExporting }"
          role="tabpanel"
        >
          <div class="member-table-toolbar">
            <strong>俱乐部成员详情</strong>
            <div v-if="!isExporting">
              <Button
                size="sm"
                variant="outline"
                :disabled="batchLoading"
                @click="fetchAllMembersLineup"
              >
                <RotateCw :class="{ spinning: batchLoading }" :size="14"></RotateCw>
                获取阵容
              </Button>
              <Button
                size="sm"
                variant="outline"
                :disabled="isExporting"
                @click="handleExportImage"
              >
                <ImageDown :size="14"></ImageDown>
                导出图片
              </Button>
            </div>
          </div>
          <div class="member-table-scroll" :class="{ exporting: isExporting }">
            <table class="member-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>头像</th>
                  <th>成员</th>
                  <th>战力</th>
                  <th>红淬</th>
                  <th>阵容</th>
                  <th v-if="!isExporting">职位</th>
                  <th v-if="canKick && !isExporting">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(member, index) in topMembers" :key="member.roleId">
                  <td>{{ index + 1 }}</td>
                  <td>
                    <img
                      v-if="member.headImg"
                      class="member-table-avatar"
                      :alt="member.name"
                      :src="member.headImg"
                    >
                    <span v-else class="member-table-avatar placeholder">
                      {{ member.name?.charAt(0) || "?" }}
                    </span>
                  </td>
                  <td>
                    <button
                      class="member-link"
                      type="button"
                      @click="fetchTargetInfo(member.roleId)"
                    >
                      <strong>{{ member.name }}</strong>
                      <span>ID: {{ member.roleId }}</span>
                    </button>
                  </td>
                  <td>{{ formatNumber(member.power || member.custom?.s_power || 0) }}</td>
                  <td class="member-red">{{ redQuenchlabel(member.custom?.red_quench_cnt || 0) }}</td>
                  <td>
                    <Badge
                      v-if="member.lineupType"
                      :style="getLineupBadgeStyle(member.lineupType)"
                    >
                      {{ member.lineupType }}
                    </Badge>
                    <span v-else>-</span>
                  </td>
                  <td v-if="!isExporting">{{ jobLabel(member.job) }}</td>
                  <td v-if="canKick && !isExporting">
                    <Button
                      v-if="member.job !== 1"
                      size="sm"
                      variant="destructive"
                      @click="kickMember(member.roleId, member.name)"
                    >
                      踢出
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-show="activeTab === 'history'" role="tabpanel">
          <ClubHistoryRecords inline></ClubHistoryRecords>
        </div>

        <div v-show="activeTab === 'weirdtower'" role="tabpanel">
          <ClubWeirdTowerInfo inline></ClubWeirdTowerInfo>
        </div>
      </div>
    </template>
  </MyCard>

  <Dialog v-model:open="showPlayerInfoModal">
    <DialogContent class="max-h-[85vh] max-w-[800px] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>成员信息</DialogTitle>
        <DialogDescription v-if="playerInfo">角色 ID: {{ playerInfo.id }}</DialogDescription>
      </DialogHeader>

      <div v-if="playerInfo" class="player-info-content">
        <div class="player-info-main">
          <img
            alt="成员头像"
            class="player-avatar"
            :src="playerInfo.headImg || '/icons/xiaoyugan.png'"
          >
          <div class="player-info-detail">
            <h3>
              {{ playerInfo.name }}
              <Badge
                v-if="playerInfo.legacy > 0"
                :style="{
                  color: '#fff',
                  backgroundColor: legacycolor[playerInfo.legacy]?.value,
                }"
              >
                {{ legacycolor[playerInfo.legacy]?.name || "未知" }}
              </Badge>
            </h3>
            <div class="detail-row">
              <span>战力: <strong class="highlight">{{ formatNumber(playerInfo.power) }}</strong></span>
              <span>服务器: {{ playerInfo.serverName }}</span>
            </div>
            <div class="detail-row">
              <span>俱乐部: {{ playerInfo.legionName }}</span>
            </div>
            <div class="detail-row">
              <span>总红数: <strong class="red-text">{{ playerInfo.totalRedCount }}</strong></span>
              <span>总开孔: <strong class="blue-text">{{ playerInfo.totalHoleCount }}</strong></span>
              <span>四圣: <strong class="green-text">{{ playerInfo.holyBeast }}</strong></span>
            </div>
          </div>
        </div>

        <section class="hero-section">
          <div class="section-heading">
            <h4>武将阵容</h4>
            <Badge variant="outline">{{ playerInfo.heroList?.length || 0 }} 名</Badge>
          </div>
          <div v-if="playerInfo.heroList?.length" class="hero-list">
            <button
              v-for="(hero, index) in playerInfo.heroList"
              :key="hero.heroId || index"
              class="hero-item"
              type="button"
              @click="selectHeroInfo(hero)"
            >
              <img
                alt="武将头像"
                class="hero-avatar"
                :src="hero.heroAvate || '/icons/xiaoyugan.png'"
              >
              <div class="hero-info">
                <span class="hero-name">{{ hero.heroName }}</span>
                <div class="hero-stats">
                  <span>战力: {{ formatNumber(hero.power || 0) }}</span>
                  <span>星级: {{ hero.star || 0 }}</span>
                  <span>红数: {{ hero.red || 0 }}</span>
                  <span>开孔: {{ hero.hole || 0 }}</span>
                  <span :class="hero.HolyBeast ? 'opened' : 'closed'">
                    {{ hero.HolyBeast ? "已开四圣" : "未开四圣" }}
                  </span>
                  <span v-if="hero.HolyBeast">四圣等级: {{ hero.HBlevel || 0 }}</span>
                </div>
              </div>
              <ChevronRight :size="16"></ChevronRight>
            </button>
          </div>
          <div v-else class="empty-heroes">
            <UsersRound :size="22"></UsersRound>
            <span>未查询到武将信息</span>
          </div>
        </section>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="showPlayerInfoModal = false">关闭</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ClubHeroDetailDialog
    v-model:open="showHeroModal"
    :hero="heroModealTemp"
  />
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import {
  ChartNoAxesCombined,
  ChevronRight,
  Flame,
  HeartPulse,
  ImageDown,
  Inbox,
  LoaderCircle,
  Megaphone,
  RotateCw,
  ShieldCheck,
  Skull,
  UserRound,
  UserRoundPlus,
  UsersRound,
} from "@lucide/vue";
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
import ClubHistoryRecords from "./ClubHistoryRecords.vue";
import ClubHeroDetailDialog from "./ClubHeroDetailDialog.vue";
import ClubWeirdTowerInfo from "./ClubWeirdTowerInfo.vue";
import { getLineupType, HERO_DICT, HeroFillInfo, legacycolor, LINEUP_RULES } from "@/utils/heroList";
import html2canvas from "html2canvas";
import { downloadCanvasAsImage } from "@/utils/imageExport";

const tokenStore = useTokenStore();
const message = useMessage();
const dialog = useDialog();
const clubTabs = [
  { label: "概览", value: "overview" },
  { label: "成员", value: "members" },
  { label: "俱乐部历史战绩", value: "history" },
  { label: "怪异塔信息", value: "weirdtower" },
];

const info = computed(() => tokenStore.gameData?.legionInfo || null);
const club = computed(() => info.value?.info || null);

const membersObj = computed(() => club.value?.members || {});
const members = computed(() => Object.values(membersObj.value || {}));
const memberCount = computed(() => members.value.length);

const leader = computed(() => {
  const lid = club.value?.leaderId;
  if (!lid)
    return null;
  return members.value.find((m) => Number(m.roleId) === Number(lid)) || null;
});

const topMembers = computed(() => {
  return [...members.value].sort((a, b) => {
    // 1. 职位排序：会长(1) > 副会长(2) > 成员(0)
    const jobA = a.job === 0 ? 99 : a.job;
    const jobB = b.job === 0 ? 99 : b.job;
    if (jobA !== jobB)
      return jobA - jobB;

    // 2. 红淬排序：降序
    const redA = Number(a.custom?.red_quench_cnt || 0);
    const redB = Number(b.custom?.red_quench_cnt || 0);
    if (redA !== redB)
      return redB - redA;

    // 3. 战力排序：降序（兜底）
    const powerA = Number(a.power || a.custom?.s_power || 0);
    const powerB = Number(b.power || b.custom?.s_power || 0);
    return powerB - powerA;
  });
});

const showPlayerInfoModal = ref(false);
const playerInfo = ref(null);
const queryLoading = ref(false);
const showHeroModal = ref(false);
const heroModealTemp = ref(null);
const batchLoading = ref(false);
const isExporting = ref(false);
const exportDom = ref(null);

// 提取英雄信息
const getHeroInfo = (heroObj) => {
  // 统计总红数
  let redCount = 0;
  let holeCount = 0;
  let heroList = [];

  try {
    // 检查英雄数据结构，确保可以遍历
    let heroesToProcess = [];

    if (Array.isArray(heroObj)) {
      // 如果是数组，直接使用
      heroesToProcess = heroObj;
    } else if (typeof heroObj === "object" && heroObj !== null) {
      // 如果是对象，转换为数组
      heroesToProcess = Object.values(heroObj);
    } else {
      console.error("英雄数据格式错误:", typeof heroObj);
      return { redCount, holeCount, heroList };
    }

    heroesToProcess.forEach((hero, index) => {
      // 跳过无效英雄数据
      if (!hero)
        return;

      // 兼容 id 和 heroId
      const id = hero.heroId || hero.id;

      const heroInfo = HERO_DICT[id] || {};
      const equipmentInfo = hero.equipment
        ? getEquipment(hero.equipment)
        : { redCount: 0, holeCount: 0 };

      // 检查英雄基本信息
      const heroId = id || `unknown_${index}`;
      const heroName = hero.heroName || hero.name || heroInfo.name || `未知武将_${index}`;

      const tempObj = {
        heroId, // 英雄ID
        artifactId: hero.artifactId || "", // 英雄装备ID，用于匹配鱼灵信息
        power: hero.power || 0, // 英雄战力
        star: hero.star || 0, // 英雄星级
        equipment: hero.equipment, // 英雄具体孔数和红数
        heroName, // 英雄姓名
        heroAvate: hero.heroAvate || hero.headImg || heroInfo.avatar || "",
        level: hero.level || 0, // 英雄等级
        hole: equipmentInfo.holeCount, // 英雄开孔数量
        red: equipmentInfo.redCount, // 英雄红数
        // 兼容 hB 和 fourBasest
        HolyBeast: (hero.hB?.active === true) || (hero.fourBasest?.level > 0), // 激活四圣
        HBlevel: hero.hB?.order || hero.fourBasest?.level || 0, // 四圣等级
        // 添加英雄详情信息
        skillList: hero.skillList || [],
        attributeList: hero.attributeList || [],
        battleTeamSlot: hero.battleTeamSlot, // 阵容站位
      };

      // 只添加有效的英雄
      if (heroId) {
        redCount += tempObj.red;
        holeCount += tempObj.hole;
        heroList.push(tempObj);
      }
    });
  } catch (error) {
    console.error("处理英雄信息时发生错误:", error);
    heroList = [];
  }
  // 按站位排序
  heroList.sort((a, b) => a.battleTeamSlot - b.battleTeamSlot);

  return { redCount, holeCount, heroList };
};

// 获取装备信息红数和孔数
const getEquipment = (equipment) => {
  let redCount = 0;
  let holeCount = 0;
  // 遍历4件装备
  Object.values(equipment).forEach((equ) => {
    // 遍历每件装备的属性
    Object.values(equ.quenches).forEach((item) => {
      holeCount++;
      if (item.colorId == 6) {
        redCount++;
      }
    });
  });
  return { redCount, holeCount };
};

const selectHeroInfo = (heroInfo) => {
  showHeroModal.value = true;
  heroModealTemp.value = heroInfo;
};

const fetchAllMembersLineup = async () => {
  if (batchLoading.value)
    return;

  const token = tokenStore.selectedToken;
  if (!token)
    return;

  const wsStatus = tokenStore.getWebSocketStatus(token.id);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法获取阵容信息");
    return;
  }

  const memberList = members.value;
  if (!memberList.length)
    return;

  batchLoading.value = true;
  message.loading("正在获取成员阵容信息...");

  const memberIds = memberList.map((m) => m.roleId);
  const chunkSize = 5;

  try {
    for (let i = 0; i < memberIds.length; i += chunkSize) {
      const chunk = memberIds.slice(i, i + chunkSize);
      const promises = chunk.map(async (roleId) => {
        try {
          const roleRes = await tokenStore.sendMessageWithPromise(
            token.id,
            "rank_getroleinfo",
            {
              roleId: Number(roleId),
              includeBottleTeam: false,
              isSearch: false,
              bottleType: 0,
              includeHero: true,
              includeHeroDetail: true,
              includePearl: true,
            },
            5000,
          );

          if (roleRes && roleRes.roleInfo) {
            let heroList = [];
            if (roleRes.roleInfo.heroes) {
              const res = getHeroInfo(roleRes.roleInfo.heroes);
              heroList = res.heroList;
            }

            const lineupType = getLineupType(heroList);

            if (
              tokenStore.gameData?.legionInfo?.info?.members
              && tokenStore.gameData.legionInfo.info.members[roleId]
            ) {
              tokenStore.gameData.legionInfo.info.members[roleId].lineupType
                = lineupType;
            }
          }
        } catch (e) {
          console.error(`Failed to fetch info for ${roleId}`, e);
        }
      });

      await Promise.all(promises);
    }
    message.success("阵容信息获取完成");
  } catch (error) {
    message.error(`获取失败: ${error.message}`);
  } finally {
    batchLoading.value = false;
  }
};

const handleExportImage = async () => {
  // 校验：确保DOM已正确绑定
  if (!exportDom.value) {
    message.error("未找到要导出的内容");
    return;
  }

  try {
    isExporting.value = true;
    message.loading("正在生成图片，请稍候...");

    // 导出状态会移除操作列并展开内部滚动区域。
    await nextTick();
    await document.fonts?.ready;

    // 5. 用html2canvas渲染DOM为Canvas
    const canvas = await html2canvas(exportDom.value, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片
      backgroundColor: "#ffffff", // 避免透明背景
      logging: false, // 关闭控制台日志
      allowTaint: true, // 允许跨域图片污染画布
    });

    // 6. Canvas转图片链接并下载
    const dateStr = new Date().toLocaleDateString().replace(/\//g, "-");
    const filename = `俱乐部成员信息_${dateStr}.png`;
    downloadCanvasAsImage(canvas, filename);

    message.success("图片导出成功");
  } catch (err) {
    console.error("DOM转图片失败：", err);
    message.error("导出图片失败，请重试");
  } finally {
    isExporting.value = false;
  }
};

// 查询玩家信息
const fetchTargetInfo = async (roleId) => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法查询信息");
    return;
  }

  queryLoading.value = true;

  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId,
        includeHero: true,
        includeHeroDetail: true,
        includePearl: true,
      },
      5000,
    );

    if (!result.roleInfo) {
      message.warning("未查询到玩家信息");
      return;
    }

    // 处理鱼灵信息
    const fishInfo = HeroFillInfo(result.roleInfo);

    // 获取英雄信息
    let heroAndholdAndRed = { redCount: 0, holeCount: 0, heroList: [] };
    if (result.roleInfo.heroes) {
      try {
        heroAndholdAndRed = getHeroInfo(result.roleInfo.heroes);
      } catch (error) {
        console.error("处理英雄信息失败:", error);
        heroAndholdAndRed = { redCount: 0, holeCount: 0, heroList: [] };
      }
    }

    // 将鱼灵信息添加到英雄列表中
    heroAndholdAndRed.heroList.forEach((hero) => {
      hero.PearlInfo = fishInfo[hero.artifactId] || {};
    });

    // 计算总红数和总开孔数
    const totalRedCount = heroAndholdAndRed.redCount;
    const totalHoleCount = heroAndholdAndRed.holeCount;

    // 从角色信息中获取红淬数据
    const roleRedQuench = result.roleInfo.red || 0;
    const roleMaxRed = result.roleInfo.maxRed || 0;

    // 从俱乐部信息中获取红淬数据（如果有）
    const legionRedQuench
      = result.legionInfo?.statistics?.["battle:red:quench"] || roleRedQuench;
    const legionMaxRed
      = result.legionInfo?.statistics?.["red:quench"] || roleMaxRed;
    const legionMaxPower
      = result.legionInfo?.statistics?.["max:power"]
        || result.roleInfo.maxPower
        || 0;

    // 计算阵容类型
    const lineupType = getLineupType(heroAndholdAndRed.heroList);

    // 更新本地成员列表中的阵容信息（如果存在）
    if (
      tokenStore.gameData?.legionInfo?.info?.members
      && tokenStore.gameData.legionInfo.info.members[roleId]
    ) {
      tokenStore.gameData.legionInfo.info.members[roleId].lineupType
        = lineupType;
    }

    const playerData = {
      id: roleId,
      name: result.roleInfo.name,
      headImg: result.roleInfo.headImg,
      power: result.roleInfo.power,
      level: result.roleInfo.level,
      serverName: result.roleInfo.serverName,
      legionName: result.legionInfo?.name || "无",
      redQuench: roleRedQuench,
      holyBeast: heroAndholdAndRed.heroList.filter((hero) => hero.HolyBeast)
        .length,
      maxPower: formatNumber(legionMaxPower),
      currentRedDrum: roleRedQuench,
      maxRedDrum: roleMaxRed,
      totalRedCount,
      totalHoleCount,
      legionRedQuench,
      legionMaxRed,
      heroList: heroAndholdAndRed.heroList,
      legacy: result.roleInfo.legacy?.color || 0,
      lineupType,
    };

    playerInfo.value = playerData;
    showPlayerInfoModal.value = true;
    message.success("查询成功");
  } catch (error) {
    message.error(`查询失败: ${error.message}`);
    console.error("查询失败详细信息:", error);
  } finally {
    queryLoading.value = false;
  }
};

const getLineupBadgeStyle = (lineupType) => {
  const colors = LINEUP_RULES.find((rule) => rule.name === lineupType)?.colorProps;
  if (!colors)
    return {};
  return {
    backgroundColor: colors.color,
    borderColor: colors.color,
    color: colors.textColor,
  };
};

// 获取当前角色在俱乐部中的职位
const currentMemberJob = computed(() => {
  const roleId = tokenStore.gameData?.roleInfo?.role?.roleId;
  if (!roleId)
    return 0;
  const currentMember = members.value.find(
    (m) => Number(m.roleId) === Number(roleId),
  );
  return currentMember?.job || 0;
});

// 检查是否有踢人权限（会长或副会长）
const canKick = computed(() => {
  return [1, 2].includes(currentMemberJob.value);
});

// 踢出成员
const kickMember = (roleId, name) => {
  const token = tokenStore.selectedToken;
  if (!token)
    return;

  dialog.warning({
    title: "确认踢出",
    content: `确定要踢出成员 ${name} ID: ${roleId} 吗？`,
    positiveText: "确定",
    negativeText: "取消",
    onPositiveClick: () => {
      // 正确的发送方式：第一个参数是命令名称，第二个参数是命令体
      tokenStore.sendMessage(token.id, "legion_kickout", {
        roleId: Number(roleId),
      });

      // 乐观更新：立即从本地成员列表中移除该成员
      if (tokenStore.gameData?.legionInfo?.info?.members) {
        // 删除成员信息
        delete tokenStore.gameData.legionInfo.info.members[roleId];
        // 刷新俱乐部信息以确保数据同步
        setTimeout(() => {
          refreshClub();
        }, 1000);
      }

      message.info(`正在踢出成员 ID: ${roleId}`);
    },
  });
};

// 获取申请列表
const getApplyList = async () => {
  const token = tokenStore.selectedToken;
  if (!token)
    return;

  // 显示申请列表界面
  showApplyList.value = true;
  // 设置加载状态
  loadingApply.value = true;
  applyList.value = [];

  try {
    message.info("正在获取申请列表");
    // 使用 Promise 方式直接获取响应
    const responseBody = await tokenStore.sendMessageWithPromise(
      token.id,
      "legion_applylist",
      {},
      10000, // 10秒超时
    );

    // 直接处理响应数据
    handleApplyListResp({ body: responseBody });
  } catch (error) {
    loadingApply.value = false;
    message.error(`获取申请列表失败: ${error.message || "未知错误"}`);
    console.error("获取申请列表出错:", error);
  }
};

// 通过申请
const approveApply = (roleId) => {
  const token = tokenStore.selectedToken;
  if (!token)
    return;

  // 发送通过申请命令
  tokenStore.sendMessage(token.id, "legion_agree", {
    roleId: Number(roleId),
  });

  // 从申请列表中移除该成员
  applyList.value = applyList.value.filter((apply) => apply.roleId !== roleId);
  message.info(`已通过成员 ID: ${roleId} 的申请`);

  // 刷新俱乐部信息
  setTimeout(() => {
    refreshClub();
  }, 1000);
};

// 拒绝申请
const rejectApply = (roleId) => {
  const token = tokenStore.selectedToken;
  if (!token)
    return;

  // 发送拒绝申请命令
  tokenStore.sendMessage(token.id, "legion_ignore", {
    roleId: Number(roleId),
  });

  // 从申请列表中移除该成员
  applyList.value = applyList.value.filter((apply) => apply.roleId !== roleId);
  message.info(`已拒绝成员 ID: ${roleId} 的申请`);
};

// 一键通过所有申请
const approveAll = () => {
  const token = tokenStore.selectedToken;
  if (!token)
    return;

  const count = applyList.value.length;
  if (count === 0)
    return;

  // 遍历所有申请项，发送通过命令
  applyList.value.forEach((apply) => {
    tokenStore.sendMessage(token.id, "legion_agree", {
      roleId: Number(apply.roleId),
    });
  });

  // 清空申请列表
  applyList.value = [];
  message.success(`已通过所有 ${count} 个申请`);

  // 刷新俱乐部信息
  setTimeout(() => {
    refreshClub();
  }, 1000);
};

// 一键拒绝所有申请
const rejectAll = () => {
  const token = tokenStore.selectedToken;
  if (!token)
    return;

  const count = applyList.value.length;
  if (count === 0)
    return;

  // 遍历所有申请项，发送拒绝命令
  applyList.value.forEach((apply) => {
    tokenStore.sendMessage(token.id, "legion_ignore", {
      roleId: Number(apply.roleId),
    });
  });

  // 清空申请列表
  applyList.value = [];
  message.success(`已拒绝所有 ${count} 个申请`);
};

const activeTab = ref("overview");

// 申请列表状态
const showApplyList = ref(false);
const loadingApply = ref(false);
const applyList = ref([]);

// 选择状态
const hoveredItemId = ref(null);

// 处理申请列表响应
const handleApplyListResp = (session) => {
  // 从session对象中提取响应内容
  const responseBody = session.body;

  if (responseBody) {
    // 检查是否为空对象
    if (Object.keys(responseBody).length === 0) {
      applyList.value = [];
      loadingApply.value = false;
      message.info("暂无申请");
      return;
    }

    if (typeof responseBody === "object") {
      // 处理对象类型的响应

      // 检查是否有roleList数组字段（根据用户要求）
      if (Array.isArray(responseBody.roleList)) {
        // 从roleList数组中提取申请列表数据
        // 过滤掉无效的申请项（没有roleId的项）
        const validRoles = responseBody.roleList.filter(
          (role) => role.roleId && role.name,
        );
        applyList.value = validRoles.map((role) => ({
          headImg: role.headImg,
          level: role.level,
          name: role.name,
          power: role.power,
          roleId: role.roleId,
          serverId: role.ext?.server_id || "",
          applyReason: role.ext?.legion_apply_reason || "",
        }));
        // 停止加载状态
        loadingApply.value = false;
        message.success(`获取到 ${validRoles.length} 个申请`);
      } else if (
        Array.isArray(responseBody.applyList)
        || Array.isArray(responseBody.list)
        || Array.isArray(responseBody.data)
      ) {
        // 兼容其他可能的数组字段
        const applyArray
          = responseBody.applyList || responseBody.list || responseBody.data;
        // 过滤掉无效的申请项，并提取服务区和申请留言信息
        applyList.value = applyArray
          .filter((apply) => apply.roleId && apply.name)
          .map((apply) => ({
            ...apply,
            serverId: apply.ext?.server_id || "",
            applyReason: apply.ext?.legion_apply_reason || "",
          }));
        loadingApply.value = false;
        message.success(`获取到 ${applyList.value.length} 个申请`);
      } else if (Array.isArray(responseBody)) {
        // 直接是数组的情况
        // 过滤掉无效的申请项，并提取服务区和申请留言信息
        applyList.value = responseBody
          .filter((apply) => apply.roleId && apply.name)
          .map((apply) => ({
            ...apply,
            serverId: apply.ext?.server_id || "",
            applyReason: apply.ext?.legion_apply_reason || "",
          }));
        loadingApply.value = false;
        message.success(`获取到 ${applyList.value.length} 个申请`);
      } else {
        // 没有有效的申请数据，设置为空数组
        applyList.value = [];
        loadingApply.value = false;
        message.info("暂无申请");
      }
    } else if (Array.isArray(responseBody)) {
      // 直接是数组的情况
      // 过滤掉无效的申请项，并提取服务区和申请留言信息
      applyList.value = responseBody
        .filter((apply) => apply.roleId && apply.name)
        .map((apply) => ({
          ...apply,
          serverId: apply.ext?.server_id || "",
          applyReason: apply.ext?.legion_apply_reason || "",
        }));
      loadingApply.value = false;
      message.success(`获取到 ${applyList.value.length} 个申请`);
    } else {
      // 处理其他类型的响应
      applyList.value = [];
      loadingApply.value = false;
      message.info("暂无申请");
    }
  } else {
    // 没有申请数据或格式不正确
    applyList.value = [];
    loadingApply.value = false;
    message.info("暂无申请");
  }
};

// 组件挂载时添加事件监听器
onMounted(() => {
  // 监听申请列表响应事件（已改为Promise直接处理，不再监听）
  // $emit.on("legion_applylistresp", handleApplyListResp);
});

watch(activeTab, (val) => {
  if (val === "members" && !batchLoading.value) {
    const hasLineup = members.value.some((m) => m.lineupType);
    if (!hasLineup) {
      fetchAllMembersLineup();
    }
  }
});

// 组件卸载时移除事件监听器
onUnmounted(() => {
  // 移除申请列表响应事件监听（已改为Promise直接处理，不再监听）
  // $emit.off("legion_applylistresp", handleApplyListResp);
});

// 今日是否已进行俱乐部签到
const legionSignedIn = computed(() => {
  const ts = Number(
    tokenStore.gameData?.roleInfo?.role?.statisticsTime?.["legion:sign:in"]
    || 0,
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaySec = Math.floor(today.getTime() / 1000);
  return ts > todaySec;
});

const signInLegion = () => {
  const token = tokenStore.selectedToken;
  if (!token || legionSignedIn.value)
    return;
  tokenStore.sendMessage(token.id, "legion_signin");
  tokenStore.sendMessage(token.id, "role_getroleinfo");
  message.info("俱乐部签到");
};

// 兼容不同服务端字段：从 info.info 和顶层 info 以及 statistics 中聚合
const clubOverview = computed(() => {
  const i = info.value || {};
  const base = i.info || {};
  const boss = base.currentBoss || {};
  const stats = i.statistics || i.stat || {};

  const power = Number(base.power ?? i.power ?? base.s_power ?? i.s_power ?? 0);
  const dan = base.dan ?? i.dan ?? base.rank ?? i.rank ?? "-";
  const redQuench = Number(
    base.redQuenchCnt
    ?? i.redQuenchCnt
    ?? stats["red:quench"]
    ?? stats.red_quench
    ?? 0,
  );
  const lastWarRank
    = stats["last:war:rank"]
      ?? stats.lastWarRank
      ?? stats["legion:last:war:rank"]
      ?? "-";
  const noApply = Boolean(base.noApply ?? i.noApply);

  const currentHP = formatNumber(boss.currentHP || 0);
  const currentBossId = boss.bossId || 0;
  const unfoughtBosses = [];
  for (let k = 1; k <= 150; k++) {
    if (!tokenStore.gameData?.roleInfo?.role?.statistics[`lb:${k}`]) {
      unfoughtBosses.push(k);
    }
  }

  return {
    power,
    dan: dan ?? "-",
    redQuench,
    lastWarRank,
    noApply,
    currentHP,
    currentBossId,
    unfoughtBosses,
  };
});

const refreshClub = () => {
  const token = tokenStore.selectedToken;
  if (!token)
    return;
  tokenStore.sendMessage(token.id, "legion_getinfo");

  // 如果当前在成员页，也刷新阵容信息
  if (activeTab.value === "members") {
    fetchAllMembersLineup();
  }
};

const jobLabel = (job) => {
  if (job === 1)
    return "会长";
  if (job === 2)
    return "副会长";
  return "成员";
};

const redQuenchlabel = (redQuenchl) => {
  return `${redQuenchl}红`;
};

const formatNumber = (num) => {
  const n = Number(num || 0);
  if (n >= 1e12)
    return `${(n / 1e12).toFixed(2)}兆`;
  if (n >= 1e8)
    return `${(n / 1e8).toFixed(2)}亿`;
  if (n >= 1e4)
    return `${(n / 1e4).toFixed(2)}万`;
  return String(n);
};
</script>

<style scoped lang="scss">
.club-info {
  min-width: 0;

  .toolbar {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }

  .overview {
    display: grid;
    gap: var(--spacing-sm);
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .member-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 8px;
    border-radius: 8px;
    background: var(--bg-tertiary);
  }

  .member-row .left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .member-row .right {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
  }

  .member-row .name {
    font-weight: var(--font-weight-medium);
  }

  .member-row .power {
    font-feature-settings: "tnum" 1;
    font-variant-numeric: tabular-nums;
  }

  .member-row .red-quench {
    font-feature-settings: "tnum" 1;
    font-variant-numeric: tabular-nums;
  }

  .hint {
    margin-top: 8px;
    color: var(--text-tertiary);
    font-size: var(--font-size-xs);
  }

  .empty-club {
    min-height: 176px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    text-align: center;
    color: var(--text-secondary);
  }

  .empty-club strong {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
  }

  .empty-club > span {
    margin-bottom: var(--spacing-xs);
    font-size: var(--font-size-xs);
  }
}

.club-tabs {
  display: flex;
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  overflow-x: auto;
  border-bottom: 1px solid var(--border-color);
}

.members {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.members.exporting {
  width: 650px;
  max-width: none;
  background: #fff;
  --bg-primary: #fff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f5f5f5;
  --border-color: #e5e5e5;
  --text-primary: #171717;
  --text-secondary: #525252;
  --text-tertiary: #a3a3a3;
}

.member-table-toolbar {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border: 1px solid var(--border-color);
  border-bottom: 0;
  border-radius: var(--radius) var(--radius) 0 0;
}

.member-table-toolbar > strong {
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.member-table-toolbar > div {
  display: flex;
  gap: var(--spacing-xs);
}

.member-table-scroll {
  max-width: 100%;
  max-height: 552px;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 0 0 var(--radius) var(--radius);
}

.member-table-scroll.exporting {
  max-height: none;
  overflow: visible;
}

.member-table {
  width: 100%;
  min-width: 650px;
  border-spacing: 0;
  border-collapse: separate;
  color: var(--text-primary);
  font-size: var(--font-size-xs);
}

.member-table th,
.member-table td {
  height: 44px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
  white-space: nowrap;
}

.member-table th {
  position: sticky;
  z-index: 1;
  top: 0;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
}

.member-table tr:last-child td {
  border-bottom: 0;
}

.member-table tbody tr:nth-child(even) {
  background: var(--bg-secondary);
}

.member-table th:nth-child(1),
.member-table td:nth-child(1),
.member-table th:nth-child(2),
.member-table td:nth-child(2) {
  width: 56px;
}

.member-table th:nth-child(3),
.member-table td:nth-child(3) {
  width: 150px;
  text-align: left;
}

.member-table-avatar {
  display: inline-grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  object-fit: cover;
}

.member-link {
  display: grid;
  gap: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.member-link:hover strong {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.member-link span {
  color: var(--text-tertiary);
  font-size: 11px;
}

.member-red {
  color: var(--error-color);
}

.club-tab {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 2px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.club-tab:hover {
  color: var(--text-primary);
}

.club-tab.active {
  border-bottom-color: var(--text-primary);
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
}

.club-profile,
.club-detail-section,
.boss-summary {
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background: var(--bg-primary);
}

.club-profile {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
}

.club-avatar {
  width: 52px;
  height: 52px;
  flex: 0 0 52px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  object-fit: cover;
}

.club-profile-copy {
  min-width: 0;
  flex: 1;
}

.club-profile-copy > strong {
  display: block;
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.club-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.club-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-sm);
  margin: 0;
}

.club-metrics > div {
  min-width: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background: var(--bg-primary);
}

.club-metrics dt {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.club-metrics dd {
  margin: 5px 0 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.boss-summary {
  padding: var(--spacing-sm) var(--spacing-md);
  border-color: color-mix(in srgb, var(--warning-color) 38%, var(--border-color));
}

.boss-summary summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.boss-summary summary > span:first-child {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.boss-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  padding-top: var(--spacing-sm);
}

.club-detail-section {
  padding: var(--spacing-md);
}

.club-detail-section header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: var(--spacing-sm);
  color: var(--text-primary);
  font-size: var(--font-size-sm);
}

.club-detail-section p {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.65;
  white-space: pre-wrap;
}

.leader-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.leader-row img {
  width: 38px;
  height: 38px;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  object-fit: cover;
}

.leader-row div {
  display: grid;
  gap: 2px;
}

.leader-row span {
  color: var(--text-tertiary);
  font-size: var(--font-size-xs);
}

.status-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 8px;
  margin-right: var(--spacing-md);
}

.status-info {
  flex: 1;

  h3 {
    margin: 0;
    font-size: var(--font-size-lg);
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);

  &.active {
    background: rgba(24, 160, 88, 0.12);
    color: var(--success-color);
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.dialog-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  min-height: 160px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.spinning {
  animation: club-spin 800ms linear infinite;
}

@keyframes club-spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-apply {
  display: grid;
  min-height: 160px;
  place-items: center;
  align-content: center;
  gap: var(--spacing-xs);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.apply-list-container {
  display: flex;
  flex-direction: column;
  padding: 0 var(--spacing-md) var(--spacing-md);
}

.apply-list {
  max-height: calc(80vh - 176px);
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background: var(--bg-primary);
}

.apply-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin: 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
  transition: background 150ms ease;
}

.apply-item:last-child {
  border-bottom: none;
}

.apply-item-hover {
  background: var(--bg-tertiary);
}

.apply-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.apply-avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  object-fit: cover;
}

.apply-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.apply-name {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.apply-details {
  display: flex;
  gap: 12px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.apply-power {
  font-feature-settings: "tnum" 1;
  font-variant-numeric: tabular-nums;
}

.apply-reason {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: 4px;
  word-break: break-word;
  white-space: normal;
  line-height: 1.4;
}

.apply-right {
  display: flex;
  gap: 8px;
}

.apply-list::-webkit-scrollbar {
  width: 6px;
}

.apply-list::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 3px;
}

.apply-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.apply-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

.player-info-content {
  min-width: 0;
}

.player-info-main {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
}

.player-avatar {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  object-fit: cover;
}

.player-info-detail h3 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.player-info-detail .detail-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 4px;
  font-size: var(--font-size-sm, 14px);
  color: var(--text-secondary, #666);
}

.red-text { color: var(--error-color); }
.green-text { color: var(--success-color); }
.blue-text,
.highlight { color: var(--text-primary); }

.hero-section {
  margin-top: var(--spacing-md);

  h4 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
  }
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.hero-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.hero-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background: var(--bg-primary);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;

  &:hover {
    border-color: var(--text-tertiary);
    background: var(--bg-secondary);
  }
}

.hero-avatar {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  object-fit: cover;
}

.hero-info {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.hero-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);

  span {
    padding: 1px 5px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    background: var(--bg-secondary);
  }

  span.opened {
    background: rgba(82, 196, 26, 0.1);
    color: var(--success-color, #52c41a);
    border-color: var(--success-color, #52c41a);
  }

  span.closed {
    background: rgba(250, 173, 20, 0.1);
    color: var(--warning-color, #faad14);
    border-color: var(--warning-color, #faad14);
  }
}

.empty-heroes {
  display: grid;
  min-height: 120px;
  place-items: center;
  align-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background: var(--bg-secondary);
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

@media (max-width: 768px) {
  .club-tabs {
    gap: var(--spacing-md);
  }

  .club-profile {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .club-profile > button {
    grid-column: 1 / -1;
    width: 100%;
  }

  .club-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .club-metrics dd {
    font-size: var(--font-size-lg);
  }

  .boss-summary summary {
    align-items: flex-start;
    flex-direction: column;
  }

  .apply-item {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .apply-right {
    width: 100%;
    padding-left: 44px;
  }

  .apply-right > button {
    flex: 1;
  }

  .player-info-main {
    align-items: flex-start;
  }

}
</style>
