import type { BatchTaskDeps, BatchToken } from "./types";

/** 新活动共享连接生命周期；只释放本次申请的槽位，不关闭已有角色连接。 */
export async function runBatchActivity(
  deps: BatchTaskDeps,
  title: string,
  execute: (token: BatchToken) => Promise<void>,
) {
  const {
    selectedTokens,
    tokens,
    tokenStatus,
    isRunning,
    shouldStop,
    tokenStore,
    addLog,
  } = deps;
  if (isRunning.value || !selectedTokens.value.length)
    return;
  const ids = [...selectedTokens.value];
  isRunning.value = true;
  shouldStop.value = false;
  ids.forEach((id) => {
    tokenStatus.value[id] = "waiting";
  });
  try {
    await Promise.all(
      ids.map(async (id) => {
        let connected = false;
        const ownsConnection
          = tokenStore.getWebSocketStatus(id) !== "connected";
        const token = tokens.value.find((item) => item.id === id);
        try {
          if (!token)
            throw new Error("账号已不存在");
          if (shouldStop.value)
            return;
          tokenStatus.value[id] = "running";
          connected = await deps.ensureConnection(id);
          if (!connected)
            throw new Error("连接失败");
          if (shouldStop.value)
            return;
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token.name} 开始${title}`,
            type: "info",
          });
          await execute(token);
          tokenStatus.value[id] = shouldStop.value ? "stopped" : "completed";
        } catch (error) {
          tokenStatus.value[id] = shouldStop.value ? "stopped" : "failed";
          addLog({
            time: new Date().toLocaleTimeString(),
            message: `${token?.name || id} ${title}: ${error instanceof Error ? error.message : String(error)}`,
            type: "error",
          });
        } finally {
          if (connected && ownsConnection) {
            tokenStore.closeWebSocketConnection(id);
            deps.releaseConnectionSlot();
          }
          if (
            shouldStop.value
            && ["waiting", "running"].includes(tokenStatus.value[id] || "")
          ) {
            tokenStatus.value[id] = "stopped";
          }
        }
      }),
    );
  } finally {
    isRunning.value = false;
    deps.currentRunningTokenId.value = null;
  }
  const failures = ids.filter(
    (id) => tokenStatus.value[id] === "failed",
  ).length;
  const summary = `${title}${shouldStop.value ? "已停止" : "结束"}${failures ? `，${failures} 个账号失败，请查看日志` : ""}`;
  if (failures)
    deps.message.warning?.(summary);
  else deps.message.success(summary);
}
