/**
 * 智能日志管理系统
 * 支持日志级别控制和开发/生产环境区分
 */

// 日志级别定义
export const LOG_LEVELS = {
  ERROR: 0, // 错误 - 始终显示
  WARN: 1, // 警告 - 生产环境显示
  INFO: 2, // 信息 - 开发环境显示
  DEBUG: 3, // 调试 - 开发环境详细模式
  VERBOSE: 4, // 详细 - 仅在明确启用时显示
} as const;

type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];
type LogArg = unknown;
type ViteImportMeta = ImportMeta & { env?: { DEV?: boolean } };
type TimeFormatOptions = Intl.DateTimeFormatOptions & { millisecond?: boolean };

interface WsDebugTools {
  setLevel: (level: LogLevel) => void;
  enableVerbose: (enabled?: boolean) => void;
  levels: typeof LOG_LEVELS;
  quiet: () => void;
  normal: () => void;
  debug: () => void;
  verbose: () => void;
}

declare global {
  interface Window {
    wsDebug: WsDebugTools;
  }
}

class Logger {
  private namespace: string;
  private isDev: boolean;
  private enableVerbose: boolean;
  private level: LogLevel;

  constructor(namespace = "APP") {
    this.namespace = namespace;
    this.isDev = Boolean((import.meta as ViteImportMeta).env?.DEV);

    // 初始化 enableVerbose
    const savedVerbose = localStorage.getItem("ws_debug_verbose");
    if (savedVerbose !== null) {
      this.enableVerbose = savedVerbose === "true";
    } else {
      // 开发环境默认开启详细日志，生产环境默认关闭
      this.enableVerbose = this.isDev;
    }

    this.level = this.getLogLevel();
  }

  getLogLevel(): LogLevel {
    // 生产环境默认只显示错误和警告
    if (!this.isDev) {
      return LOG_LEVELS.WARN;
    }

    // 开发环境根据localStorage配置决定
    const saved = localStorage.getItem("ws_debug_level");
    if (saved) {
      return parseInt(saved, 10) as LogLevel;
    }

    return LOG_LEVELS.VERBOSE; // 开发环境默认显示详细级别
  }

  setLevel(level: LogLevel) {
    this.level = level;
    localStorage.setItem("ws_debug_level", level.toString());
  }

  setVerbose(enabled: boolean) {
    this.enableVerbose = enabled;
    localStorage.setItem("ws_debug_verbose", enabled.toString());
  }

  formatMessage(level: LogLevel, message: string, ...args: LogArg[]) {
    const timestamp = new Date().toLocaleTimeString("zh-CN", {
      hour12: false,
      millisecond: true,
    } as TimeFormatOptions);
    const levelName = Object.keys(LOG_LEVELS)[level];
    const prefix = `[${timestamp}] [${this.namespace}] [${levelName}]`;

    return [prefix, message, ...args];
  }

  error(message: string, ...args: LogArg[]) {
    if (this.level >= LOG_LEVELS.ERROR) {
      console.error(...this.formatMessage(LOG_LEVELS.ERROR, message, ...args));
    }
  }

  warn(message: string, ...args: LogArg[]) {
    if (this.level >= LOG_LEVELS.WARN) {
      console.warn(...this.formatMessage(LOG_LEVELS.WARN, message, ...args));
    }
  }

  info(message: string, ...args: LogArg[]) {
    if (this.level >= LOG_LEVELS.INFO) {
      console.info(...this.formatMessage(LOG_LEVELS.INFO, message, ...args));
    }
  }

  debug(message: string, ...args: LogArg[]) {
    if (this.level >= LOG_LEVELS.DEBUG) {
      console.log(...this.formatMessage(LOG_LEVELS.DEBUG, message, ...args));
    }
  }

  verbose(message: string, ...args: LogArg[]) {
    if (this.enableVerbose && this.level >= LOG_LEVELS.VERBOSE) {
      console.log(...this.formatMessage(LOG_LEVELS.VERBOSE, message, ...args));
    }
  }

  // WebSocket专用的简化日志方法
  wsConnect(tokenId: string | number) {
    this.info(`🔗 WebSocket连接: ${tokenId}`);
  }

  wsDisconnect(tokenId: string | number, reason = "") {
    this.info(`🔌 WebSocket断开: ${tokenId}${reason ? " - " + reason : ""}`);
  }

  wsError(tokenId: string | number, error: unknown) {
    this.error(`❌ WebSocket错误 [${tokenId}]:`, error);
  }

  wsMessage(tokenId: string | number, cmd: string, isReceived = false) {
    if (cmd === "_sys/ack") return; // 过滤心跳消息
    const direction = isReceived ? "📨" : "📤";
    this.debug(`${direction} [${tokenId}] ${cmd}`);
  }

  wsStatus(tokenId: string | number, status: string, details = "") {
    this.info(`📊 [${tokenId}] ${status}${details ? " - " + details : ""}`);
  }

  // 连接管理专用日志
  connectionLock(tokenId: string | number, operation: string, acquired = true) {
    if (acquired) {
      this.debug(`🔐 获取连接锁: ${tokenId} (${operation})`);
    } else {
      this.debug(`🔓 释放连接锁: ${tokenId} (${operation})`);
    }
  }

  // 游戏消息处理
  gameMessage(tokenId: string | number, cmd: string, hasBody = false) {
    if (cmd === "_sys/ack") return;
    this.debug(`🎮 [${tokenId}] ${cmd}${hasBody ? " ✓" : " ✗"}`);
  }
}

// 创建命名空间的日志实例
export const createLogger = (namespace: string) => new Logger(namespace);

// 预定义的日志实例
export const wsLogger = createLogger("WS");
export const tokenLogger = createLogger("TOKEN");
export const gameLogger = createLogger("GAME");

// 全局日志控制函数
export const setGlobalLogLevel = (level: LogLevel) => {
  wsLogger.setLevel(level);
  tokenLogger.setLevel(level);
  gameLogger.setLevel(level);
};

export const enableVerboseLogging = (enabled = true) => {
  wsLogger.setVerbose(enabled);
  tokenLogger.setVerbose(enabled);
  gameLogger.setVerbose(enabled);
};

// 开发者调试工具
window.wsDebug = {
  setLevel: setGlobalLogLevel,
  enableVerbose: enableVerboseLogging,
  levels: LOG_LEVELS,
  // 快捷设置
  quiet: () => setGlobalLogLevel(LOG_LEVELS.WARN),
  normal: () => setGlobalLogLevel(LOG_LEVELS.INFO),
  debug: () => setGlobalLogLevel(LOG_LEVELS.DEBUG),
  verbose: () => {
    setGlobalLogLevel(LOG_LEVELS.VERBOSE);
    enableVerboseLogging(true);
  },
};

console.info("🔧 WebSocket调试工具已加载，使用 wsDebug.verbose() 启用详细日志");
