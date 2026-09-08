import type { Ref } from "vue";
import { ref } from "vue";
import type {
  BatchLogEntry,
  BatchMessageApi,
  BatchToken,
  BatchTokenStore,
} from "@/utils/batch/types";

interface RecipientInfo {
  roleId?: number;
  name?: string;
  avatarUrl: string;
  power: string;
  powerUnit: string;
  serverName: string;
  legionName: string;
  legionId: number;
}

interface RecipientLookupOptions {
  selectedTokens: Ref<string[]>;
  tokens: Ref<BatchToken[]>;
  tokenStore: BatchTokenStore;
  ensureConnection: (tokenId: string) => Promise<boolean>;
  releaseConnectionSlot: () => void;
  addLog: (entry: BatchLogEntry) => void;
  message: BatchMessageApi;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const useBatchRecipientLookup = ({
  selectedTokens,
  tokens,
  tokenStore,
  ensureConnection,
  releaseConnectionSlot,
  addLog,
  message,
}: RecipientLookupOptions) => {
  const recipientIdInput = ref("");
  const recipientIdError = ref("");
  const recipientInfo = ref<RecipientInfo | null>(null);
  const isQueryingRecipient = ref(false);

  const clearRecipientError = () => {
    recipientIdError.value = "";
  };

  const queryRecipientInfo = async () => {
    if (!recipientIdInput.value) {
      recipientIdError.value = "请输入接收者ID";
      return;
    }

    const recipientId = Number(recipientIdInput.value);
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      recipientIdError.value = "请输入有效的数字ID";
      return;
    }

    if (selectedTokens.value.length === 0) {
      recipientIdError.value = "请先选择要操作的角色";
      return;
    }

    const firstTokenId = selectedTokens.value[0];
    const token = tokens.value.find((item) => item.id === firstTokenId);
    if (!token) {
      recipientIdError.value = "所选账号不存在，请重新选择";
      return;
    }

    isQueryingRecipient.value = true;
    recipientIdError.value = "";
    recipientInfo.value = null;

    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 开始查询接收者信息: 使用账号 ${token.name} (ID: ${firstTokenId}) ===`,
      type: "info",
    });

    // ensureConnection keeps a slot occupied when it opens a new socket.
    // The lookup owns that short-lived connection and must release it.
    const openedConnection
      = tokenStore.getWebSocketStatus(firstTokenId) !== "connected";
    let connectionReady = false;

    try {
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "正在建立WebSocket连接...",
        type: "info",
      });

      await ensureConnection(firstTokenId);
      connectionReady = true;

      addLog({
        time: new Date().toLocaleTimeString(),
        message: "WebSocket连接成功",
        type: "success",
      });

      addLog({
        time: new Date().toLocaleTimeString(),
        message: `正在发送查询命令，接收者ID: ${recipientId}`,
        type: "info",
      });

      const response = await tokenStore.sendMessageWithPromise(
        firstTokenId,
        "rank_getroleinfo",
        {
          bottleType: 0,
          includeBottleTeam: false,
          isSearch: false,
          roleId: recipientId,
        },
        10000,
      );

      addLog({
        time: new Date().toLocaleTimeString(),
        message: "查询命令发送成功，正在处理响应...",
        type: "info",
      });

      const roleData = response?.role || response?.roleInfo;
      if (!roleData) {
        const errorMsg = "未找到该角色信息";
        recipientIdError.value = errorMsg;
        addLog({
          time: new Date().toLocaleTimeString(),
          message: `=== 查询失败: ${errorMsg} ===`,
          type: "error",
        });
        message.error(errorMsg);
        return;
      }

      const power = roleData.power || roleData.role?.power || 0;
      recipientInfo.value = {
        roleId: roleData.roleId || roleData.role?.roleId,
        name: roleData.name || roleData.role?.name,
        avatarUrl:
          response?.roleInfo?.headImg
          || roleData?.headImg
          || roleData?.role?.headImg
          || "",
        power: (power / 100000000).toFixed(2),
        powerUnit: "亿",
        serverName: roleData.serverName || roleData.role?.serverName || "",
        legionName: response?.legionInfo?.name || "",
        legionId: response?.legionInfo?.id || 0,
      };

      const displayName = recipientInfo.value.name || "未知角色";
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== 查询成功: 找到角色 ${displayName} (ID: ${recipientInfo.value.roleId})，战力: ${recipientInfo.value.power}${recipientInfo.value.powerUnit} ===`,
        type: "success",
      });
      message.success("查询成功");
    } catch (error) {
      const reason = getErrorMessage(error);
      console.error("查询接收者信息失败:", error);

      let errorMsg = "查询失败";
      let logType: BatchLogEntry["type"] = "error";
      if (reason.includes("连接失败")) {
        errorMsg = "WebSocket连接失败，请检查网络或账号状态";
      } else if (reason.includes("timeout") || reason.includes("超时")) {
        errorMsg = "查询超时，请稍后重试";
        logType = "warning";
      } else if (reason.includes("200160")) {
        errorMsg = "功法系统未开启";
      } else {
        errorMsg = `查询失败: ${reason}`;
      }

      recipientIdError.value = errorMsg;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: `=== ${errorMsg} ===`,
        type: logType,
      });
      message.error(errorMsg);
    } finally {
      if (openedConnection && connectionReady) {
        tokenStore.closeWebSocketConnection(firstTokenId);
        releaseConnectionSlot();
      }

      isQueryingRecipient.value = false;
      addLog({
        time: new Date().toLocaleTimeString(),
        message: "=== 查询操作完成 ===",
        type: "info",
      });
    }
  };

  return {
    clearRecipientError,
    isQueryingRecipient,
    queryRecipientInfo,
    recipientIdError,
    recipientIdInput,
    recipientInfo,
  };
};
