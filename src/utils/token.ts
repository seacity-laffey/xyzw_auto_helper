import axios from "axios";
import { MD5, lib, enc } from "crypto-js";
import { g_utils } from "@/utils/bonProtocol";

type TokenBinary = ArrayBuffer | Uint8Array;
type AuthUserData = Record<string, unknown>;
type ServerListData = {
  roles?: Record<string, unknown>;
};

const toWordArrayInput = (token: TokenBinary) => {
  if (token instanceof ArrayBuffer) return new Uint8Array(token);
  return token;
};

export const getTokenId = (token: string | ArrayBuffer | Uint8Array) => {
  const source =
    typeof token === "string"
      ? token
      : lib.WordArray.create(toWordArrayInput(token));
  const binHash = MD5(source).toString(enc.Hex);
  return binHash;
};

type WaitCallback = (waitTimeMs: number, queueSize: number) => void;

class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: number[] = [];
  private queueSize: number = 0;
  private onWaitCallback: WaitCallback | null = null;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  onWait(callback: WaitCallback): void {
    this.onWaitCallback = callback;
  }

  private cleanOldRequests(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    this.requests = this.requests.filter((time) => time > cutoff);
  }

  private async waitForSlot(): Promise<void> {
    this.cleanOldRequests();

    if (this.requests.length < this.maxRequests) {
      this.requests.push(Date.now());
      return;
    }

    const oldestRequest = this.requests[0];
    if (oldestRequest === undefined) return;
    const waitTime = oldestRequest + this.windowMs - Date.now();

    if (waitTime > 0) {
      // 每秒更新一次剩余时间
      const updateInterval = 1000;
      const totalWaitTime = waitTime + 100;
      const startTime = Date.now();

      const updateCallback = () => {
        if (this.onWaitCallback) {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, totalWaitTime - elapsed);
          this.onWaitCallback(remaining, this.queueSize);
        }
      };

      // 初始通知
      updateCallback();

      // 设置定时更新
      const intervalId = setInterval(updateCallback, updateInterval);

      try {
        await new Promise((resolve) => setTimeout(resolve, totalWaitTime));
      } finally {
        clearInterval(intervalId);
      }
    }

    return this.waitForSlot();
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    this.queueSize++;
    try {
      await this.waitForSlot();
      return fn();
    } finally {
      this.queueSize--;
    }
  }
}

const authUserRateLimiter = new RateLimiter(25, 60000);

export const setAuthUserRateLimiterCallback = (
  callback: WaitCallback,
): void => {
  authUserRateLimiter.onWait(callback);
};

export const scheduleAuthUserRequest = <T>(
  fn: () => Promise<T>,
): Promise<T> => {
  return authUserRateLimiter.schedule(fn);
};

export const transformToken = async (arrayBuffer: ArrayBuffer) => {
  return authUserRateLimiter.schedule(async () => {
    const res = await axios.post(
      "https://xxz-xyzw.hortorgames.com/login/authuser",
      arrayBuffer,
      {
        params: {
          _seq: 1,
        },
        headers: {
          "Content-Type": "application/octet-stream",
          referrerPolicy: "no-referrer",
        },
        responseType: "arraybuffer",
      },
    );
    const msg = g_utils.parse(res.data);
    const data = msg.getData<AuthUserData>();
    const currentTime = Date.now();
    const sessId = currentTime * 100 + Math.floor(Math.random() * 100);
    const connId = currentTime + Math.floor(Math.random() * 10);

    return JSON.stringify({
      ...data,
      sessId,
      connId,
      isRestore: 0,
    });
  });
};

export const getServerList = async (arrayBuffer: ArrayBuffer) => {
  // 如果是data URL格式，提取base64部分
  const res = await axios.post(
    "https://xxz-xyzw.hortorgames.com/login/serverlist",
    arrayBuffer,
    {
      params: {
        _seq: 3,
      },
      headers: {
        "Content-Type": "application/octet-stream",
        referrerPolicy: "no-referrer",
      },
      responseType: "arraybuffer",
    },
  );
  // console.log("res:", res);

  const msg = g_utils.parse(res.data);
  // console.log("解析结果:", msg);

  const data = msg.getData<ServerListData>();
  console.log("数据内容:", data);
  return JSON.stringify({
    ...(data.roles || {}),
  });
};
