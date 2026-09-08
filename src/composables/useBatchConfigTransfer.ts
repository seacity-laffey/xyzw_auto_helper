import type { Ref } from "vue";
import type { BatchRuntimeSettings } from "@/composables/useBatchRuntimeSettings";
import { useAppMessage } from "@/composables/useAppMessage";
import { gameTokens } from "@/stores/tokenStore";
import { loadTaskTemplates, migrateTaskAccounts, saveTaskTemplates } from "@/utils/taskTemplateConfig";

interface TransferDependencies {
  batchSettings: BatchRuntimeSettings;
  persistBatchSettings: () => boolean;
  sanitizeScheduledTask: (task: Record<string, unknown>, parameters?: any) => Record<string, unknown>;
  saveScheduledTasks: () => void;
  scheduledTasks: Ref<Array<Record<string, any>>>;
  tokens: Ref<Array<Record<string, any>>>;
}

export const useBatchConfigTransfer = ({
  batchSettings,
  persistBatchSettings,
  sanitizeScheduledTask,
  saveScheduledTasks,
  scheduledTasks,
  tokens,
}: TransferDependencies) => {
  const message = useAppMessage();

  const exportConfig = () => {
    try {
      migrateTaskAccounts(tokens.value as Array<{ id: string }>);
      const validTokenIds = new Set(tokens.value.map((token) => token.id));
      const filteredScheduledTasks = scheduledTasks.value
        .map((task) => ({
          ...task,
          selectedTokens:
            task.selectedTokens?.filter((tokenId: string) =>
              validTokenIds.has(tokenId),
            ) || [],
        }))
        .filter((task) => task.selectedTokens.length > 0);

      const tokenSettings = tokens.value.flatMap((token) => {
        const saved = localStorage.getItem(`daily-settings:${token.id}`);
        if (!saved)
          return [];
        try {
          return [{ tokenId: token.id, settings: JSON.parse(saved) }];
        } catch (error) {
          console.warn(`Failed to parse settings for token ${token.id}`, error);
          return [];
        }
      });

      const exportData = {
        version: "1.2",
        taskTemplates: loadTaskTemplates(),
        exportTime: new Date().toISOString(),
        tokens: tokens.value.map((token) => ({
          id: token.id,
          name: token.name,
          token: token.token,
          server: token.server,
          wsUrl: token.wsUrl,
          remark: token.remark,
          importMethod: token.importMethod,
          sourceUrl: token.sourceUrl,
          upgradedToPermanent: true,
          upgradedAt: token.upgradedAt,
          updatedAt: token.updatedAt,
        })),
        scheduledTasks: filteredScheduledTasks,
        batchSettings: {
          commandDelay: batchSettings.commandDelay,
          taskDelay: batchSettings.taskDelay,
          actionDelay: batchSettings.actionDelay,
          battleDelay: batchSettings.battleDelay,
          refreshDelay: batchSettings.refreshDelay,
          longDelay: batchSettings.longDelay,
          maxActive: batchSettings.maxActive,
          tokenListColumns: batchSettings.tokenListColumns,
        },
        tokenSettings,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `xyzw_config_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      message.success(
        `导出成功: ${exportData.tokens.length} 个账号, ${exportData.scheduledTasks.length} 个定时任务`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error("Export failed:", error);
      message.error(`导出失败: ${reason}`);
    }
  };

  const importConfigFile = async (file: File) => {
    try {
      const importData = JSON.parse(await file.text());
      if (
        !importData.version
        || !Array.isArray(importData.tokens)
        || !Array.isArray(importData.scheduledTasks)
      ) {
        message.error("无效的配置文件格式");
        return false;
      }

      let importedTokens = 0;
      let importedTasks = 0;
      importData.tokens.forEach((token: Record<string, any>) => {
        const exists = gameTokens.value.some(
          (existing) =>
            existing.token === token.token || existing.id === token.id,
        );
        if (exists || !token.token)
          return;

        const now = new Date().toISOString();
        gameTokens.value.push({
          id:
            token.id
            || `token_${Date.now()}${Math.random().toString(36).slice(2)}`,
          name: token.name || "",
          token: token.token,
          server: token.server || "",
          wsUrl: token.wsUrl || null,
          remark: token.remark || "",
          importMethod: "import",
          sourceUrl: token.sourceUrl || null,
          upgradedToPermanent: true,
          upgradedAt: token.upgradedAt || null,
          updatedAt: token.updatedAt || now,
          createdAt: now,
          lastUsed: now,
        });
        importedTokens++;
      });

      importData.scheduledTasks.forEach((task: Record<string, any>) => {
        const exists = scheduledTasks.value.some(
          (existing) => existing.id === task.id,
        );
        if (exists || !task.id)
          return;
        scheduledTasks.value.push(sanitizeScheduledTask(task, importData.batchSettings || {}));
        importedTasks++;
      });
      saveScheduledTasks();

      if (importData.batchSettings) {
        Object.assign(batchSettings, importData.batchSettings);
        persistBatchSettings();
      }

      const importedTemplateIds = new Map<string, string>();
      if (Array.isArray(importData.taskTemplates)) {
        const templates = loadTaskTemplates();
        for (const incoming of importData.taskTemplates) {
          if (!incoming?.id || !incoming?.settings || !incoming?.name)
            throw new Error("导入模板数据无效");
          const existing = templates.find((template) => template.id === incoming.id);
          if (existing && JSON.stringify(existing.settings) !== JSON.stringify(incoming.settings)) {
            const id = crypto.randomUUID();
            templates.push({ ...incoming, id, name: `${incoming.name} · 导入` });
            importedTemplateIds.set(incoming.id, id);
          } else {
            if (!existing)
              templates.push(incoming);
            importedTemplateIds.set(incoming.id, incoming.id);
          }
        }
        saveTaskTemplates(templates);
      }
      if (Array.isArray(importData.tokenSettings)) {
        importData.tokenSettings.forEach((item: Record<string, any>) => {
          if (item.tokenId && item.settings) {
            localStorage.setItem(
              `daily-settings:${item.tokenId}`,
              JSON.stringify({ ...item.settings, templateId: importedTemplateIds.get(item.settings.templateId) || item.settings.templateId }),
            );
          }
        });
      }

      message.success(
        `导入成功: ${importedTokens} 个新账号, ${importedTasks} 个新定时任务`,
      );
      return true;
    } catch (error) {
      console.error("Import failed:", error);
      message.error("解析配置文件失败");
      return false;
    }
  };

  return { exportConfig, importConfigFile };
};
