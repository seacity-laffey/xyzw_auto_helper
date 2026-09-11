import { createBackup, restoreBackup, validateBackup } from "./utils/backup.js";

const status = document.querySelector("#status");
const exportButton = document.querySelector("#export");
const input = document.querySelector("#import");
async function run(action) {
  exportButton.disabled = input.disabled = true;
  try {
    await action();
  } catch (error) {
    status.textContent = `操作失败：${error.message}`;
  } finally {
    exportButton.disabled = input.disabled = false;
    input.value = "";
  }
}
exportButton.addEventListener("click", () => run(async () => {
  const backup = await createBackup();
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `xyzw-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  status.textContent = "备份已生成，请完成保存对话框。";
}));
input.addEventListener("change", () => run(async () => {
  const file = input.files[0];
  if (!file)
    return;
  if (file.size > 64 * 1024 * 1024)
    throw new Error("文件超过 64 MB");
  const backup = JSON.parse(await file.text());
  validateBackup(backup);
  // 独立迁移页没有 Vue 对话框上下文，写入前使用浏览器确认。
  // eslint-disable-next-line no-alert
  if (!confirm("导入会覆盖相同键的账号、任务和设置；不删除其他记录。请先导出当前数据，并关闭其他游戏窗口。继续？"))
    return;
  await restoreBackup(backup);
  status.textContent = "导入成功。返回账号管理后生效；启用的定时任务也会恢复，请检查任务设置。";
}));
