import { ref } from "vue";
import html2canvas from "html2canvas";
import { getLineupType, HERO_DICT } from "@/utils/heroList";
import { downloadCanvasAsImage } from "@/utils/imageExport";

const getLastSunday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const hour = today.getHours();
  const daysToSubtract = dayOfWeek === 0 && hour < 18 ? 7 : dayOfWeek;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - daysToSubtract);

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

const formatDateToShort = (dateText) => {
  const parts = String(dateText || "").split("/");
  if (parts.length !== 3)
    return dateText;
  const [year, month, day] = parts;
  return `${year.slice(2)}${month}${day}`;
};

const isSundayBattleTime = () => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  return now.getDay() === 0
    && ((hour >= 18 && hour < 20) || (hour === 20 && minute <= 30));
};

const normalizeMember = (roleResponse) => {
  const roleInfo = roleResponse.roleInfo;
  let totalRed = 0;
  const heroList = Object.values(roleInfo.heroes || {})
    .map((hero) => {
      let red = 0;
      Object.values(hero.equipment || {}).forEach((equipment) => {
        Object.values(equipment.quenches || {}).forEach((quench) => {
          if (Number(quench.colorId) === 6)
            red++;
        });
      });
      totalRed += red;
      return {
        heroId: hero.heroId,
        heroName: HERO_DICT[hero.heroId]?.name || "未知",
        red,
        power: hero.power,
        battleTeamSlot: hero.battleTeamSlot,
        HolyBeast: hero.hB?.active === true,
        HBlevel: hero.hB?.order || 0,
      };
    })
    .sort((left, right) => left.battleTeamSlot - right.battleTeamSlot);

  return {
    id: roleInfo.roleId,
    name: roleInfo.name,
    headImg: roleInfo.headImg,
    power: roleInfo.power,
    legacy: roleInfo.legacy?.color || 0,
    redQuench: totalRed,
    heroList,
    lineupType: getLineupType(heroList),
  };
};

