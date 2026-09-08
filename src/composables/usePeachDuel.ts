import type { ComputedRef, Ref } from "vue";
import { reactive, ref } from "vue";
import { HERO_DICT, HeroFillInfo } from "@/utils/heroList";

interface PeachDuelOptions {
  tokenStore: any;
  message: any;
  selectedTokenId: ComputedRef<string>;
  opponentMembers: Ref<any[]>;
  formatPower: (power: any) => string;
}

export const usePeachDuel = ({
  tokenStore,
  message,
  selectedTokenId,
  opponentMembers,
  formatPower,
}: PeachDuelOptions) => {
  const queryLoading = ref(false);
  const queryTargetId = ref("");
  // 玩家信息模态框状态
  const showPlayerInfoModal = ref(false);
  const playerInfo = ref(null);

  // 新增切磋次数相关状态
  const fightCount = ref(1);
  const isFightCountValid = ref(true);

  // 切磋进度状态
  const fightProgress = reactive({
    visible: false,
    totalCount: 0,
    completedCount: 0,
    remainingCount: 0,
    winCount: 0,
    lossCount: 0,
    percentage: 0,
  });

  // 最终结果状态
  const fightResult = reactive({
    visible: false,
    totalCount: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
    ourDieRate: 0,
    enemyDieRate: 0,
    resultCount: [], // 存储每场战斗的详细结果
  });

  // 切磋历史记录
  const fightHistory = ref([]);

  // 一键挑战：每行的模拟结果  key=roleId, value={winRate, fullWinRate, status:'pending'|'fighting'|'done'}
  const battleSimResults = ref({});
  // 一键挑战是否正在运行
  const batchDuelRunning = ref(false);

  // 掉将统计
  const dieStats = reactive({
    ourDieHeroGameCount: 0,
    enemyDieHeroGameCount: 0,
  });

  // 武将详情模态框状态
  const showHeroModal = ref(false);
  // 选中的武将信息
  const heroModealTemp = ref(null);

  // 选择武将信息，显示详情模态框
  const selectHeroInfo = (heroInfo) => {
    showHeroModal.value = true;
    heroModealTemp.value = heroInfo;
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
        if (Number(item.colorId) === 6) {
          redCount++;
        }
      });
    });
    return { redCount, holeCount };
  };

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

        const heroInfo = HERO_DICT[hero.heroId] || {};
        const equipmentInfo = hero.equipment
          ? getEquipment(hero.equipment)
          : { redCount: 0, holeCount: 0 };

        // 检查英雄基本信息
        const heroId = hero.heroId || `unknown_${index}`;
        const heroName = hero.heroName || heroInfo.name || `未知武将_${index}`;

        const tempObj = {
          heroId, // 英雄ID
          artifactId: hero.artifactId || "", // 英雄装备ID，用于匹配鱼灵信息
          power: hero.power || 0, // 英雄战力
          star: hero.star || 0, // 英雄星级
          equipment: hero.equipment, // 英雄具体孔数和红数
          heroName, // 英雄姓名
          heroAvate: hero.heroAvate || heroInfo.avatar || "",
          level: hero.level || 0, // 英雄等级
          hole: equipmentInfo.holeCount, // 英雄开孔数量
          red: equipmentInfo.redCount, // 英雄红数
          HolyBeast: hero.hB?.active === true, // 激活四圣
          HBlevel: hero.hB?.order || 0, // 四圣等级
          // 添加英雄详情信息
          skillList: hero.skillList || [],
          attributeList: hero.attributeList || [],
          battleTeamSlot: hero.battleTeamSlot, // 阵容站位
        };

        // 只添加有效的英雄
        if (heroId && heroName) {
          redCount += tempObj.red;
          holeCount += tempObj.hole;
          heroList.push(tempObj);
        }
      });
    } catch (error) {
      console.error("处理英雄信息时发生错误:", error);
      heroList = [];
    }
    heroList.sort((a, b) => a.battleTeamSlot - b.battleTeamSlot);
    return { redCount, holeCount, heroList };
  };

  // 验证切磋次数
  const validateFightCount = (value) => {
    const num = Number.parseInt(value);
    isFightCountValid.value = !Number.isNaN(num) && num >= 1 && num <= 100;
  };

  const updateFightCount = (value) => {
    fightCount.value = value;
    validateFightCount(value);
  };

  // 重置切磋结果
  const resetFightResult = () => {
    fightResult.visible = false;
    fightProgress.visible = false;
    fightHistory.value = [];
    dieStats.ourDieHeroGameCount = 0;
    dieStats.enemyDieHeroGameCount = 0;
    fightCount.value = 1;
    validateFightCount(1);
  };

  // 更新切磋进度
  const updateFightProgress = (completedCount, winCount, lossCount) => {
    fightProgress.completedCount = completedCount;
    fightProgress.winCount = winCount;
    fightProgress.lossCount = lossCount;
    fightProgress.remainingCount = fightProgress.totalCount - completedCount;
    fightProgress.percentage = Math.round(
      (completedCount / fightProgress.totalCount) * 100,
    );
  };

  // 计算最终结果
  const calculateFinalResult = (winCount, lossCount, resultCount) => {
    fightResult.totalCount = fightProgress.totalCount;
    fightResult.winCount = winCount;
    fightResult.lossCount = lossCount;
    fightResult.winRate = Math.round((winCount / fightProgress.totalCount) * 100);
    fightResult.ourDieRate = Math.round(
      (dieStats.ourDieHeroGameCount / fightProgress.totalCount) * 100,
    );
    fightResult.enemyDieRate = Math.round(
      (dieStats.enemyDieHeroGameCount / fightProgress.totalCount) * 100,
    );
    fightResult.resultCount = resultCount; // 存储每场战斗的详细结果
    fightResult.visible = true;
    fightProgress.visible = false;
  };

  // 新增查询对手信息功能
  const fetchTargetInfo = async (roleId) => {
    if (!selectedTokenId.value) {
      message.warning("请先选择游戏角色");
      return;
    }

    const tokenId = selectedTokenId.value;

    // 检查WebSocket连接
    const wsStatus = tokenStore.getWebSocketStatus(tokenId);
    if (wsStatus !== "connected") {
      message.error("WebSocket未连接，无法查询战绩");
      return;
    }

    // 重置之前的切磋结果
    resetFightResult();

    queryLoading.value = true;
    queryTargetId.value = roleId;

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
        message.warning("未查询到对手信息");
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

      const playerData = {
        id: roleId,
        name: result.roleInfo.name,
        headImg: result.roleInfo.headImg,
        power: result.roleInfo.power,
        level: result.roleInfo.level,
        serverName: result.roleInfo.serverName,
        legionName: result.legionInfo?.name || "无",
        // 显示角色的红淬数
        redQuench: roleRedQuench,
        // 四圣数统计
        holyBeast: heroAndholdAndRed.heroList.filter((hero) => hero.HolyBeast)
          .length,
        // 俱乐部历史最高战力
        maxPower: formatPower(legionMaxPower),
        // 当前红鼓和最大红鼓
        currentRedDrum: roleRedQuench,
        maxRedDrum: roleMaxRed,
        // 总红数和总开孔数
        totalRedCount,
        totalHoleCount,
        // 俱乐部红淬数据
        legionRedQuench,
        legionMaxRed,
        // 英雄列表
        heroList: heroAndholdAndRed.heroList,
        legacy: result.roleInfo.legacy?.color || 0, // 功法等级
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

  // 切磋功能处理 - 支持连续切磋
  const handleDuel = async () => {
    if (!playerInfo.value)
      return;

    // 验证切磋次数
    validateFightCount(fightCount.value);
    if (!isFightCountValid.value) {
      message.error("请输入有效的切磋次数 (1-100)");
      return;
    }

    const totalCount = Number.parseInt(fightCount.value);
    message.info(`开始连续切磋: ${playerInfo.value.name}，共${totalCount}次`);

    if (!tokenStore.selectedToken) {
      message.warning("请先选择游戏角色");
      return;
    }

    const tokenId = tokenStore.selectedToken.id;

    // 检查WebSocket连接
    const wsStatus = tokenStore.getWebSocketStatus(tokenId);
    if (wsStatus !== "connected") {
      message.error("WebSocket未连接，无法发起切磋");
      return;
    }

    queryLoading.value = true;

    // 初始化切磋进度
    fightProgress.visible = true;
    fightProgress.totalCount = totalCount;
    fightProgress.completedCount = 0;
    fightProgress.remainingCount = totalCount;
    fightProgress.winCount = 0;
    fightProgress.lossCount = 0;
    fightProgress.percentage = 0;

    // 重置掉将统计
    dieStats.ourDieHeroGameCount = 0;
    dieStats.enemyDieHeroGameCount = 0;

    // 重置历史记录
    fightHistory.value = [];

    try {
      let winCount = 0;
      let lossCount = 0;
      const resultCount = []; // 存储每场战斗的详细结果

      // 重置掉将统计
      dieStats.ourDieHeroGameCount = 0;
      dieStats.enemyDieHeroGameCount = 0;

      // 执行连续切磋
      for (let i = 0; i < totalCount; i++) {
        message.info(`正在进行第 ${i + 1}/${totalCount} 场切磋`);

        // 调用实际的切磋API
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_startpvp",
          {
            targetId: playerInfo.value.id,
          },
          10000,
        );

        console.log(`第 ${i + 1} 场切磋结果:`, result);

        if (result && result.battleData) {
          // 处理掉将情况
          let leftCount = 0;
          let rightCount = 0;

          // 检查我方掉将情况
          if (result.battleData.result?.sponsor?.teamInfo) {
            result.battleData.result.sponsor.teamInfo.forEach((item) => {
              if (Number(item.hp) === 0) {
                leftCount++;
              }
            });
          }

          // 检查敌方掉将情况
          if (result.battleData.result?.accept?.teamInfo) {
            result.battleData.result.accept.teamInfo.forEach((item) => {
              if (Number(item.hp) === 0) {
                rightCount++;
              }
            });
          }

          // 构建战斗结果对象
          const battleResult = {
            isWin: result.battleData.result?.isWin || false,
            leftName: result.battleData.leftTeam?.name || "未知",
            leftheadImg: result.battleData.leftTeam?.headImg || "",
            leftpower: formatPower(result.battleData.leftTeam?.power || 0),
            leftDieHero: leftCount,
            rightName: result.battleData.rightTeam?.name || "未知",
            rightheadImg: result.battleData.rightTeam?.headImg || "",
            rightpower: formatPower(result.battleData.rightTeam?.power || 0),
            rightDieHero: rightCount,
          };

          // 保存到结果数组
          resultCount.push(battleResult);

          // 更新掉将统计
          if (leftCount > 0) {
            dieStats.ourDieHeroGameCount++;
          }
          if (rightCount > 0) {
            dieStats.enemyDieHeroGameCount++;
          }

          // 更新胜负计数
          if (battleResult.isWin) {
            winCount++;
          } else {
            lossCount++;
          }

          // 更新切磋进度
          updateFightProgress(i + 1, winCount, lossCount);

          // 短暂延迟，避免请求过于频繁
          if (i < totalCount - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } else {
          // 单场切磋失败，继续下一场
          message.warning(
            `第 ${i + 1} 场切磋失败: ${result?.message || "未返回战斗数据"}`,
          );
          lossCount++;
          updateFightProgress(i + 1, winCount, lossCount);
        }
      }

      // 所有切磋完成，计算最终结果
      calculateFinalResult(winCount, lossCount, resultCount);

      message.success(`连续切磋完成，共${totalCount}场`);
    } catch (error) {
      console.error("连续切磋失败:", error);
      message.error(`连续切磋失败: ${error.message || "网络错误"}`);
      fightProgress.visible = false;
    } finally {
      queryLoading.value = false;
      // 不关闭模态框，让用户可以继续查看或再次切磋
    }
  };

  // 一键挑战：串行对每个对手切磋5次，结果写入 battleSimResults
  const handleBatchDuel = async () => {
    if (!opponentMembers.value.length) {
      message.warning("请先加载对手列表");
      return;
    }
    if (!tokenStore.selectedToken) {
      message.warning("请先选择游戏角色");
      return;
    }
    const tokenId = tokenStore.selectedToken.id;
    const wsStatus = tokenStore.getWebSocketStatus(tokenId);
    if (wsStatus !== "connected") {
      message.error("WebSocket未连接，无法发起切磋");
      return;
    }

    batchDuelRunning.value = true;
    const init = {};
    opponentMembers.value.forEach((m) => {
      init[m.id] = { status: "pending", winRate: null, fullWinRate: null };
    });
    battleSimResults.value = init;

    const ROUNDS = 5;
    const RATE_LIMIT_CODE = 400340;
    // 第二轮补跑前的冷却时间，让服务端限频窗口过去
    const RETRY_SWEEP_DELAY = 15000;

    // 单局切磋，遇到限频(400340)时等11s重试一次，仍失败返回 null
    const doOneFight = async (roleId) => {
      try {
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "fight_startpvp",
          { targetId: Number.parseInt(roleId) },
          10000,
        );
        // 服务器返回限频错误码
        if (result && result.code === RATE_LIMIT_CODE) {
          console.warn(`[一键切磋] 限频 400340，等待 11s 后重试`);
          message.warning("触发限频，暂停11秒后重试…");
          await new Promise((r) => setTimeout(r, 11000));
          const retry = await tokenStore.sendMessageWithPromise(
            tokenId,
            "fight_startpvp",
            { targetId: Number.parseInt(roleId) },
            10000,
          );
          if (retry && retry.code === RATE_LIMIT_CODE)
            return null; // 重试仍限频
          return retry;
        }
        return result;
      } catch (e) {
        // 限频有时以异常形式抛出，错误消息含 400340
        const msg = e?.message || String(e);
        if (msg.includes(String(RATE_LIMIT_CODE))) {
          console.warn(`[一键切磋] 限频异常，等待 11s 后重试`);
          message.warning("触发限频，暂停11秒后重试…");
          await new Promise((r) => setTimeout(r, 11000));
          try {
            return await tokenStore.sendMessageWithPromise(
              tokenId,
              "fight_startpvp",
              { targetId: Number.parseInt(roleId) },
              10000,
            );
          } catch {
            return null;
          }
        }
        console.warn(`[一键切磋] ${roleId} 单局异常`, e);
        return null;
      }
    };

    // 跑完一个人的 ROUNDS 局，写回结果。返回 true 表示成功，false 表示超时异常
    const runMember = async (roleId) => {
      battleSimResults.value = {
        ...battleSimResults.value,
        [roleId]: { status: "fighting", winRate: null, fullWinRate: null },
      };

      let wins = 0;
      let fullWins = 0;
      let timeout = false;

      for (let i = 0; i < ROUNDS; i++) {
        const result = await doOneFight(roleId);

        if (result === null) {
          // 重试后仍失败 → 标记超时异常并跳出本人剩余局数
          timeout = true;
          break;
        }

        if (result && result.battleData) {
          const isWin = result.battleData.result?.isWin || false;
          let ourDie = 0;
          if (result.battleData.result?.sponsor?.teamInfo) {
            result.battleData.result.sponsor.teamInfo.forEach((item) => {
              if (Number(item.hp) === 0)
                ourDie++;
            });
          }
          if (isWin) {
            wins++;
            if (ourDie === 0)
              fullWins++;
          }
        }

        if (i < ROUNDS - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (timeout) {
        battleSimResults.value = {
          ...battleSimResults.value,
          [roleId]: { status: "timeout", winRate: null, fullWinRate: null },
        };
        return false;
      }

      const winRate = Math.round((wins / ROUNDS) * 100);
      const fullWinRate = Math.round((fullWins / ROUNDS) * 100);
      battleSimResults.value = {
        ...battleSimResults.value,
        [roleId]: { status: "done", winRate, fullWinRate },
      };
      return true;
    };

    try {
      // 第一轮：按顺序跑全部成员
      for (const member of opponentMembers.value) {
        await runMember(member.id);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      // 第二轮：补跑第一轮里超时异常的成员
      const retryIds = opponentMembers.value
        .map((m) => m.id)
        .filter((id) => battleSimResults.value[id]?.status === "timeout");

      if (retryIds.length) {
        message.info(`补跑 ${retryIds.length} 个超时异常账号…`);
        // 先缓一下，让服务端限频窗口过去
        await new Promise((resolve) => setTimeout(resolve, RETRY_SWEEP_DELAY));

        let recovered = 0;
        for (const roleId of retryIds) {
          const ok = await runMember(roleId);
          if (ok)
            recovered++;
          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        const stillFailed = retryIds.length - recovered;
        if (stillFailed > 0) {
          message.warning(
            `补跑完成：成功 ${recovered} 个，仍异常 ${stillFailed} 个`,
          );
        } else {
          message.success(`补跑完成：${recovered} 个账号全部补齐`);
        }
      }

      message.success("一键切磋完成");
    } catch (e) {
      console.error("[一键挑战] 异常中止", e);
      message.error(`一键挑战中止: ${e.message}`);
    } finally {
      batchDuelRunning.value = false;
    }
  };

  return {
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
  };
};
