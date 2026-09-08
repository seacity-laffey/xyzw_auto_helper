import type { Ref } from "vue";
import {
  LEGION_TECH_MAX_LEVEL,
  LEGION_TECH_RESET_TYPE_MAP,
  LEGION_TECH_TYPE_MAP,
  weapon,
} from "@/utils/heroList";

const COMMAND_DELAY = 500;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

interface UnlimitedLineupApplicationOptions {
  tokenStore: any;
  message: any;
  currentTeamId: Ref<number>;
  roleHeroesData: Ref<Record<string, any>>;
  state: Ref<{ isRunning: boolean }>;
  forceRefreshTeamInfo: () => Promise<void>;
}

export const useUnlimitedLineupApplication = ({
  tokenStore,
  message,
  currentTeamId,
  roleHeroesData,
  state,
  forceRefreshTeamInfo,
}: UnlimitedLineupApplicationOptions) => {
  const syncLegionResearch = async (tokenId: any, targetResearch: any) => {
    if (!targetResearch || Object.keys(targetResearch).length === 0) {
      return { success: true, message: "无科技数据需要同步" };
    }

    const roleInfo = await tokenStore.sendMessageWithPromise(
      tokenId,
      "role_getroleinfo",
      {},
    );
    await delay(COMMAND_DELAY);
    const role = roleInfo?.role || roleInfo;
    const currentResearch = role?.legionResearch || {};

    const typesToReset = new Set();
    const typesToResetResearch = new Set();

    for (const type of [1, 2, 3, 4, 5, 6]) {
      const techIds = LEGION_TECH_RESET_TYPE_MAP[type];
      for (const techId of techIds) {
        const currentLevel = currentResearch[techId] || 0;
        const targetLevel = targetResearch[techId] || 0;
        if (
          currentLevel !== targetLevel
          && (currentLevel > 0 || targetLevel > 0)
        ) {
          typesToResetResearch.add(type);
          break;
        }
      }
      const techIds2 = LEGION_TECH_TYPE_MAP[type];
      for (const techId of techIds2) {
        const currentLevel = currentResearch[techId] || 0;
        const targetLevel = targetResearch[techId] || 0;
        if (
          currentLevel !== targetLevel
          && (currentLevel > 0 || targetLevel > 0)
        ) {
          typesToReset.add(type);
          break;
        }
      }
    }

    if (typesToResetResearch.size === 0 && typesToReset.size === 0) {
      return { success: true, message: "科技配置已匹配，无需调整" };
    }

    for (const type of typesToResetResearch) {
      try {
        await tokenStore.sendMessageWithPromise(tokenId, "legion_resetresearch", {
          advanced: false,
          type,
        });
      } catch (err) {}
      await delay(COMMAND_DELAY);
    }

    const sortedTypes = [...typesToReset].sort((a, b) => a - b);
    console.log(sortedTypes);

    for (const type of sortedTypes) {
      const techIds2 = LEGION_TECH_TYPE_MAP[type];
      for (const techId of techIds2) {
        const targetLevel = targetResearch[techId] || 0;
        if (targetLevel > 0) {
          const maxLevel = LEGION_TECH_MAX_LEVEL[techId];
          const isMax = targetLevel >= maxLevel;
          if (isMax) {
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "legion_research",
                {
                  isMax: true,
                  researchId: techId,
                },
              );
            } catch (err) {}
            await delay(COMMAND_DELAY);
          } else {
            for (let i = 0; i < targetLevel; i++) {
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "legion_research",
                  {
                    isMax: false,
                    researchId: techId,
                  },
                );
              } catch (err) {}
              await delay(COMMAND_DELAY);
            }
          }
        }
      }
    }

    return { success: true, message: "科技配置已同步" };
  };

  const LEVEL_ORDER_THRESHOLDS = [
    { level: 100, order: 1 },
    { level: 200, order: 2 },
    { level: 300, order: 3 },
    { level: 500, order: 4 },
    { level: 700, order: 5 },
    { level: 900, order: 6 },
    { level: 1100, order: 7 },
    { level: 1300, order: 8 },
    { level: 1500, order: 9 },
    { level: 1800, order: 10 },
    { level: 2100, order: 11 },
    { level: 2400, order: 12 },
    { level: 2800, order: 13 },
    { level: 3200, order: 14 },
    { level: 3600, order: 15 },
    { level: 4000, order: 16 },
    { level: 4500, order: 17 },
    { level: 5000, order: 18 },
    { level: 5500, order: 19 },
  ];

  const UPGRADE_OPTIONS = [50, 10, 5, 1];

  const getNextOrderLevel = (currentLevel: number) => {
    for (const threshold of LEVEL_ORDER_THRESHOLDS) {
      if (currentLevel < threshold.level) {
        return threshold.level;
      }
    }
    return null;
  };

  const getOrder = (level: number) => {
    let order = 0;
    for (const threshold of LEVEL_ORDER_THRESHOLDS) {
      if (level >= threshold.level) {
        order = threshold.order;
      } else {
        break;
      }
    }
    return order;
  };

  const applyHeroLevel = async (
    tokenId: any,
    heroId: number,
    targetLevel: number,
    currentLevel: number,
    currentOrder = 0,
    slot = -1,
  ) => {
    if (!targetLevel || targetLevel <= 0)
      return { success: true, message: "无目标等级" };

    let actualCurrentLevel = currentLevel;
    let actualCurrentOrder = currentOrder;

    if (actualCurrentLevel > targetLevel) {
      if (slot >= 0) {
        try {
          await tokenStore.sendMessageWithPromise(tokenId, "hero_gobackbattle", {
            slot,
          });
        } catch (err) {}
        await delay(COMMAND_DELAY);
      }

      try {
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "hero_rebirth",
          {
            heroId,
          },
        );
        if (result?.role?.heroes?.[heroId]?.level !== undefined) {
          actualCurrentLevel = result.role.heroes[heroId].level;
        } else {
          actualCurrentLevel = 1;
        }
        if (result?.role?.heroes?.[heroId]?.order !== undefined) {
          actualCurrentOrder = result.role.heroes[heroId].order;
        } else {
          actualCurrentOrder = 0;
        }
      } catch (err) {}
      await delay(COMMAND_DELAY);

      if (slot >= 0) {
        try {
          await tokenStore.sendMessageWithPromise(tokenId, "hero_gointobattle", {
            heroId,
            slot,
          });
        } catch (err) {}
        await delay(COMMAND_DELAY);
      }
    }

    const expectedOrder = getOrder(actualCurrentLevel);
    if (actualCurrentOrder < expectedOrder) {
      try {
        const result = await tokenStore.sendMessageWithPromise(
          tokenId,
          "hero_heroupgradeorder",
          {
            heroId,
          },
        );
        if (result?.role?.heroes?.[heroId]?.order !== undefined) {
          actualCurrentOrder = result.role.heroes[heroId].order;
        } else {
          actualCurrentOrder = expectedOrder;
        }
      } catch (err) {}
      await delay(COMMAND_DELAY);
    }

    if (actualCurrentLevel >= targetLevel) {
      return { success: true, message: "等级已达标" };
    }

    while (actualCurrentLevel < targetLevel) {
      const nextOrderLevel = getNextOrderLevel(actualCurrentLevel);
      const maxAllowed = nextOrderLevel
        ? nextOrderLevel - actualCurrentLevel
        : targetLevel - actualCurrentLevel;
      const remaining = targetLevel - actualCurrentLevel;
      const stepLimit = Math.min(maxAllowed, remaining);

      let upgradeNum = 1;
      for (const num of UPGRADE_OPTIONS) {
        if (num <= stepLimit) {
          upgradeNum = num;
          break;
        }
      }

      try {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "hero_heroupgradelevel",
          {
            heroId,
            upgradeNum,
          },
        );
        actualCurrentLevel += upgradeNum;
      } catch (err) {}
      await delay(COMMAND_DELAY);

      if (nextOrderLevel && actualCurrentLevel >= nextOrderLevel) {
        try {
          const result = await tokenStore.sendMessageWithPromise(
            tokenId,
            "hero_heroupgradeorder",
            {
              heroId,
            },
          );
          if (result?.role?.heroes?.[heroId]?.order !== undefined) {
            actualCurrentOrder = result.role.heroes[heroId].order;
          } else {
            actualCurrentOrder++;
          }
        } catch (err) {}
        await delay(COMMAND_DELAY);
      }
    }

    return { success: true, message: `等级已升至 ${actualCurrentLevel}` };
  };

  const applyLineup = async (lineup: any) => {
    const token = tokenStore.selectedToken;
    if (!token) {
      message.warning("请先选择Token");
      return;
    }

    const tokenId = token.id;
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      message.error("WebSocket未连接，无法应用阵容");
      return;
    }

    if (lineup.teamId !== currentTeamId.value) {
      message.warning(
        `此阵容仅适用于阵容槽位 ${lineup.teamId}，当前槽位为 ${currentTeamId.value}`,
      );
      return;
    }

    lineup.applying = true;
    state.value.isRunning = true;
    const errors = [];

    const getTeamHeroes = (teamInfo: any) => {
      if (!teamInfo)
        return [];
      return Object.entries(teamInfo)
        .map(([key, hero]) => ({
          position: hero?.battleTeamSlot ?? Number(key),
          heroId: hero?.heroId || hero?.id,
          artifactId: hero?.artifactId || null,
          attachmentUid: hero?.attachmentUid || null,
        }))
        .filter((h) => h.heroId)
        .sort((a, b) => a.position - b.position);
    };

    const fetchLatestData = async (teamId: number | null = null) => {
      const roleInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        {},
      );
      await delay(COMMAND_DELAY);
      const presetTeam = await tokenStore.sendMessageWithPromise(
        tokenId,
        "presetteam_getinfo",
        {},
      );
      await delay(COMMAND_DELAY);
      const heroes = roleInfo?.role?.heroes || roleInfo?.heroes || {};
      const pearlMapData = roleInfo?.role?.pearlMap || roleInfo?.pearlMap || {};
      const artifactBooksData
        = roleInfo?.role?.artifactBooks || roleInfo?.artifactBooks || {};
      roleHeroesData.value = heroes;
      const targetTeamId = teamId || currentTeamId.value;
      const team
        = presetTeam?.presetTeamInfo?.presetTeamInfo?.[targetTeamId]
          || presetTeam?.presetTeamInfo?.presetTeamInfo?.[String(targetTeamId)];
      return {
        heroes,
        teamInfo: team?.teamInfo || {},
        pearlMap: pearlMapData,
        artifactBooks: artifactBooksData,
      };
    };

    try {
      const targetHeroes = [...lineup.heroes];

      let { heroes, teamInfo } = await fetchLatestData();
      let currentHeroes = getTeamHeroes(teamInfo);

      const attachmentToHero = {};
      for (const [id, hero] of Object.entries(heroes)) {
        if (hero.attachmentUid && hero.attachmentUid !== -1) {
          attachmentToHero[hero.attachmentUid] = Number(id);
        }
      }

      const currentHeroIds = new Set(currentHeroes.map((h) => h.heroId));
      const targetHeroIds = new Set(targetHeroes.map((h) => h.heroId));

      for (const targetHero of targetHeroes) {
        if (!targetHero.attachmentUid || targetHero.attachmentUid === -1)
          continue;

        const currentHolderId = attachmentToHero[targetHero.attachmentUid];

        if (currentHolderId && currentHolderId !== targetHero.heroId) {
          const holderInTeam = currentHeroIds.has(currentHolderId);
          const targetInTeam = currentHeroIds.has(targetHero.heroId);

          if (!holderInTeam && !targetInTeam) {
            const emptySlot = currentHeroes.length < 5 ? currentHeroes.length : 0;
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "hero_gointobattle",
                {
                  heroId: currentHolderId,
                  slot: emptySlot,
                },
              );
            } catch (err) {
              continue;
            }
            await delay(COMMAND_DELAY);

            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "hero_gointobattle",
                {
                  heroId: targetHero.heroId,
                  slot: emptySlot + 1,
                },
              );
            } catch (err) {}
            await delay(COMMAND_DELAY);
          }

          try {
            await tokenStore.sendMessageWithPromise(tokenId, "hero_exchange", {
              heroId: currentHolderId,
              targetHeroId: targetHero.heroId,
            });
          } catch (err) {}
          await delay(COMMAND_DELAY);
        }
      }

      await delay(COMMAND_DELAY);
      const data1 = await fetchLatestData();
      await delay(COMMAND_DELAY);
      heroes = data1.heroes;
      for (const [id, hero] of Object.entries(heroes)) {
        if (hero.attachmentUid && hero.attachmentUid !== -1) {
          attachmentToHero[hero.attachmentUid] = Number(id);
        }
      }
      currentHeroes = getTeamHeroes(data1.teamInfo);
      currentHeroIds.clear();
      currentHeroes.forEach((h) => currentHeroIds.add(h.heroId));

      for (const hero of [...currentHeroes]) {
        if (!targetHeroIds.has(hero.heroId)) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "hero_gobackbattle",
              {
                slot: hero.position,
              },
            );
          } catch (err) {}
          await delay(COMMAND_DELAY);
        }
      }

      await delay(COMMAND_DELAY);
      const data2 = await fetchLatestData();
      await delay(COMMAND_DELAY);
      currentHeroes = getTeamHeroes(data2.teamInfo);

      for (const targetHero of targetHeroes) {
        const currentHero = currentHeroes.find(
          (h) => h.heroId === targetHero.heroId,
        );
        if (!currentHero) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "hero_gointobattle",
              {
                heroId: targetHero.heroId,
                slot: targetHero.position,
              },
            );
          } catch (err) {}
          await delay(COMMAND_DELAY);
        } else if (currentHero.position !== targetHero.position) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "hero_gobackbattle",
              {
                slot: currentHero.position,
              },
            );
            await delay(COMMAND_DELAY);
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "hero_gointobattle",
                {
                  heroId: targetHero.heroId,
                  slot: targetHero.position,
                },
              );
            } catch (err) {}
            await delay(COMMAND_DELAY);
          } catch (err) {}
          await delay(COMMAND_DELAY);
        }
      }

      const hasLevelData = lineup.heroes.some((h) => h.level && h.level > 0);
      if (hasLevelData) {
        const levelData = await fetchLatestData();
        const currentHeroesData = levelData.heroes;

        let levelApplied = 0;
        for (const targetHero of targetHeroes) {
          if (!targetHero.level || targetHero.level <= 0)
            continue;

          const heroData = currentHeroesData[String(targetHero.heroId)];
          const currentLevel = heroData?.level || 1;
          const currentOrder = heroData?.order || 0;

          if (currentLevel !== targetHero.level) {
            const result = await applyHeroLevel(
              tokenId,
              targetHero.heroId,
              targetHero.level,
              currentLevel,
              currentOrder,
              targetHero.position,
            );

            if (result.success)
              levelApplied++;
          }
        }

        if (levelApplied > 0) {
          message.success(`已应用 ${levelApplied} 个武将等级配置`);
        }
      }

      if (errors.length > 0) {
        message.warning(`阵容已应用，但有部分错误:\n${errors.join("\n")}`);
      } else {
        message.success(`阵容 "${lineup.name}" 已应用`);
      }

      const hasFishData = lineup.heroes.some((h) => h.pearlId || h.fishId);
      if (hasFishData) {
        const fishData = await fetchLatestData();
        const currentHeroes = fishData.heroes;
        const pearlMap = fishData.pearlMap || {};
        const artifactBooks = fishData.artifactBooks || {};

        const artifactToHero = {};
        for (const [heroId, hero] of Object.entries(currentHeroes)) {
          if (hero.artifactId && hero.artifactId !== -1) {
            artifactToHero[hero.artifactId] = Number(heroId);
          }
        }

        const fishToArtifact = {};
        for (const [fishId, book] of Object.entries(artifactBooks)) {
          if (book.artifactId && book.artifactId !== -1) {
            fishToArtifact[Number(fishId)] = book.artifactId;
          }
        }

        let fishApplied = 0;
        for (const targetHero of targetHeroes) {
          if (!targetHero.fishId && !targetHero.pearlId)
            continue;

          let artifactId = null;
          const pearlId = targetHero.pearlId || 0;

          if (targetHero.fishId) {
            artifactId = fishToArtifact[targetHero.fishId];
          }

          if (!artifactId && targetHero.pearlId) {
            const pearlData = pearlMap[targetHero.pearlId];
            if (pearlData?.artifactId && pearlData.artifactId !== -1) {
              artifactId = pearlData.artifactId;
            }
          }

          if (!artifactId)
            continue;

          const currentHolderId = artifactToHero[artifactId];

          if (currentHolderId === targetHero.heroId) {
            continue;
          }

          if (currentHolderId) {
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "artifact_unload",
                {
                  heroId: currentHolderId,
                },
              );
            } catch (err) {}
            await delay(COMMAND_DELAY);
          }

          try {
            await tokenStore.sendMessageWithPromise(tokenId, "artifact_load", {
              heroId: targetHero.heroId,
              itemId: artifactId,
              pearlId,
            });
            fishApplied++;
          } catch (err) {}
          await delay(COMMAND_DELAY);
        }

        if (fishApplied > 0) {
          message.success(`已应用 ${fishApplied} 个鱼灵配置`);
        }

        let skillApplied = 0;
        const skillData = await fetchLatestData();
        const latestPearlMap = skillData.pearlMap || {};

        const processedPearlIds = new Set();
        const pearlIdsToHandle = targetHeroes
          .filter((h) => h.pearlId)
          .map((h) => h.pearlId);

        for (const pearlId of pearlIdsToHandle) {
          if (processedPearlIds.has(pearlId))
            continue;

          const targetHero = targetHeroes.find((h) => h.pearlId === pearlId);
          const currentPearlData = latestPearlMap[pearlId];
          const currentSkillId = currentPearlData?.skillId || null;
          const targetSkillId = targetHero?.skillId || null;

          if (!targetSkillId) {
            if (currentSkillId) {
              try {
                await tokenStore.sendMessageWithPromise(
                  tokenId,
                  "pearl_unloadskill",
                  {
                    pearlId,
                  },
                );
                skillApplied++;
                processedPearlIds.add(pearlId);
              } catch (err) {}
              await delay(COMMAND_DELAY);
            }
            continue;
          }

          if (currentSkillId === targetSkillId) {
            continue;
          }

          const holderPearlId = Object.keys(latestPearlMap).find((pid) => {
            if (Number(pid) === pearlId)
              return false;
            const data = latestPearlMap[pid];
            return data?.skillId === targetSkillId;
          });

          if (holderPearlId && !processedPearlIds.has(Number(holderPearlId))) {
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "pearl_exchangeskill",
                {
                  pearlId1: pearlId,
                  pearlId2: Number(holderPearlId),
                },
              );
              skillApplied += 2;
              processedPearlIds.add(pearlId);
              processedPearlIds.add(Number(holderPearlId));
            } catch (err) {}
            await delay(COMMAND_DELAY);
          } else {
            try {
              await tokenStore.sendMessageWithPromise(
                tokenId,
                "pearl_replaceskill",
                {
                  pearlId,
                  skillId: targetSkillId,
                },
              );
              skillApplied++;
              processedPearlIds.add(pearlId);
            } catch (err) {}
            await delay(COMMAND_DELAY);
          }
        }

        if (skillApplied > 0) {
          message.success(`已切换 ${skillApplied} 个鱼珠技能`);
        }
      }

      if (
        lineup.legionResearch
        && Object.keys(lineup.legionResearch).length > 0
      ) {
        const syncResult = await syncLegionResearch(
          tokenId,
          lineup.legionResearch,
        );
        if (
          syncResult.success
          && syncResult.message !== "科技配置已匹配，无需调整"
        ) {
          message.success(syncResult.message);
        }
      }

      if (lineup.weaponId !== undefined && lineup.weaponId !== null) {
        const currentPresetTeam = await tokenStore.sendMessageWithPromise(
          tokenId,
          "presetteam_getinfo",
          {},
        );
        const currentPresetInfo
          = currentPresetTeam?.presetTeamInfo?.presetTeamInfo
            || currentPresetTeam?.presetTeamInfo
            || {};
        const currentTeamData
          = currentPresetInfo[currentTeamId.value]
            || currentPresetInfo[String(currentTeamId.value)];
        const currentWeaponId = currentTeamData?.weapon?.weaponId || null;

        if (currentWeaponId !== lineup.weaponId) {
          try {
            await tokenStore.sendMessageWithPromise(
              tokenId,
              "lordweapon_changedefaultweapon",
              {
                weaponId: lineup.weaponId,
              },
            );
            message.success(
              `玩具已切换为: ${weapon[lineup.weaponId] || lineup.weaponId}`,
            );
          } catch (err) {}
          await delay(COMMAND_DELAY);
        }
      }

      await forceRefreshTeamInfo();
    } catch (error) {
      message.error(`应用阵容失败: ${error.message}`);
    } finally {
      lineup.applying = false;
      state.value.isRunning = false;
    }
  };

  return {
    applyLineup,
  };
};
