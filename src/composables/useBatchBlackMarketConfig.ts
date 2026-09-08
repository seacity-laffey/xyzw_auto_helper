import { ref } from "vue";
import type { BatchTokenStore } from "../utils/batch/types";
import type { BlackMarketPurchaseConfig } from "../utils/blackMarketPurchase";
import { normalizeBlackMarketPurchaseConfig } from "../utils/blackMarketPurchase";

interface UseBatchBlackMarketConfigOptions {
  ensureConnection: (tokenId: string) => Promise<boolean>;
  releaseConnectionSlot: () => void;
  tokenStore: BatchTokenStore;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const useBatchBlackMarketConfig = ({
  ensureConnection,
  releaseConnectionSlot,
  tokenStore,
}: UseBatchBlackMarketConfigOptions) => {
  const blackMarketConfig = ref<BlackMarketPurchaseConfig | null>(null);
  const blackMarketError = ref("");
  const blackMarketLoading = ref(false);
  const blackMarketSaving = ref(false);
  let requestVersion = 0;
  let loadedConfig = "";

  const withConnection = async <T>(tokenId: string, operation: () => Promise<T>) => {
    const shouldOwnConnection = tokenStore.getWebSocketStatus(tokenId) !== "connected";
    let connectionAcquired = false;
    try {
      if (shouldOwnConnection) {
        await ensureConnection(tokenId);
        connectionAcquired = true;
      }
      return await operation();
    } finally {
      if (connectionAcquired) {
        tokenStore.closeWebSocketConnection(tokenId);
        releaseConnectionSlot();
      }
    }
  };

  const resetBlackMarketConfig = () => {
    requestVersion++;
    blackMarketConfig.value = null;
    loadedConfig = "";
    blackMarketError.value = "";
    blackMarketLoading.value = false;
  };

  const loadBlackMarketConfig = async (tokenId: string) => {
    const version = ++requestVersion;
    blackMarketLoading.value = true;
    blackMarketError.value = "";
    try {
      const response = await withConnection(tokenId, () =>
        tokenStore.sendMessageWithPromise(tokenId, "store_getpurchase", {}, 5000));
      if (version === requestVersion) {
        blackMarketConfig.value = normalizeBlackMarketPurchaseConfig(response);
        loadedConfig = JSON.stringify(blackMarketConfig.value);
      }
    } catch (error) {
      if (version === requestVersion)
        blackMarketError.value = `读取失败：${getErrorMessage(error)}`;
    } finally {
      if (version === requestVersion)
        blackMarketLoading.value = false;
    }
  };

  const saveBlackMarketConfig = async (tokenId: string) => {
    if (!blackMarketConfig.value)
      return null;
    if (JSON.stringify(blackMarketConfig.value) === loadedConfig)
      return blackMarketConfig.value;

    blackMarketSaving.value = true;
    try {
      const payload = normalizeBlackMarketPurchaseConfig(blackMarketConfig.value);
      const response = await withConnection(tokenId, () =>
        tokenStore.sendMessageWithPromise(tokenId, "store_setpurchase", payload, 5000));
      blackMarketConfig.value = normalizeBlackMarketPurchaseConfig(response);
      loadedConfig = JSON.stringify(blackMarketConfig.value);
      return blackMarketConfig.value;
    } finally {
      blackMarketSaving.value = false;
    }
  };

  return {
    blackMarketConfig,
    blackMarketError,
    blackMarketLoading,
    blackMarketSaving,
    loadBlackMarketConfig,
    resetBlackMarketConfig,
    saveBlackMarketConfig,
  };
};
