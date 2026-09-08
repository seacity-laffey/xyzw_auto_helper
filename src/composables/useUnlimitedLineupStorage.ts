import { h, ref } from "vue";
import { NInput, useDialog, useMessage } from "naive-ui";

interface UploadRequestOptions {
  file: {
    file: Blob;
  };
}

const storageKey = "saved_lineups";

const generateLineupId = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let index = 0; index < 32; index++)
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

export const useUnlimitedLineupStorage = (tokenStore: any) => {
  const message = useMessage();
  const dialog = useDialog();
  const savedLineups = ref<any[]>([]);

  const loadSavedLineups = () => {
    try {
      const token = tokenStore.selectedToken;
      if (!token)
        return;
      const data = localStorage.getItem(`${storageKey}_${token.id}`);
      savedLineups.value = data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("加载保存的阵容失败:", error);
      savedLineups.value = [];
    }
  };

  const saveLineupsToStorage = () => {
    try {
      const token = tokenStore.selectedToken;
      if (!token)
        return;
      localStorage.setItem(
        `${storageKey}_${token.id}`,
        JSON.stringify(savedLineups.value),
      );
    } catch (error) {
      console.error("保存阵容到缓存失败:", error);
      message.error("保存阵容失败");
    }
  };

  const renameLineup = (index: number) => {
    const lineup = savedLineups.value[index];
    if (!lineup)
      return;

    const currentName = lineup.name;
    let newName = currentName;
    dialog.create({
      title: "重命名阵容",
      content: () =>
        h(NInput, {
          defaultValue: currentName,
          onInput: (value) => {
            newName = value;
          },
          placeholder: "请输入阵容名称",
        }),
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: () => {
        if (newName?.trim()) {
          lineup.name = newName.trim();
          saveLineupsToStorage();
          message.success("阵容名称已更新");
        }
      },
    });
  };

  const deleteLineup = (index: number) => {
    const lineup = savedLineups.value[index];
    if (!lineup)
      return;

    dialog.warning({
      title: "删除阵容",
      content: `确定要删除阵容 "${lineup.name}" 吗？`,
      positiveText: "删除",
      negativeText: "取消",
      onPositiveClick: () => {
        savedLineups.value.splice(index, 1);
        saveLineupsToStorage();
        message.success("阵容已删除");
      },
    });
  };

  const exportLineups = async () => {
    const token = tokenStore.selectedToken;
    if (!token) {
      message.warning("请先选择Token");
      return;
    }
    if (tokenStore.getWebSocketStatus(token.id) !== "connected") {
      message.error("WebSocket未连接，无法导出");
      return;
    }

    try {
      const response = await tokenStore.sendMessageWithPromise(
        token.id,
        "role_getroleinfo",
        {},
      );
      const role = response?.role || response;
      const roleId = role?.roleId || role?.id;
      if (!roleId) {
        message.error("无法获取角色ID");
        return;
      }

      const blob = new Blob([
        JSON.stringify({
          roleId,
          exportTime: Date.now(),
          lineups: savedLineups.value,
        }, null, 2),
      ], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `阵容配置_${roleId}_${new Date().toLocaleDateString().replace(/\//g, "-")}.json`;
      link.click();
      URL.revokeObjectURL(url);
      message.success(`已导出 ${savedLineups.value.length} 个阵容`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      message.error(`导出失败: ${reason}`);
    }
  };

  const processImportedLineups = (lineups: any[]) => {
    const existingIds = new Set(savedLineups.value.map((lineup) => lineup.id));
    const newLineups: any[] = [];
    const duplicateLineups: any[] = [];

    lineups.forEach((lineup) => {
      if (lineup.id && existingIds.has(lineup.id)) {
        duplicateLineups.push(lineup);
      } else {
        newLineups.push({
          ...lineup,
          id: lineup.id || generateLineupId(),
          savedAt: Date.now(),
          applying: false,
        });
      }
    });

    if (duplicateLineups.length === 0) {
      savedLineups.value = [...savedLineups.value, ...newLineups];
      saveLineupsToStorage();
      message.success(`已导入 ${newLineups.length} 个阵容`);
      return;
    }

    dialog.warning({
      title: "发现重复阵容",
      content: `发现 ${duplicateLineups.length} 个已存在的阵容，是否覆盖？`,
      positiveText: "覆盖",
      negativeText: "跳过重复",
      onPositiveClick: () => {
        duplicateLineups.forEach((lineup) => {
          const index = savedLineups.value.findIndex(
            (savedLineup) => savedLineup.id === lineup.id,
          );
          if (index !== -1) {
            savedLineups.value[index] = {
              ...lineup,
              savedAt: Date.now(),
              applying: false,
            };
          }
        });
        savedLineups.value = [...savedLineups.value, ...newLineups];
        saveLineupsToStorage();
        message.success(
          `已导入 ${newLineups.length + duplicateLineups.length} 个阵容`,
        );
      },
      onNegativeClick: () => {
        savedLineups.value = [...savedLineups.value, ...newLineups];
        saveLineupsToStorage();
        message.success(
          `已导入 ${newLineups.length} 个阵容，跳过 ${duplicateLineups.length} 个重复`,
        );
      },
    });
  };

  const importLineups = async ({ file }: UploadRequestOptions) => {
    const token = tokenStore.selectedToken;
    if (!token) {
      message.warning("请先选择Token");
      return;
    }
    if (tokenStore.getWebSocketStatus(token.id) !== "connected") {
      message.error("WebSocket未连接，无法导入");
      return;
    }

    try {
      const response = await tokenStore.sendMessageWithPromise(
        token.id,
        "role_getroleinfo",
        {},
      );
      const role = response?.role || response;
      const currentRoleId = role?.roleId || role?.id;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importData = JSON.parse(String(event.target?.result || ""));
          if (!importData.roleId || !Array.isArray(importData.lineups)) {
            message.error("无效的阵容文件格式");
            return;
          }

          if (importData.roleId !== currentRoleId) {
            dialog.warning({
              title: "角色不匹配",
              content: "该阵容文件来自其他角色，是否继续导入？",
              positiveText: "导入",
              negativeText: "取消",
              onPositiveClick: () => processImportedLineups(importData.lineups),
            });
          } else {
            processImportedLineups(importData.lineups);
          }
        } catch {
          message.error("解析文件失败，请检查文件格式");
        }
      };
      reader.readAsText(file.file);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      message.error(`导入失败: ${reason}`);
    }
  };

  return {
    deleteLineup,
    exportLineups,
    generateLineupId,
    importLineups,
    loadSavedLineups,
    renameLineup,
    savedLineups,
    saveLineupsToStorage,
  };
};
