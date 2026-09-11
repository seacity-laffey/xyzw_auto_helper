export function minuteKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getHours()}_${date.getMinutes()}`;
}

// 不重放错过的分钟；串行调度，不在长任务完成前释放执行锁。
export function createSchedulerTick({ tasks, matches, execute, storage, busy, onError, now = Date.now }) {
  let running = false;
  let lastTick = now();
  let skippedMinute;
  return async () => {
    const timestamp = now();
    const date = new Date(timestamp);
    const minute = minuteKey(date);
    if (timestamp - lastTick > 60000 || timestamp < lastTick)
      skippedMinute = minute;
    lastTick = timestamp;
    if (running || busy() || skippedMinute === minute)
      return;
    running = true;
    try {
      for (const task of tasks().filter((task) => task.enabled)) {
        try {
          if (!matches(task, date))
            continue;
          const key = `lastTaskExecution_${task.id}`;
          const value = `${task.id}_${minute}`;
          if (storage.getItem(key) === value)
            continue;
          // 前一个任务执行跨分钟，不补跑这个时间槽中剩余的任务。
          if (minuteKey(new Date(now())) !== minute || busy())
            break;
          storage.setItem(key, value);
          await execute(task);
        } catch (error) {
          onError(error, task);
        }
      }
    } finally {
      running = false;
    }
  };
}
