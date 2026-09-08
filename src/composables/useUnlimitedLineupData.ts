import { onMounted, ref, watch } from "vue";
import type { Ref } from "vue";

const REFRESH_DEBOUNCE = 3000;
const COMMAND_DELAY = 500;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

interface UnlimitedLineupDataOptions {
  tokenStore: any;
  message: any;
  editingTeamHeroes: Ref<Record<number, any>>;
  state: Ref<{ isRunning: boolean }>;
  loadSavedLineups: () => void;
}

export const useUnlimitedLineupData = ({
  tokenStore,
  message,
  editingTeamHeroes,
  state,
  loadSavedLineups,
}: UnlimitedLineupDataOptions) => {
  const loading = ref(false);
  const switchingTeamId = ref<number | null>(null);
  const currentTeamId = ref(1);
  const availableTeams = ref([1, 2, 3, 4, 5, 6]);
  const currentTeamInfo = ref<any>(null);
  const presetTeamData = ref<any>(null);
  const allHeroesData = ref<Record<string, any>>({});
  const roleHeroesData = ref<Record<string, any>>({});
  const artifactBooks = ref<Record<string, any>>({});
  const pearlMap = ref<Record<string, any>>({});
  let lastRefreshTime = 0;

  const refreshTeamInfo = async () => {
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_DEBOUNCE)
      return;
    lastRefreshTime = now;

    const token = tokenStore.selectedToken;
    if (!token) {
      message.warning("请先选择Token");
      return;
    }

    const tokenId = token.id;
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      message.error("WebSocket未连接，无法获取数据");
      return;
    }

    loading.value = true;
    try {
      let presetTeamResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "presetteam_getinfo",
        {},
      );

      const teamsFromGame
        = presetTeamResult?.presetTeamInfo?.presetTeamInfo || {};
      const gameTeamIds = Object.keys(teamsFromGame)
        .filter((key) => /^\d+$/.test(key))
        .map(Number)
        .sort((first, second) => first - second);
      const availableTeamIds = gameTeamIds.length
        ? gameTeamIds
        : [1, 2, 3, 4, 5, 6];

      let targetTeamId = presetTeamResult?.presetTeamInfo?.useTeamId || 1;
      if (!availableTeamIds.includes(targetTeamId))
        targetTeamId = availableTeamIds[0];

      const currentIndex = availableTeamIds.indexOf(targetTeamId);
      const otherTeamId
        = availableTeamIds[currentIndex === 0 ? 1 : currentIndex - 1]
          || availableTeamIds[0];

      if (otherTeamId !== targetTeamId && availableTeamIds.length > 1) {
        await tokenStore.sendMessageWithPromise(
          tokenId,
          "presetteam_saveteam",
          { teamId: otherTeamId },
        );
        await delay(COMMAND_DELAY);

        await tokenStore.sendMessageWithPromise(
          tokenId,
          "presetteam_saveteam",
          { teamId: targetTeamId },
        );
        await delay(COMMAND_DELAY);
      }

      presetTeamResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "presetteam_getinfo",
        {},
      );
      await delay(COMMAND_DELAY);

      const roleInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        {},
      );
      await delay(COMMAND_DELAY);
      const role = roleInfo?.role || roleInfo;
      roleHeroesData.value = role?.heroes || {};
      allHeroesData.value = role?.heroes || {};
      artifactBooks.value = role?.artifactBooks || {};
      pearlMap.value = role?.pearlMap || {};

      presetTeamData.value = presetTeamResult?.presetTeamInfo;

      if (presetTeamResult) {
        tokenStore.$patch((storeState: any) => {
          storeState.gameData = {
            ...(storeState.gameData ?? {}),
            presetTeam: presetTeamResult,
          };
        });
      }

      if (presetTeamData.value) {
        const updatedTeamsFromGame
          = presetTeamData.value.presetTeamInfo || {};
        currentTeamId.value = presetTeamData.value.useTeamId || 1;
        availableTeams.value = availableTeamIds;

        const currentTeam
          = updatedTeamsFromGame[currentTeamId.value]
            || updatedTeamsFromGame[String(currentTeamId.value)];
        currentTeamInfo.value = currentTeam?.teamInfo || {};
        editingTeamHeroes.value = {};
      }

      message.success("数据已刷新");
    } catch (error) {
      const errorMessage
        = error instanceof Error ? error.message : String(error);
      message.error(`获取数据失败: ${errorMessage}`);
    } finally {
      loading.value = false;
    }
  };

  const forceRefreshTeamInfo = async () => {
    lastRefreshTime = 0;
    await refreshTeamInfo();
  };

  const switchTeam = async (teamId: number) => {
    if (teamId === currentTeamId.value)
      return;

    const token = tokenStore.selectedToken;
    if (!token) {
      message.warning("请先选择Token");
      return;
    }

    const tokenId = token.id;
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      message.error("WebSocket未连接，无法切换阵容");
      return;
    }

    switchingTeamId.value = teamId;
    state.value.isRunning = true;

    try {
      await tokenStore.sendMessageWithPromise(tokenId, "presetteam_saveteam", {
        teamId,
      });
      await delay(COMMAND_DELAY);

      currentTeamId.value = teamId;
      message.success(`已切换到阵容 ${teamId}`);
      await refreshTeamInfo();
    } catch (error) {
      const errorMessage
        = error instanceof Error ? error.message : String(error);
      message.error(`切换阵容失败: ${errorMessage}`);
    } finally {
      switchingTeamId.value = null;
      state.value.isRunning = false;
    }
  };

  watch(
    () => tokenStore.selectedToken,
    (newToken, oldToken) => {
      if (newToken && newToken.id !== oldToken?.id) {
        loadSavedLineups();
        currentTeamInfo.value = null;
        presetTeamData.value = null;
        allHeroesData.value = {};
        currentTeamId.value = 1;

        const status = tokenStore.getWebSocketStatus(newToken.id);
        if (status === "connected")
          void refreshTeamInfo();
      }
    },
  );

  watch(
    () =>
      tokenStore.selectedToken
        ? tokenStore.getWebSocketStatus(tokenStore.selectedToken.id)
        : null,
    (newStatus, oldStatus) => {
      if (
        newStatus === "connected"
        && oldStatus !== "connected"
        && tokenStore.selectedToken
      ) {
        setTimeout(() => {
          void refreshTeamInfo();
        }, COMMAND_DELAY);
      }
    },
  );

  onMounted(() => {
    loadSavedLineups();

    const token = tokenStore.selectedToken;
    if (token && tokenStore.getWebSocketStatus(token.id) === "connected")
      void refreshTeamInfo();
  });

  return {
    allHeroesData,
    artifactBooks,
    availableTeams,
    currentTeamId,
    currentTeamInfo,
    forceRefreshTeamInfo,
    loading,
    pearlMap,
    presetTeamData,
    refreshTeamInfo,
    roleHeroesData,
    switchingTeamId,
    switchTeam,
  };
};
