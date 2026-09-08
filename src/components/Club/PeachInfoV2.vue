<template>
  <div ref="exportDom" class="peach-info-card">
    <PeachBattleToolbar
      :batch-duel-running="batchDuelRunning"
      :has-opponents="opponentMembers.length > 0"
      :loading="loading"
      :query-date="queryDate"
      @batch-duel="handleBatchDuel"
      @export="handleExportImage"
      @refresh="fetchBattleRecordsByDate"
      @select-date="fetchBattleRecordsByDate"
    ></PeachBattleToolbar>

    <PeachOpponentMatchup
      :battle-info="battleInfo"
      :columns="columns"
      :lineup-stats="lineupStats"
      :loading="loading"
      :members="opponentMembers"
      :query-date="queryDate"
    ></PeachOpponentMatchup>

    <ClubPlayerDuelDialog
      :die-stats="dieStats"
      :fight-count="fightCount"
      :fight-count-valid="isFightCountValid"
      :fight-progress="fightProgress"
      :fight-result="fightResult"
      :open="showPlayerInfoModal"
      :player="playerInfo"
      @close-result="fightResult.visible = false"
      @duel="handleDuel"
      @reset-result="resetFightResult"
      @select-hero="selectHeroInfo"
      @update:fight-count="updateFightCount"
      @update:open="showPlayerInfoModal = $event"
    ></ClubPlayerDuelDialog>

    <ClubHeroDetailDialog
      :hero="heroModealTemp"
      :open="showHeroModal"
      @update:open="showHeroModal = $event"
    ></ClubHeroDetailDialog>
  </div>
</template>

<script setup>
import { computed, h, onMounted, ref, watch } from "vue";
import { NTag, useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import { usePeachDuel } from "@/composables/usePeachDuel";
import html2canvas from "html2canvas";
import { downloadCanvasAsImage } from "@/utils/imageExport";
import {
  formatWeapon,
  getLineupType,
  HERO_DICT,
  HeroFillInfo,
  legacycolor,
  LINEUP_RULES,
} from "@/utils/heroList";
import { getShowPet } from "@/utils/petList";
import ClubHeroDetailDialog from "./ClubHeroDetailDialog.vue";
import ClubPlayerDuelDialog from "./ClubPlayerDuelDialog.vue";
import PeachBattleToolbar from "./PeachBattleToolbar.vue";
import PeachOpponentMatchup from "./PeachOpponentMatchup.vue";

const message = useMessage();
const tokenStore = useTokenStore();
const selectedTokenId = computed(() => tokenStore.selectedToken?.id || "");
const currentClubInfo = ref(null);
const exportDom = ref(null);

const fetchCurrentClubInfo = async (tokenId = selectedTokenId.value) => {
  if (!tokenId)
    return null;

  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected")
    return null;

  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getinfo",
      {},
      10000,
    );

    if (selectedTokenId.value === tokenId && result) {
      currentClubInfo.value = result;
    }
    return result;
  } catch (error) {
    if (selectedTokenId.value !== tokenId)
      return;
    if (selectedTokenId.value === tokenId) {
      console.error("查询俱乐部信息失败:", error);
    }
    return null;
  }
};

const getLastSunday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
  const hour = today.getHours();

  let daysToSubtract = 0;
  if (dayOfWeek === 0) {
    // 今天是周日
    if (hour < 18) {
      // 18:00 之前，返回上周日
      daysToSubtract = 7;
    } else {
      // 18:00 之后，返回今天
      daysToSubtract = 0;
    }
  } else {
    // 周一到周六，计算距离上周日的天数
    daysToSubtract = dayOfWeek;
  }

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - daysToSubtract);

  const targetYear = targetDate.getFullYear();
  const targetMonth = String(targetDate.getMonth() + 1).padStart(2, "0");
  const targetDay = String(targetDate.getDate()).padStart(2, "0");

  return `${targetYear}/${targetMonth}/${targetDay}`;
};

// Helper: Format Power
const formatPower = (power) => {
  if (!power)
    return "0";
  if (power >= 100000000) {
    return `${(power / 100000000).toFixed(1)}亿`;
  }
  if (power >= 10000) {
    return `${(power / 10000).toFixed(1)}万`;
  }
  return power.toString();
};