export const useLegacyPeachBattle = ({ club, message, tokenStore }) => {
  const battleInfo = ref(null);
  const loading = ref(false);
  const opponentMembers = ref([]);
  const queryDate = ref(getLastSunday());

  const formatPower = (power) => {
    if (!power)
      return "0";
    if (power >= 100000000)
      return `${(power / 100000000).toFixed(1)}亿`;
    if (power >= 10000)
      return `${(power / 10000).toFixed(1)}万`;
    return power.toString();
  };

  const disabledDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.getDay() !== 0 || date > Date.now();
  };

  const fetchBattleInfo = async () => {
    if (!tokenStore.selectedToken) {
      message.warning("请先选择游戏角色");
      return;
    }

    const tokenId = tokenStore.selectedToken.id;
    if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
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

      if (queryDate.value === getLastSunday() && isSundayBattleTime()) {
        const battlefield = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadbf",
          {},
          10000,
        );
        if (!battlefield?.legions) {
          message.error("未获取到战场信息");
          return;
        }
        ownLegionId = club.value?.id;
        opponentLegionId = battlefield.legions[0]?.id;
        if (ownLegionId === opponentLegionId)
          opponentLegionId = battlefield.legions[1]?.id;
        if (!opponentLegionId) {
          message.error("未获取到对战俱乐部ID");
          return;
        }
      } else {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadtask",
          {},
          10000,
        );
        ownLegionId = club.value?.id;
        const recordResponse = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadrecord",
          {},
          10000,
        );
        if (!recordResponse?.enemyLegionMap) {
          message.warning("未获取到历史对战记录");
          return;
        }
        opponentLegionId = recordResponse.enemyLegionMap[shortDate]?.id;
        if (!opponentLegionId) {
          message.warning(`未找到 ${queryDate.value} 的对战记录`);
          return;
        }
      }

      const killResponse = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getpayloadkillrecord",
        { date: shortDate },
        10000,
      );
      const opponentRecords = killResponse?.recordsMap?.[opponentLegionId];
      if (opponentRecords)
        memberIds = opponentRecords.map((record) => record.roleInfo.roleId);

      const ownClubResponse = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getinfobyid",
        { legionId: ownLegionId },
        10000,
      );
      const opponentClubResponse = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getinfobyid",
        { legionId: opponentLegionId },
        10000,
      );
      if (!opponentClubResponse?.legionData) {
        message.error("无法获取对手俱乐部详情");
        return;
      }

      const ownData = ownClubResponse?.legionData || {};
      const opponentData = opponentClubResponse.legionData;
      battleInfo.value = {
        ownClub: {
          id: ownLegionId,
          name: ownData.name || "我方俱乐部",
          level: ownData.level || 0,
          power: ownData.power || 0,
          serverId: ownData.serverId || "",
          logo: ownData.logo || "",
          quenchNum: ownData.quenchNum || 0,
          announcement: ownData.announcement || "",
          memberCount: killResponse?.recordsMap?.[ownLegionId]?.length || 0,
        },
        opponentClub: {
          id: opponentLegionId,
          name: opponentData.name || "敌方俱乐部",
          level: opponentData.level || 0,
          power: opponentData.power || 0,
          serverId: opponentData.serverId || "",
          logo: opponentData.logo || "",
          quenchNum: opponentData.quenchNum || 0,
          announcement: opponentData.announcement || "",
          memberCount: opponentRecords?.length || 0,
        },
      };

      if (!memberIds.length)
        memberIds = Object.keys(opponentData.members || {});

      const chunkSize = 5;
      for (let index = 0; index < memberIds.length; index += chunkSize) {
        const chunk = memberIds.slice(index, index + chunkSize);
        const results = await Promise.all(chunk.map(async (roleId) => {
          try {
            const roleResponse = await tokenStore.sendMessageWithPromise(
              tokenId,
              "rank_getroleinfo",
              {
                roleId: Number.parseInt(roleId),
                includeBottleTeam: false,
                isSearch: false,
                bottleType: 0,
                includeHero: true,
                includeHeroDetail: true,
                includePearl: true,
              },
              5000,
            );
            return roleResponse?.roleInfo ? normalizeMember(roleResponse) : null;
          } catch (error) {
            console.error(`Failed to fetch info for ${roleId}`, error);
            return null;
          }
        }));
        opponentMembers.value.push(...results.filter(Boolean));
      }

      opponentMembers.value.sort((left, right) => {
        if (right.redQuench !== left.redQuench)
          return right.redQuench - left.redQuench;
        return right.power - left.power;
      });
    } catch (error) {
      message.error(`获取数据失败: ${error.message}`);
      console.error(error);
    } finally {
      loading.value = false;
    }
  };

  const fetchBattleRecordsByDate = (value) => {
    queryDate.value = value === undefined ? getLastSunday() : value;
    fetchBattleInfo();
  };

  const handleExportImage = async (root) => {
    if (!root) {
      message.error("未找到要导出的内容");
      return;
    }

    const table = root.querySelector(".n-data-table");
    const scrollContainer = table?.querySelector(".n-data-table-base-table-body");
    const originalRootCss = root.style.cssText;
    const originalScrollCss = scrollContainer?.style.cssText;

    try {
      message.loading("正在生成图片，请稍候...");
      if (scrollContainer) {
        scrollContainer.style.height = "auto";
        scrollContainer.style.overflow = "visible";
      }
      root.style.height = "auto";
      root.style.overflow = "visible";
      await new Promise((resolve) => setTimeout(resolve, 500));

      const canvas = await html2canvas(root, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
      });
      downloadCanvasAsImage(
        canvas,
        `蟠桃园敌方信息_${queryDate.value.replaceAll("/", "-")}.png`,
      );
      message.success("图片导出成功");
    } catch (error) {
      console.error("DOM转图片失败：", error);
      message.error("导出图片失败，请重试");
    } finally {
      root.style.cssText = originalRootCss;
      if (scrollContainer)
        scrollContainer.style.cssText = originalScrollCss;
    }
  };

  return {
    battleInfo,
    disabledDate,
    fetchBattleInfo,
    fetchBattleRecordsByDate,
    formatPower,
    handleExportImage,
    loading,
    opponentMembers,
    queryDate,
  };
};
