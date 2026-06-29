import type { Ref } from "vue";
import type { GameCommandParams, GameData, GameResponseBody } from "@/types/gameProtocol";

export type BatchLogType = "info" | "success" | "warning" | "error";

export interface BatchLogEntry {
  time: string;
  message: string;
  type: BatchLogType;
  code?: string | number;
}

export interface BatchToken {
  id: string;
  name: string;
  token: string;
  wsUrl?: string | null;
  [key: string]: unknown;
}

export type TokenStatus =
  | "waiting"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | string;

export interface BatchSettings {
  maxActive: number;
  connectionTimeout: number;
  reconnectDelay: number;
  carMinColor?: number;
  smartDepartureGoldThreshold?: number;
  smartDepartureRecruitThreshold?: number;
  smartDepartureJadeThreshold?: number;
  smartDepartureTicketThreshold?: number;
  smartDepartureMatchAll?: boolean;
  useGoldRefreshFallback?: boolean;
  [key: string]: unknown;
}

export interface BatchConnectionQueue {
  active: number;
}

export interface BatchMessageApi {
  success: (text: string) => void;
  warning?: (text: string) => void;
  error?: (text: string) => void;
  info?: (text: string) => void;
}

export interface BatchTokenStore {
  gameData: GameData;
  getWebSocketStatus: (tokenId: string) => string;
  createWebSocketConnection: (
    tokenId: string,
    token: string,
    wsUrl?: string | null,
  ) => unknown;
  closeWebSocketConnection: (tokenId: string) => unknown;
  sendMessage: (
    tokenId: string,
    cmd: string,
    params?: GameCommandParams,
    options?: GameCommandParams,
  ) => unknown;
  sendMessageWithPromise: (
    tokenId: string,
    cmd: string,
    params?: GameCommandParams,
    timeout?: number,
  ) => Promise<GameResponseBody>;
  sendGetRoleInfo: (
    tokenId: string,
    params?: GameCommandParams,
    retryCount?: number,
  ) => Promise<GameResponseBody>;
  setBattleVersion: (version: number) => void;
}

export interface BatchTaskDeps {
  selectedTokens: Ref<string[]>;
  tokens: Ref<BatchToken[]>;
  tokenStatus: Ref<Record<string, TokenStatus>>;
  isRunning: Ref<boolean>;
  shouldStop: Ref<boolean>;
  currentRunningTokenId: Ref<string | null>;
  ensureConnection: (tokenId: string) => Promise<boolean>;
  releaseConnectionSlot: () => void;
  connectionQueue: BatchConnectionQueue;
  batchSettings: BatchSettings;
  tokenStore: BatchTokenStore;
  addLog: (entry: BatchLogEntry) => void;
  message: BatchMessageApi;
  [key: string]: unknown;
}

export interface ConnectionManagerOptions {
  tokenStore: BatchTokenStore;
  batchSettings: BatchSettings;
  addLog: (entry: BatchLogEntry) => void;
}

export interface ConnectionManager {
  connectionQueue: BatchConnectionQueue;
  waitForConnectionSlot: () => Promise<void>;
  releaseConnectionSlot: () => void;
  waitForConnection: (tokenId: string, timeout?: number) => Promise<boolean>;
  ensureConnection: (
    tokenId: string,
    tokens: BatchToken[],
    maxRetries?: number,
  ) => Promise<boolean>;
  closeConnection: (tokenId: string, tokenName: string) => void;
}
