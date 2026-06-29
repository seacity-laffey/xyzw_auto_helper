import { useLocalStorage } from "@vueuse/core";
import type { XyzwWebSocketClient } from "@/utils/xyzwWebSocket";

declare interface RoleToken {
  id: string; // 唯一标识符
  name: string; // 角色名称
  token: string; // Base64编码的Token
  wsUrl?: string | null; // 可选的自定义WebSocket URL
  server?: string; // 服务器信息
  level?: number; // 角色等级
  profession?: string; // 角色职业
  lastUsed: string; // 最后使用时间
  isActive: boolean; // 是否激活
  createdAt: string; // 创建时间
  updatedAt?: string; // 更新时间
  // URL获取相关信息
  sourceUrl?: string | null; // Token来源URL（用于刷新）
  importMethod?: "manual" | "url"; // 导入方式：manual 或 url
  [key: string]: unknown; // 允许额外的动态属性
}

interface CommonWebSocketConnection {
  status?: "connecting" | "connected" | "disconnecting" | "disconnected" | "error";
  client?: XyzwWebSocketClient | null;
  tokenId?: string;
  sessionId?: string;
  lastError?: {
    timestamp: string;
    error: string;
  } | null;
  lastMessageAt?: string | null;
}

interface ConnectionLock {
  tokenId?: string;
  operation?: "connect" | "disconnect";
  timestamp?: number;
  sessionId?: string;
}

interface ActiveConnectionState {
  tokenId?: string;
  status?: CommonWebSocketConnection["status"];
  timestamp?: number;
  sessionId?: string;
}

// export const selectedTokenId = useLocalStorage<string>('selectedTokenId', null);
export const gameTokens = useLocalStorage<RoleToken[]>("gameTokens", []);
export const selectedTokenId = useLocalStorage<string | null>("selectedTokenId", null);
export const wsConnections = ref<Record<string, CommonWebSocketConnection>>({}); // WebSocket连接状态
export const connectionLocks = ref(new Map<string, ConnectionLock>()); // 连接操作锁，防止竞态条件
export const activeConnections = ref(new Map<string, ActiveConnectionState>()); // 跨标签页连接协调

export const selectedToken = computed(() =>
  gameTokens.value.find((token) => token.id === selectedTokenId.value),
);

// Token管理
export const addToken = (tokenData: RoleToken) => {
  const newToken = {
    id: "token_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    name: tokenData.name,
    token: tokenData.token, // 保存原始Base64 token
    wsUrl: tokenData.wsUrl || null, // 可选的自定义WebSocket URL
    server: tokenData.server || "",
    level: tokenData.level || 1,
    profession: tokenData.profession || "",
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    isActive: true,
    // URL获取相关信息
    sourceUrl: tokenData.sourceUrl || null, // Token来源URL（用于刷新）
    importMethod: tokenData.importMethod || "manual", // 导入方式：manual 或 url
  };
  gameTokens.value.push(newToken);
  return newToken;
};

export const updateToken = (tokenId: string, updates: Partial<RoleToken>) => {
  const index = gameTokens.value.findIndex((token) => token.id === tokenId);
  if (index !== -1) {
    const existingToken = gameTokens.value[index];
    if (!existingToken) return false;
    gameTokens.value[index] = {
      ...existingToken,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return true;
  }
  return false;
};

export const closeWebSocketConnection = (tokenId: string) => {
  const connection = wsConnections.value[tokenId];
  connection?.client?.disconnect?.();
  delete wsConnections.value[tokenId];
};

export const removeToken = (tokenId: string) => {
  gameTokens.value = gameTokens.value.filter((token) => token.id !== tokenId);

  // 关闭对应的WebSocket连接
  if (wsConnections.value[tokenId]) {
    closeWebSocketConnection(tokenId);
  }

  // 如果删除的是当前选中token，清除选中状态
  if (selectedTokenId.value === tokenId) {
    selectedTokenId.value = null;
  }

  return true;
};
