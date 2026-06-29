import type { Ref } from "vue";

export type GameCommandParams = Record<string, unknown>;

export type BinaryBody =
  | Uint8Array
  | number[]
  | Record<string, number>;

export interface GamePacket {
  cmd?: string;
  ack?: number;
  seq?: number;
  resp?: number;
  time?: number;
  code?: number;
  hint?: string;
  body?: unknown;
  rawData?: unknown;
  decodedBody?: unknown;
  error?: unknown;
  _raw?: GamePacket;
  getData?: <T = GameResponseBody>() => T;
  [key: string]: unknown;
}

export interface RoleStudyInfo {
  id?: number;
  beginTime?: number;
  maxCorrectNum?: number;
  [key: string]: unknown;
}

export interface RoleTowerInfo {
  id?: number;
  reward?: Record<number | string, unknown>;
  [key: string]: unknown;
}

export interface RoleInfo {
  headImg?: string;
  server?: string;
  serverName?: string;
  study?: RoleStudyInfo;
  tower?: RoleTowerInfo;
  battleTeam?: unknown;
  heroes?: unknown;
  custom?: unknown;
  [key: string]: unknown;
}

export interface RoleResponseBody {
  role?: RoleInfo;
  server?: string;
  serverName?: string;
  statistics?: StatisticsSource;
  statisticsTime?: StatisticsSource;
  [key: string]: unknown;
}

export type StatisticsSource =
  | Map<string, unknown>
  | Record<string, unknown>
  | null
  | undefined;

export interface StudyQuestion {
  id: number;
  question: string;
  [key: string]: unknown;
}

export interface StudyResponseBody extends RoleResponseBody {
  questionList?: StudyQuestion[];
}

export interface BattleData {
  options?: {
    towerId?: number;
    [key: string]: unknown;
  };
  result?: {
    sponsor?: {
      ext?: {
        curHP?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TowerResponseBody extends RoleResponseBody {
  battleData?: BattleData;
}

export interface ChatResponseBody {
  chatMessage?: Record<string, unknown>;
  [key: string]: unknown;
}

export type GameResponseBody =
  | RoleResponseBody
  | StudyResponseBody
  | TowerResponseBody
  | ChatResponseBody
  | Record<string, unknown>;

export interface StudyStatus {
  isAnswering?: boolean;
  questionCount?: number;
  answeredCount?: number;
  status?: "" | "starting" | "answering" | "claiming_rewards" | "completed" | string;
  timestamp?: number | null;
  thisWeek?: boolean;
  isCompleted?: boolean;
  maxCorrectNum?: number;
}

export interface TowerResult {
  success?: boolean;
  curHP?: number;
  towerId?: number;
  timestamp?: number;
  autoReward?: boolean;
  rewardFloor?: number;
  [key: string]: unknown;
}

export interface GameData {
  roleInfo: RoleResponseBody | null;
  legionInfo: GameResponseBody | null;
  commonActivityInfo: GameResponseBody | null;
  bossTowerInfo: GameResponseBody | null;
  evoTowerInfo: GameResponseBody | null;
  presetTeam: Record<string, unknown> | null;
  battleVersion: number | null;
  studyStatus: StudyStatus;
  towerResult?: TowerResult;
  lastUpdated: string | null;
}

export type GameDataRef = Ref<GameData>;

export interface SendTask {
  cmd: string;
  params: GameCommandParams;
  seq: number;
  respKey: string;
  sleep: number;
  onSent?: (meta: {
    respKey: string;
    cmd: string;
    seq: number;
    ack: number;
    time: number;
  }) => void;
}