const formatDateToShort = (dateStr) => {
  if (!dateStr)
    return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3)
    return dateStr;
  const [year, month, day] = parts;
  return year.slice(2) + month + day;
};

// Helper: Check if Sunday 18:00 - 20:30
const isSundayBattleTime = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  return (
    day === 0 && ((hour >= 18 && hour < 20) || (hour === 20 && minute <= 30))
  );
};

// State
const loading = ref(false);
const battleInfo = ref(null); // Opponent Club Info
const opponentMembers = ref([]);

// 敌方阵容类型统计（与「阵容类型」列同名同色，附带数量）
const lineupStats = computed(() => {
  const counts = new Map();
  opponentMembers.value.forEach((member) => {
    const type = member.lineupType || "未知";
    counts.set(type, (counts.get(type) || 0) + 1);
  });

  return Array.from(counts, ([name, count]) => ({
    name,
    count,
    colorProps: LINEUP_RULES.find((r) => r.name === name)?.colorProps || {
      color: "#e8e8e8",
      textColor: "#444",
    },
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh"));
});
const queryDate = ref(getLastSunday());

const {
  batchDuelRunning,
  battleSimResults,
  dieStats,
  fetchTargetInfo,
  fightCount,
  fightProgress,
  fightResult,
  handleBatchDuel,
  handleDuel,
  heroModealTemp,
  isFightCountValid,
  playerInfo,
  resetFightResult,
  selectHeroInfo,
  showHeroModal,
  showPlayerInfoModal,
  updateFightCount,
} = usePeachDuel({
  tokenStore,
  message,
  selectedTokenId,
  opponentMembers,
  formatPower,
});

// Columns Definition
const columns = [
  {
    title: "序号",
    key: "index",
    width: 60,
    align: "center",
    render: (_, index) => index + 1,
  },
  {
    title: "头像",
    key: "headImg",
    width: 60,
    align: "center",
    render: (row) => {
      if (row.headImg) {
        return h("img", {
          src: row.headImg,
          class: "member-avatar-cell",
          alt: row.name,
        });
      }
      return h(
        "div",
        {
          class: "member-avatar-placeholder-cell",
        },
        row.name?.charAt(0) || "?",
      );
    },
  },
  {
    title: "ID",
    key: "id",
    width: 110,
    align: "center",
    render: (row) => h("span", { class: "member-id-cell" }, row.id),
  },
  {
    title: "角色名称",
    key: "name",
    width: 150,
    align: "center",
    render: (row) => {
      return h(
        "span",
        {
          style: {
            cursor: "pointer",
            color: "#1890ff",
            textDecoration: "underline",
          },
          onClick: () => fetchTargetInfo(row.id),
        },
        row.name,
      );
    },
  },
  {
    title: "战力",
    key: "power",
    width: 100,
    align: "center",
    render: (row) => formatPower(row.power),
  },
  {
    title: "红淬",
    key: "redQuench",
    width: 80,
    align: "center",
    render: (row) => h("span", { style: { color: "#ff4d4f" } }, row.redQuench),
  },
  {
    title: "珍卡",
    key: "legacy",
    width: 92,
    align: "center",
    render: (row) => {
      // 与切磋界面「游戏名」后面那个标签同源：roleInfo.legacy.color 查 legacycolor
      const cfg = legacycolor[row.legacy];
      if (!row.legacy || !cfg) {
        return h("span", { class: "legacy-none" }, "—");
      }
      return h(
        NTag,
        {
          size: "small",
          bordered: false,
          color: { color: cfg.value, textColor: "#fff" },
        },
        { default: () => cfg.name },
      );
    },
  },
  {
    title: "玩具",
    key: "toy",
    width: 120,
    align: "center",
    render: (row) => {
      const toyName = row.toyName;
      if (!toyName) {
        return h("span", { class: "toy-none" }, "—");
      }
      return h("span", { class: "toy-name" }, toyName);
    },
  },
  {
    title: "宠物",
    key: "pet",
    width: 110,
    align: "center",
    render: (row) => {
      const pet = row.pet;
      if (!pet)
        return h("span", { class: "pet-none" }, "—");

      const children = [];
      if (pet.icon) {
        children.push(
          h("img", {
            class: "pet-icon",
            src: pet.icon,
            alt: pet.name,
            loading: "lazy",
            // 图标地址可能失效，坏图就隐藏，只留文字
            onError: (e) => {
              e.target.style.display = "none";
            },
          }),
        );
      }
      children.push(
        h("div", { class: "pet-text" }, [
          // 名称颜色跟随宠物品质（petId 首位：1白 2绿 3蓝 4紫 5橙 6红 7金）
          h(
            "span",
            { class: "pet-name", style: { color: pet.color } },
            pet.name,
          ),
          pet.level
            ? h("span", { class: "pet-level" }, `Lv.${pet.level}`)
            : null,
        ]),
      );

      return h("div", { class: "pet-cell" }, children);
    },
  },
  {
    title: "阵容(红数)[四圣等级]",
    key: "lineup",
    width: null,
    align: "left",
    render: (row) => {
      const heroes = row.heroList || [];
      if (!heroes.length)
        return h("span", { class: "lineup-cell" }, "—");

      // 每个武将一张小卡片：上行「武将名(红数)圣N」，下行「鱼灵|鱼珠技能」
      const cards = heroes.map((hero) => {
        const nameParts = [
          h("span", { class: "lineup-hero-name" }, hero.heroName),
          h("span", { class: "lineup-hero-red" }, `(${hero.red})`),
        ];

        if (hero.HolyBeast) {
          nameParts.push(
            h(
              "span",
              { class: "hb-badge lineup-hero-hb" },
              `圣${hero.HBlevel}`,
            ),
          );
        }

        const fishName = hero.PearlInfo?.FishInfo?.name || "";
        const skillName = hero.PearlInfo?.PearlSkill?.name || "";
        const pearlParts = [];
        if (fishName)
          pearlParts.push(h("span", { class: "lineup-fish-name" }, fishName));
        if (fishName && skillName)
          pearlParts.push(h("span", { class: "lineup-pearl-sep" }, "|"));
        if (skillName) {
          pearlParts.push(
            h("span", { class: "lineup-pearl-skill" }, skillName),
          );
        }

        return h("div", { class: "lineup-hero-card" }, [
          h(
            "div",
            { class: "lineup-card-row lineup-card-row-name" },
            nameParts,
          ),
          h(
            "div",
            { class: "lineup-card-row lineup-card-row-pearl" },
            pearlParts.length
              ? pearlParts
              : h("span", { class: "lineup-pearl-empty" }, "—"),
          ),
        ]);
      });

      return h("div", { class: "lineup-card-list" }, cards);
    },
  },
  {
    title: "阵容类型",
    key: "lineupType",
    width: 96,
    align: "center",
    render: (row) => {
      const type = row.lineupType;
      // 从配置中查找对应的颜色，默认灰色
      const rule = LINEUP_RULES.find((r) => r.name === type);
      const colorProps = rule?.colorProps || {
        color: "#e8e8e8",
        textColor: "#444",
      };

      return h(
        NTag,
        { color: colorProps, size: "small", bordered: false },
        { default: () => type },
      );
    },
  },
  {
    title: "战斗模拟5次",
    key: "battleSim",
    width: 140,
    align: "center",
    titleAlign: "center",
    render: (row) => {
      const sim = battleSimResults.value[row.id];
      if (!sim)
        return h("span", { style: { color: "#ccc", fontSize: "12px" } }, "—");
      if (sim.status === "pending") {
        return h(
          "span",
          { style: { color: "#aaa", fontSize: "12px" } },
          "等待中",
        );
      }
      if (sim.status === "fighting") {
        return h(
          "span",
          { style: { color: "#1890ff", fontSize: "12px" } },
          "战斗中…",
        );
      }
      if (sim.status === "timeout")
        return h("span", { class: "sim-timeout" }, "超时异常");
      // done
      if (sim.winRate === 0) {
        return h("span", { class: "sim-result sim-lose" }, "胜率：0%");
      }
      const parts = [
        h("span", { class: "sim-win-rate" }, `胜率：${sim.winRate}%`),
      ];
      if (sim.fullWinRate > 0) {
        parts.push(h("span", { class: "sim-sep" }, " "));
        parts.push(
          h("span", { class: "sim-full-rate" }, `满编：${sim.fullWinRate}%`),
        );
      }
      return h("span", { class: "sim-result" }, parts);
    },
  },
];

// 日期选择时调用查询战绩方法
const fetchBattleRecordsByDate = (val) => {
  if (val !== undefined) {
    queryDate.value = val;
  } else {
    queryDate.value = getLastSunday();
  }
  battleInfo.value = null;
  opponentMembers.value = [];
  fetchBattleInfo();
};

// Fetch Data
const fetchBattleInfo = async (_requestTokenId = selectedTokenId.value) => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法查询");
    return;
  }

  loading.value = true;
  opponentMembers.value = [];
  try {
    let opponentLegionId;
    let ownLegionId;
    let memberIds = [];
    const shortDate = formatDateToShort(queryDate.value);
    const clubInfoResult
      = currentClubInfo.value || (await fetchCurrentClubInfo(tokenId));
    const ownClubInfo = clubInfoResult?.info;
    if (selectedTokenId.value !== tokenId)
      return;
    if (!ownClubInfo?.id) {
      message.error("未获取到当前账号俱乐部信息");
      return;
    }

    // Time-based Logic
    // If selected date is today AND it is currently battle time, fetch live data
    if (queryDate.value === getLastSunday() && isSundayBattleTime()) {
      // Sunday 18:00-20:30: Use legion_getpayloadbf
      const res = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getpayloadbf",
        {},
        10000,
      );
      if (!res || !res.legions) {
        message.error("未获取到战场信息");
        loading.value = false;
        return;
      }
      ownLegionId = ownClubInfo.id;
      opponentLegionId = res.legions[0].id;
      if (ownLegionId === opponentLegionId) {
        opponentLegionId = res.legions[1].id;
      }
      if (!opponentLegionId) {
        message.error("未获取到对战俱乐部ID");
        return;
      }
    } else {
      // Other times: Use legion_getpayloadrecord + legion_getpayloadkillrecord
      // 1. Get Task (for own ID reference, though not strictly needed if we trust the map)
      await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getpayloadtask",
        {},
        10000,
      );

      // 2. Get Record Map
      ownLegionId = ownClubInfo.id;
      const res = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getpayloadrecord",
        {},
        10000,
      );
      if (!res || !res.enemyLegionMap) {
        message.warning("未获取到历史对战记录");
        loading.value = false;
        return;
      }
      const record = res.enemyLegionMap[shortDate];
      if (record) {
        opponentLegionId = record.id;
      } else {
        message.warning(`未找到 ${queryDate.value} 的对战记录`);
        loading.value = false;
        return;
      }
      if (!opponentLegionId) {
        message.error("未获取到对战俱乐部ID");
        return;
      }
    }

    const killRes = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getpayloadkillrecord",
      { date: shortDate },
      10000,
    );

    if (killRes && killRes.recordsMap && killRes.recordsMap[opponentLegionId]) {
      const records = killRes.recordsMap[opponentLegionId];
      memberIds = records.map((r) => r.roleInfo.roleId);
    }

    // Get Opponent Club Details (Name, Logo, etc.)
    const ownLegionIdInfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getinfobyid",
      { legionId: ownLegionId },
      10000,
    );
    const clubInfoRes = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getinfobyid",
      { legionId: opponentLegionId },
      10000,
    );

    if (!clubInfoRes || !clubInfoRes.legionData) {
      message.error("无法获取对手俱乐部详情");
      loading.value = false;
      return;
    }
    // legion_getinfobyid 只返回少量展示成员（约3人），并非完整名册，
    // 这里打印字段方便确认是否存在真实的成员总数字段
    console.debug(
      "[蟠桃园信息] 对手 legionData 字段:",
      Object.keys(clubInfoRes.legionData),
      clubInfoRes.legionData,
    );
    if (selectedTokenId.value !== tokenId)
      return;

    // Set Battle Info (Header)
    battleInfo.value = {
      ownClub: {
        id: ownLegionId,
        name: ownLegionIdInfo?.legionData?.name || "我方俱乐部",
        level: ownLegionIdInfo?.legionData?.level || 0,
        power: ownLegionIdInfo?.legionData?.power || 0,
        serverId: ownLegionIdInfo?.legionData?.serverId || "",
        logo: ownLegionIdInfo?.legionData?.logo || "",
        quenchNum: ownLegionIdInfo?.legionData?.quenchNum || 0,
        announcement: ownLegionIdInfo?.legionData?.announcement || "",
        memberCount: killRes.recordsMap[ownLegionId]?.length || 0,
      },
      opponentClub: {
        id: opponentLegionId,
        name: clubInfoRes?.legionData?.name || "敌方俱乐部",
        level: clubInfoRes?.legionData?.level || 0,
        power: clubInfoRes?.legionData?.power || 0,
        serverId: clubInfoRes?.legionData?.serverId || "",
        logo: clubInfoRes?.legionData?.logo || "",
        quenchNum: clubInfoRes?.legionData?.quenchNum || 0,
        announcement: clubInfoRes?.legionData?.announcement || "",
        memberCount: killRes.recordsMap[opponentLegionId]?.length || 0,
        // 报名参战人数（战绩记录中的成员），兜底路径下在下方修正
        enrolledCount: memberIds.length,
      },
    };

    // Get Members List
    // If we didn't get memberIds from killrecord (e.g. Live mode or empty kill record), fallback to club info
    if (memberIds.length === 0) {
      const members = clubInfoRes.legionData.members || {};
      memberIds = Object.keys(members);
    }

    // 兜底路径下报名人数即为查询到的成员数
    battleInfo.value.opponentClub.enrolledCount = memberIds.length;

    const totalMembers = memberIds.length;

    // Fetch details for each member
    // We'll process them in chunks to avoid overwhelming the server/client
    const chunkSize = 5;
    for (let i = 0; i < totalMembers; i += chunkSize) {
      const chunk = memberIds.slice(i, i + chunkSize);
      const promises = chunk.map(async (roleId) => {
        try {
          const roleRes = await tokenStore.sendMessageWithPromise(
            tokenId,
            "rank_getroleinfo",
            {
              roleId: Number.parseInt(roleId),
              includeBottleTeam: false,
              isSearch: false, // Need equipment for red count
              bottleType: 0,
              includeHero: true,
              includeHeroDetail: true,
              includePearl: true,
            },
            5000,
          );

          if (roleRes && roleRes.roleInfo) {
            // Process Heroes
            let heroList = [];
            let totalRed = 0;

            // 鱼灵/鱼珠技能信息（按 artifactId 索引）
            const fishInfo = HeroFillInfo(roleRes.roleInfo);

            if (roleRes.roleInfo.heroes) {
              const heroes = Object.values(roleRes.roleInfo.heroes);
              heroList = heroes
                .map((h) => {
                  // Calculate Red for this hero
                  let heroRed = 0;
                  if (h.equipment) {
                    Object.values(h.equipment).forEach((eq) => {
                      if (eq.quenches) {
                        Object.values(eq.quenches).forEach((q) => {
                          if (q.colorId === 6)
                            heroRed++;
                        });
                      }
                    });
                  }
                  totalRed += heroRed;

                  return {
                    heroId: h.heroId,
                    artifactId: h.artifactId || "",
                    heroName: HERO_DICT[h.heroId]?.name || "未知",
                    red: heroRed,
                    power: h.power,
                    battleTeamSlot: h.battleTeamSlot,
                    HolyBeast: h.hB?.active === true,
                    HBlevel: h.hB?.order || 0,
                    PearlInfo: fishInfo[h.artifactId] || {},
                  };
                })
                .sort((a, b) => a.battleTeamSlot - b.battleTeamSlot);
            }

            return {
              id: roleRes.roleInfo.roleId,
              name: roleRes.roleInfo.name,
              headImg: roleRes.roleInfo.headImg,
              power: roleRes.roleInfo.power,
              legacy: roleRes.roleInfo.legacy?.color || 0,
              redQuench: totalRed,
              heroList,
              lineupType: getLineupType(heroList),
              // 展示宠物：showPet 带等级，roleInfo.pet 只有 id，两者都兜底
              pet: getShowPet(roleRes),
              // 玩具名称：用 lordWeaponId 查 weapon 字典
              toyName: formatWeapon(roleRes.roleInfo.lordWeaponId) || "",
            };
          }
        } catch (e) {
          console.error(`Failed to fetch info for ${roleId}`, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      results.forEach((r) => {
        if (r)
          opponentMembers.value.push(r);
      });
    }

    // Sort by redQuench Descending, then Power Descending
    if (selectedTokenId.value !== tokenId)
      return;

    opponentMembers.value.sort((a, b) => {
      if (b.redQuench !== a.redQuench) {
        return b.redQuench - a.redQuench;
      }
      return b.power - a.power;
    });
  } catch (error) {
    message.error(`获取数据失败: ${error.message}`);
    console.error(error);
  } finally {
    if (selectedTokenId.value === tokenId) {
      loading.value = false;
    }
  }
};

const handleExportImage = async () => {
  if (!exportDom.value) {
    message.error("未找到要导出的内容");
    return;
  }

  const root = exportDom.value;
  const tableContainer = root.querySelector(".n-data-table");
  const toolbarEl = root.querySelector(".toolbar");
  const bodyEl = root.querySelector(".n-data-table-base-table-body");

  // 保存所有会被临时改动的内联样式，finally 里逐个还原
  const touched = [];
  const setStyle = (el, props) => {
    if (!el)
      return;
    touched.push({ el, cssText: el.style.cssText });
    Object.assign(el.style, props);
  };

  const toolbarOrigDisplay = toolbarEl ? toolbarEl.style.display : "";
  const scrollLeft = bodyEl ? bodyEl.scrollLeft : 0;
  const scrollTop = bodyEl ? bodyEl.scrollTop : 0;

  try {
    message.loading("正在生成图片，请稍候...");

    // 表格真实内容宽度（min-width 已从 CSS 移除，靠 scrollWidth 拿）
    const tableWidth = tableContainer
      ? Math.max(tableContainer.scrollWidth, bodyEl?.scrollWidth || 0, 1400)
      : 1400;
    // 卡片左右各 16px padding
    const exportWidth = Math.ceil(tableWidth) + 32;

    // 导出期间放开所有横向/纵向限制，让内容完整展开
    root.classList.add("exporting-image");
    setStyle(root, {
      width: `${exportWidth}px`,
      height: "auto",
      overflow: "visible",
    });
    if (toolbarEl)
      toolbarEl.style.display = "none";
    if (bodyEl) {
      bodyEl.scrollLeft = 0;
      bodyEl.scrollTop = 0;
    }

    // 等一帧让浏览器完成重排，再量高度
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rect = root.getBoundingClientRect();
    const exportHeight = Math.ceil(rect.height);

    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      allowTaint: true,
      width: exportWidth,
      height: exportHeight,
      windowWidth: exportWidth,
      windowHeight: exportHeight,
      scrollX: 0,
      scrollY: 0,
    });

    const filename = `蟠桃园敌方信息_${queryDate.value.replace(/\//g, "-")}.png`;
    downloadCanvasAsImage(canvas, filename);

    message.success("图片导出成功");
  } catch (err) {
    console.error("DOM转图片失败：", err);
    message.error("导出图片失败，请重试");
  } finally {
    root.classList.remove("exporting-image");
    for (const { el, cssText } of touched) el.style.cssText = cssText;
    if (toolbarEl)
      toolbarEl.style.display = toolbarOrigDisplay || "";
    if (bodyEl) {
      bodyEl.scrollLeft = scrollLeft;
      bodyEl.scrollTop = scrollTop;
    }
  }
};

onMounted(() => {
  queryDate.value = getLastSunday();
  fetchCurrentClubInfo();
  fetchBattleInfo();
});

watch(selectedTokenId, (newTokenId, oldTokenId) => {
  if (!newTokenId || newTokenId === oldTokenId)
    return;

  currentClubInfo.value = null;
  battleInfo.value = null;
  opponentMembers.value = [];
  fetchCurrentClubInfo(newTokenId);
  fetchBattleInfo(newTokenId);
});
</script>

<style scoped lang="scss">
.peach-info-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  /* flex 子项默认 min-width:auto，会被 1400px 的表格内容撑宽，这里显式压回去 */
  min-width: 0;
  max-width: 100%;
}

.peach-info-card.exporting-image {
  height: auto;
  max-width: none;
  overflow: visible;
}
</style>
