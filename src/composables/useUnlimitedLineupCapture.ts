import type { ComputedRef, Ref } from "vue";

const COMMAND_DELAY = 500;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

interface UnlimitedLineupCaptureOptions {
  tokenStore: any;
  message: any;
  currentTeamId: Ref<number>;
  editingHeroes: ComputedRef<any[]>;
  loading: Ref<boolean>;
  savedLineups: Ref<any[]>;
  generateLineupId: () => string;
  saveLineupsToStorage: () => void;
}

export const useUnlimitedLineupCapture = ({
  tokenStore,
  message,
  currentTeamId,
  editingHeroes,
  loading,
  savedLineups,
  generateLineupId,
  saveLineupsToStorage,
}: UnlimitedLineupCaptureOptions) => {
  const saveCurrentLineup = async () => {
    if (editingHeroes.value.length === 0) {
      message.warning("当前阵容为空，无法保存");
      return;
    }

    const token = tokenStore.selectedToken;
    if (!token) {
      message.warning("请先选择Token");
      return;
    }

    const tokenId = token.id;
    const status = tokenStore.getWebSocketStatus(tokenId);
    if (status !== "connected") {
      message.error("WebSocket未连接，无法保存阵容");
      return;
    }

    loading.value = true;

    try {
      const roleInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "role_getroleinfo",
        {},
      );
      await delay(COMMAND_DELAY);

      const role = roleInfo?.role || roleInfo;
      const legionResearch = role?.legionResearch || {};
      const currentArtifactBooks = role?.artifactBooks || {};
      const currentHeroes = role?.heroes || {};
      const pearlMap = role?.pearlMap || {};

      const presetTeamResult = await tokenStore.sendMessageWithPromise(
        tokenId,
        "presetteam_getinfo",
        {},
      );
      await delay(COMMAND_DELAY);

      const presetInfo
        = presetTeamResult?.presetTeamInfo?.presetTeamInfo
          || presetTeamResult?.presetTeamInfo
          || {};
      const teamData
        = presetInfo[currentTeamId.value]
          || presetInfo[String(currentTeamId.value)];
      const weaponId = teamData?.weapon?.weaponId || null;
      const teamInfo = teamData?.teamInfo || {};

      const lineupName = `阵容${currentTeamId.value} - ${new Date().toLocaleTimeString()}`;

      const fishAssignments = {};
      for (const [fishId, book] of Object.entries(currentArtifactBooks)) {
        if (book.artifactId && book.artifactId !== -1) {
          fishAssignments[book.artifactId] = Number(fishId);
        }
      }

      const heroesData = editingHeroes.value.map((hero) => {
        const heroData = currentHeroes[String(hero.heroId)];
        const artifactId = heroData?.artifactId || hero.artifactId || null;
        const teamHeroInfo = teamInfo[hero.position];
        const fishId = artifactId ? fishAssignments[artifactId] : null;
        const pearlId = teamHeroInfo?.pearlId || null;
        const pearlData = pearlMap[pearlId];
        const slotMap = pearlData?.slotMap || null;
        return {
          position: hero.position,
          heroId: hero.heroId,
          level: teamHeroInfo?.level || null,
          attachmentUid: hero.attachmentUid || null,
          fishId: fishId || null,
          pearlId,
          skillId: pearlData?.skillId || null,
          slotMap,
          power: heroData?.power || null,
          attack: heroData?.attack || null,
          hp: heroData?.hp || null,
          speed: heroData?.speed || null,
        };
      });

      savedLineups.value.unshift({
        id: generateLineupId(),
        name: lineupName,
        heroes: heroesData,
        teamId: currentTeamId.value,
        savedAt: Date.now(),
        applying: false,
        legionResearch,
        weaponId,
      });

      saveLineupsToStorage();
      message.success(`阵容已保存: ${lineupName}`);
    } catch (error) {
      message.error(`保存阵容失败: ${error.message}`);
    } finally {
      loading.value = false;
    }
  };

  return {
    saveCurrentLineup,
  };
};
