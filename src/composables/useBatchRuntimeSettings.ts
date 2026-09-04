import { reactive } from "vue";
import { goldItemsConfig } from "@/utils/dreamConstants";

export interface BatchRuntimeSettings {
  actionDelay: number;
  battleDelay: number;
  boxCount: number;
  commandDelay: number;
  connectionTimeout: number;
  defaultBoxType: number;
  defaultFishType: number;
  dreamPurchaseList: string[];
  enableRefresh: boolean;
  fishCount: number;
  longDelay: number;
  maxActive: number;
  maxLogEntries: number;
  password: string;
  receiverId: number | string;
  reconnectDelay: number;
  recruitCount: number;
  refreshDelay: number;
  refreshInterval: number;
  targetBoxPoints: number;
  taskDelay: number;
  tokenListColumns: number;
}

const defaultDreamPurchaseList = () =>
  Object.entries(goldItemsConfig).flatMap(([merchantId, indexes]) =>
    indexes.map((itemIndex) => `${merchantId}-${itemIndex}`),
  );

const createDefaults = (): BatchRuntimeSettings => ({
  actionDelay: 300,
  battleDelay: 500,
  boxCount: 100,
  commandDelay: 500,
  connectionTimeout: 10000,
  defaultBoxType: 2001,
  defaultFishType: 1,
  dreamPurchaseList: defaultDreamPurchaseList(),
  enableRefresh: false,
  fishCount: 100,
  longDelay: 3000,
  maxActive: 2,
  maxLogEntries: 1000,
  password: "",
  receiverId: "",
  reconnectDelay: 1000,
  recruitCount: 100,
  refreshDelay: 1000,
  refreshInterval: 360,
  targetBoxPoints: 1000,
  taskDelay: 500,
  tokenListColumns: 2,
});

export const useBatchRuntimeSettings = () => {
  const batchSettings = reactive<BatchRuntimeSettings>(createDefaults());

  const loadBatchSettings = () => {
    try {
      const saved = localStorage.getItem("batchSettings");
      if (saved)
        Object.assign(batchSettings, JSON.parse(saved));
      return true;
    } catch (error) {
      console.error("Failed to load batch settings:", error);
      return false;
    }
  };

  const persistBatchSettings = () => {
    try {
      localStorage.setItem("batchSettings", JSON.stringify(batchSettings));
      return true;
    } catch (error) {
      console.error("Failed to save batch settings:", error);
      return false;
    }
  };

  loadBatchSettings();

  return {
    batchSettings,
    loadBatchSettings,
    persistBatchSettings,
  };
};
