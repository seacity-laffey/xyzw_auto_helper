import type { Ref } from "vue";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAppMessage } from "@/composables/useAppMessage";
import useIndexedDB from "@/hooks/useIndexedDB";
import { buildEmbeddedGameLocation } from "@/utils/embeddedGameRoute.js";
import { resolveEmbeddedGameBinData } from "@/utils/embeddedGameStorage.js";
import { prepareEmbeddedGameSession } from "@/utils/gameLauncher";
import { getTokenId } from "@/utils/token";

interface GameToken {
  id: string;
  name?: string;
}

export const useBatchGameLauncher = (
  tokens: Ref<GameToken[]>,
  selectedTokenIds: Ref<string[]>,
) => {
  const router = useRouter();
  const message = useAppMessage();
  const { getArrayBuffer } = useIndexedDB();
  const isOpeningGames = ref(false);

  const openSelectedGames = async () => {
    if (!selectedTokenIds.value.length || isOpeningGames.value)
      return;

    isOpeningGames.value = true;
    const readyIds: string[] = [];
    const skippedNames: string[] = [];

    try {
      for (const tokenId of selectedTokenIds.value) {
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

      if (!readyIds.length) {
        message.error("所选账号均未找到本机 BIN 数据，请先重新导入 BIN");
        return;
      }

      if (skippedNames.length) {
        const names = skippedNames.slice(0, 3).join("、");
        const remaining
          = skippedNames.length > 3 ? ` 等 ${skippedNames.length} 个账号` : "";
        message.warning(`已跳过缺少 BIN 数据的账号：${names}${remaining}`);
      }

      await router.push(buildEmbeddedGameLocation(readyIds, "batch"));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      message.error(`打开游戏失败：${reason}`);
    } finally {
      isOpeningGames.value = false;
    }
  };

  return { isOpeningGames, openSelectedGames };
};
