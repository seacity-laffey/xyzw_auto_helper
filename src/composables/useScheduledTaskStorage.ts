import { ref } from "vue";
import { createScheduledTaskParameters, readLegacyScheduledParameters } from "@/utils/scheduledTaskParameters";
import { addTaskSaveLog } from "@/utils/batch";

interface ScheduledTask extends Record<string, any> {
  enabled: boolean;
  id: string;
  name: string;
  selectedTasks?: string[];
}

interface LogEntry {
  message: string;
  time: string;
  type: string;
}

interface StorageDependencies {
  addLog: (entry: LogEntry) => void;
  notify: (type: "success", text: string) => void;
}

const retiredTaskNames = new Set([
  "batchSmartSendCar",
  "batchClaimCars",
  "batchbaoku13",
  "batchbaoku45",
]);

export const sanitizeScheduledTask = (
  task: Record<string, any>,
  legacyParameters?: Record<string, any>,
): ScheduledTask => {
  const selectedTasks = Array.isArray(task?.selectedTasks)
    ? task.selectedTasks.filter(
        (taskName: string) => !retiredTaskNames.has(taskName),
      )
    : [];

  return {
    ...task,
    parameters: createScheduledTaskParameters(task.parameters ?? legacyParameters ?? readLegacyScheduledParameters()),
    selectedTasks,
    enabled: selectedTasks.length > 0 ? Boolean(task.enabled) : false,
  } as ScheduledTask;
};

export const useScheduledTaskStorage = ({
  addLog,
  notify,
}: StorageDependencies) => {
  const scheduledTasks = ref<ScheduledTask[]>([]);

  const loadScheduledTasks = () => {
    try {
      const saved = localStorage.getItem("scheduledTasks");
      const parsed = saved ? JSON.parse(saved) : [];
      scheduledTasks.value = Array.isArray(parsed)
        ? parsed.map((task) => sanitizeScheduledTask(task))
        : [];
      if (Array.isArray(parsed) && parsed.some((task) => !task.parameters)) {
        const backupKey = "scheduled-task-parameters-backup:v1";
        if (!localStorage.getItem(backupKey))
          localStorage.setItem(backupKey, JSON.stringify({ tasks: parsed, parameters: readLegacyScheduledParameters() }));
        localStorage.setItem("scheduledTasks", JSON.stringify(scheduledTasks.value));
      }
    } catch (error) {
      console.error("Failed to load scheduled tasks:", error);
      scheduledTasks.value = [];
    }
  };

  const saveScheduledTasks = () => {
    try {
      localStorage.setItem("scheduledTasks", JSON.stringify(scheduledTasks.value));
    } catch (error) {
      console.error("Failed to save scheduled tasks:", error);
    }
  };

  const saveScheduledTask = ({
    task,
    isNew,
  }: {
    isNew: boolean;
    task: ScheduledTask;
  }) => {
    const index = scheduledTasks.value.findIndex((item) => item.id === task.id);
    if (index >= 0)
      scheduledTasks.value[index] = task;
    else scheduledTasks.value.push(task);
    saveScheduledTasks();
    addTaskSaveLog(task, isNew, addLog);
    notify("success", "定时任务已保存");
  };

  const deleteTask = (taskId: string) => {
    const task = scheduledTasks.value.find((item) => item.id === taskId);
    if (!task)
      return;
    scheduledTasks.value = scheduledTasks.value.filter(
      (item) => item.id !== taskId,
    );
    saveScheduledTasks();
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已删除 ===`,
      type: "info",
    });
    notify("success", "定时任务已删除");
  };

  const toggleTaskEnabled = (taskId: string, enabled: boolean) => {
    const task = scheduledTasks.value.find((item) => item.id === taskId);
    if (!task)
      return;
    task.enabled = enabled;
    saveScheduledTasks();
    notify("success", `定时任务已${enabled ? "启用" : "禁用"}`);
    addLog({
      time: new Date().toLocaleTimeString(),
      message: `=== 定时任务 ${task.name} 已${enabled ? "启用" : "禁用"} ===`,
      type: "info",
    });
  };

  loadScheduledTasks();

  return {
    deleteTask,
    saveScheduledTask,
    saveScheduledTasks,
    scheduledTasks,
    toggleTaskEnabled,
  };
};
