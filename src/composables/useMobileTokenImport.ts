import { onUnmounted, reactive, ref } from "vue";

import { useMessage } from "naive-ui";
import { getServerList, getTokenId, transformToken } from "@/utils/token";
import { encodeHortorLoginPayload } from "@/utils/hortorMobileLogin";
import useIndexedDB from "@/hooks/useIndexedDB";

import { generateBinFromCombUser } from "@/utils/wechatForceLogout";
import {
  buildRoleBin,
  downloadBinFile,
  getRoleBinFileName,
  loadRoleBinData,
} from "@/utils/binFile";
import { useTokenStore } from "@/stores/tokenStore";

export function useMobileTokenImport(emit: (event: "ok" | "cancel") => void) {
  const message = useMessage();

  const tokenStore = useTokenStore();

  const { storeArrayBuffer } = useIndexedDB();

  const HORTOR_PROXY_PREFIX = "/api/hortor";

  const HORTOR_UCENTER_PROXY_PREFIX = "/api/hortor-ucenter";

  const GAME_ID = "xyzwapp";

  const PACKAGE_NAME = "com.hortor.games.xyzw";

  const SIGN_PRINT
    = "E6:F7:FE:A9:EC:8E:24:D0:4F:2A:32:50:28:78:E1:C5:5E:70:81:13";

  const DEVICE_STORAGE_KEY = "xyzw.mobile-login-device.v1";

  const systemInfo = JSON.stringify({
    system: "Android 12",
    hortorSDKVersion: "4.2.1-cn-release",
    model: "ALN-AL80",
    brand: "HUAWEI",
  });

  interface DeviceProfile {
    androidId: string;
    distinctId: string;
  }

  interface PendingRole {
    id: string;
    name: string;
    roleId: string;
    token: string;
    server: string;
    roleIndex: number;
    wsUrl: string;
    importMethod: "mobile";
    serverId: string | number;
    combUser?: Record<string, unknown>;
  }

  const mobileForm = reactive({ phone: "", code: "" });

  const importForm = reactive({
    nameTemplate: "{name}-{index}-{id}",
    wsUrl: "",
  });

  const isSendingCode = ref(false);

  const isLoggingIn = ref(false);

  const isImporting = ref(false);

  const cooldownSeconds = ref(0);

  const serverListData = ref<any[]>([]);

  const roleList = ref<PendingRole[]>([]);

  const originalBinData = ref<any>(null);

  const activeLoginMatchId = ref("");

  const currentCombUser = ref<Record<string, unknown> | null>(null);

  const saveCombUser = ref(false);

  let cooldownTimer: ReturnType<typeof setInterval> | null = null;

  const createRandomHex = (byteLength: number) => {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  };

  const getDeviceProfile = (): DeviceProfile => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(DEVICE_STORAGE_KEY) || "null",
      );
      if (saved?.androidId && saved?.distinctId)
        return saved;
    } catch {
      // A malformed old value is replaced below.
    }

    const profile = {
      androidId: createRandomHex(8),
      distinctId:
        typeof crypto.randomUUID === "function"
          ? `DID-${crypto.randomUUID()}`
          : `DID-${createRandomHex(16)}`,
    };
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(profile));
    return profile;
  };

  const deviceProfile = getDeviceProfile();

  const normalizedPhone = () => mobileForm.phone.replace(/\s/g, "");

  const requirePhone = () => {
    if (!/^1\d{10}$/.test(normalizedPhone())) {
      message.error("请输入11位手机号");
      return false;
    }
    return true;
  };

  const clearCooldown = () => {
    if (cooldownTimer)
      clearInterval(cooldownTimer);
    cooldownTimer = null;
    cooldownSeconds.value = 0;
  };

  const startCooldown = (seconds: number) => {
    clearCooldown();
    cooldownSeconds.value = Math.max(1, seconds);
    cooldownTimer = setInterval(() => {
      cooldownSeconds.value -= 1;
      if (cooldownSeconds.value <= 0)
        clearCooldown();
    }, 1000);
  };

  const ensureSuccess = (response: any, fallback: string) => {
    if (response?.meta?.errCode !== 0) {
      throw new Error(response?.meta?.errMsg || fallback);
    }
    return response.data;
  };

  const sendVerificationCode = async () => {
    if (!requirePhone() || cooldownSeconds.value > 0)
      return;

    isSendingCode.value = true;
    activeLoginMatchId.value = `${Date.now()}_${createRandomHex(16)}`;
    try {
      const response = await fetch(
        `${HORTOR_UCENTER_PROXY_PREFIX}/ucenter-app-server/api/v1/login/verify/code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            gameId: GAME_ID,
            gameTp: "app",
            accountNum: normalizedPhone(),
            sysInfo: systemInfo,
            activeLoginMatchId: activeLoginMatchId.value,
            channel: "android",
            verifyCodeTp: "login",
            distinctId: deviceProfile.distinctId,
            oaidThirdSdk: "",
            ipv6: "",
            limit: true,
            packageName: PACKAGE_NAME,
            signPrint: SIGN_PRINT,
            androidId: deviceProfile.androidId,
            oaId: "",
            oaid: "",
          }),
        },
      );
      if (!response.ok)
        throw new Error(`HTTP 状态码：${response.status}`);

      const data = ensureSuccess(await response.json(), "验证码发送失败");
      const waitSecond = Number(data?.waitSecond);
      if (!data?.sendSuccess) {
        if (Number.isFinite(waitSecond) && waitSecond > 0) {
          startCooldown(waitSecond);
        }
        message.warning(data?.msg || "请稍后再试");
        return;
      }

      startCooldown(waitSecond > 0 ? waitSecond : 120);
      message.success(data.msg || "验证码已发送");
    } catch (error: any) {
      activeLoginMatchId.value = "";
      message.error(`获取验证码失败：${error.message || error}`);
    } finally {
      isSendingCode.value = false;
    }
  };

  const createGameLoginBuffer = (combUser: any) =>
    generateBinFromCombUser(combUser);

  const loginWithVerificationCode = async () => {
    if (!requirePhone())
      return;
    if (!/^\d{4,8}$/.test(mobileForm.code.trim())) {
      message.error("请输入短信验证码");
      return;
    }
    if (!activeLoginMatchId.value) {
      message.error("请先获取验证码");
      return;
    }

    isLoggingIn.value = true;
    try {
      const payload = {
        gameId: GAME_ID,
        sysInfo: systemInfo,
        activeLoginMatchId: activeLoginMatchId.value,
        smsCode: mobileForm.code.trim(),
        mobile: normalizedPhone(),
        channel: "android",
        distinctId: deviceProfile.distinctId,
        oaidThirdSdk: "",
        ipv6: "",
        packageName: PACKAGE_NAME,
        signPrint: SIGN_PRINT,
        tp: "app-mobile",
        androidId: deviceProfile.androidId,
        oaId: "",
        oaid: "",
      };
      const query = new URLSearchParams({
        gameId: GAME_ID,
        timestamp: String(Math.floor(Date.now() / 1000)),
        version: "android-4.2.1-cn-release",
        cryptVersion: "1.1.0",
        gameTp: "app",
        system: "android",
        deviceUniqueId: deviceProfile.distinctId,
        packageName: PACKAGE_NAME,
      });
      const response = await fetch(
        `${HORTOR_PROXY_PREFIX}/comb-login-server/api/v1/login?${query.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Accept": "application/json",
          },
          body: encodeHortorLoginPayload(payload),
        },
      );
      if (!response.ok)
        throw new Error(`HTTP 状态码：${response.status}`);

      const data = ensureSuccess(await response.json(), "登录失败");
      if (!data?.combUser)
        throw new Error("登录响应缺少用户凭据");
      currentCombUser.value = data.combUser;
      await loadRoles(createGameLoginBuffer(data.combUser));
      message.success("登录成功，请选择需要添加的角色");
    } catch (error: any) {
      message.error(`登录失败：${error.message || error}`);
    } finally {
      isLoggingIn.value = false;
    }
  };

  const loadRoles = async (bin: ArrayBuffer) => {
    serverListData.value = [];
    originalBinData.value = null;
    const { payload, roles } = await loadRoleBinData(bin, getServerList);
    originalBinData.value = payload;
    serverListData.value = roles.sort((left: any, right: any) => Number(right.power || 0) - Number(left.power || 0));
  };

  const getServerInfo = (serverId: string | number) => {
    let serverNumber = Number(serverId);
    let roleIndex = 0;
    if (serverNumber >= 2000000) {
      roleIndex = 2;
      serverNumber -= 2000000;
    } else if (serverNumber >= 1000000) {
      roleIndex = 1;
      serverNumber -= 1000000;
    }
    return { roleIndex, serverNumber: serverNumber - 27 };
  };

  const addSelectedRole = async (roleInfo: any) => {
    if (!originalBinData.value) {
      message.error("请先完成手机号登录");
      return;
    }
    try {
      const buffer = buildRoleBin(originalBinData.value, roleInfo.serverId);
      const tokenId = getTokenId(buffer);
      const token = await transformToken(buffer);
      const { roleIndex, serverNumber } = getServerInfo(roleInfo.serverId);
      const roleName = roleInfo.name || `角色_${roleInfo.roleId}`;
      const name = (importForm.nameTemplate || "{name}-{index}-{id}")
        .replace(/\{name\}/g, roleName)
        .replace(/\{index\}/g, String(roleIndex))
        .replace(/\{id\}/g, String(roleInfo.roleId))
        .replace(/\{server\}/g, `${serverNumber}服`);
      if (
        roleList.value.some(
          (role) => role.roleId === roleInfo.roleId && role.name === name,
        )
      ) {
        message.warning(`角色 ${name} 已在待添加列表中`);
        return;
      }
      if (!(await storeArrayBuffer(tokenId, buffer)))
        throw new Error("保存 BIN 失败");
      roleList.value.push({
        id: tokenId,
        roleId: roleInfo.roleId,
        token,
        name,
        server: `${serverNumber}服`,
        roleIndex,
        wsUrl: importForm.wsUrl,
        importMethod: "mobile",
        serverId: roleInfo.serverId,
        combUser: saveCombUser.value ? currentCombUser.value || undefined : undefined,
      });
      message.success(`已添加角色：${name}`);
    } catch (error: any) {
      console.error("Failed to add selected role", error);
      message.error(`添加角色失败：${error.message || error}`);
    }
  };

  const handleDownload = (roleInfo: any) => {
    if (!originalBinData.value) {
      message.error("请先完成手机号登录");
      return;
    }
    try {
      const buffer = buildRoleBin(originalBinData.value, roleInfo.serverId);
      const fileName = getRoleBinFileName(roleInfo);
      downloadBinFile(fileName, buffer);
    } catch (error: any) {
      message.error(`下载失败：${error.message || error}`);
    }
  };

  const removeRole = (index: number) => roleList.value.splice(index, 1);

  const handleImport = () => {
    if (roleList.value.length === 0) {
      message.error("请先登录并选择角色");
      return;
    }
    isImporting.value = true;
    try {
      for (const role of roleList.value) {
        const existing = tokenStore.gameTokens.find(
          (token) => token.id === role.id,
        );
        if (existing)
          tokenStore.updateToken(existing.id, role);
        else tokenStore.addToken(role);
      }
      roleList.value = [];
      message.success("Token添加成功");
      emit("ok");
    } finally {
      isImporting.value = false;
    }
  };

  onUnmounted(clearCooldown);
  return {
    mobileForm,
    importForm,
    isSendingCode,
    isLoggingIn,
    isImporting,
    cooldownSeconds,
    serverListData,
    roleList,
    activeLoginMatchId,
    saveCombUser,
    sendVerificationCode,
    loginWithVerificationCode,
    addSelectedRole,
    handleDownload,
    removeRole,
    handleImport,
  };
}
