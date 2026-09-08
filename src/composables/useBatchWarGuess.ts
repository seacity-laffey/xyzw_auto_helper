import type { Ref } from "vue";
import { ref } from "vue";
import type {
  BatchLogEntry,
  BatchMessageApi,
  BatchToken,
  BatchTokenStore,
} from "@/utils/batch/types";

interface WarGuessOptions {
  addLog: (entry: BatchLogEntry) => void;
  cheer: (legionId: number | string, coin: number) => Promise<unknown>;
  message: BatchMessageApi;
  selectedTokens: Ref<string[]>;
  tokenStore: BatchTokenStore;
  tokens: Ref<BatchToken[]>;
}

export const useBatchWarGuess = ({
  addLog,
  cheer,
  message,
  selectedTokens,
  tokenStore,
  tokens,
}: WarGuessOptions) => {
  const showWarGuessModal = ref(false);
  const warGuessList = ref<any[]>([]);
  const warGuessLoading = ref(false);
  const warGuessCoin = ref(20);
  const selectedWarGuessLegionId = ref<number | string | null>(null);

  const fetchWarGuessRank = async () => {
    if (selectedTokens.value.length === 0) {
      message.warning?.("请先选择一个账号用于获取月赛助威数据");
      return;
    }

    const tokenId = selectedTokens.value[0];
    const token = tokens.value.find((item) => item.id === tokenId);
    if (!token) {
      message.error?.("所选账号不存在，请重新选择");
      return;
    }

    warGuessLoading.value = true;
    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在使用 ${token.name} 获取月赛助威数据...`,
        type: "info",
      });

      if (tokenStore.getWebSocketStatus(tokenId) !== "connected") {
        tokenStore.createWebSocketConnection(tokenId, token.token, token.wsUrl);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const response = await tokenStore.sendMessageWithPromise(
        tokenId,
        "warguess_getrank",
        { bfId: "" },
        5000,
      );
      if (!response?.list) {
        message.warning?.("获取月赛助威数据为空");
        return;
      }

      const list = Array.isArray(response.list)
        ? response.list
        : Object.values(response.list);
      warGuessList.value = list
        .sort((left: any, right: any) => (right.totalNum || 0) - (left.totalNum || 0))
        .slice(0, 20);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error("Fetch rank error:", error);
      message.error?.(`获取月赛助威数据失败: ${reason}`);
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `获取月赛助威数据失败: ${reason}`,
        type: "error",
      });
    } finally {
      warGuessLoading.value = false;
    }
  };

  const openWarGuessModal = () => {
    showWarGuessModal.value = true;
    selectedWarGuessLegionId.value = null;
    warGuessList.value = [];
    if (selectedTokens.value.length > 0)
      void fetchWarGuessRank();
  };

  const handleWarGuessCheer = async () => {
    if (!selectedWarGuessLegionId.value) {
      message.warning?.("请先选择一个俱乐部");
      return;
    }
    showWarGuessModal.value = false;
    await cheer(selectedWarGuessLegionId.value, warGuessCoin.value);
  };

  return {
    fetchWarGuessRank,
    handleWarGuessCheer,
    openWarGuessModal,
    selectedWarGuessLegionId,
    showWarGuessModal,
    warGuessCoin,
    warGuessList,
    warGuessLoading,
  };
};
