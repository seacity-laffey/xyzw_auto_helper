/**
 * Cron表达式验证和解析工具
 */

interface CronValidationResult {
  valid: boolean;
  message?: string;
}

export interface WeeklyBlackout {
  weekday: number;
  start: string;
  end: string;
}

interface CronTask {
  runType: "daily" | "cron" | string;
  runTime?: string;
  cronExpression?: string;
  intervalMinutes?: number;
  intervalAnchor?: number;
  blackoutWindows?: WeeklyBlackout[];
}

/**
 * 验证Cron字段
 * @param {string} field - 字段值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {string} fieldName - 字段名称
 * @returns {object} - 验证结果 {valid: boolean, message: string}
 */
export const validateCronField = (
  field: string,
  min: number,
  max: number,
  fieldName: string,
): CronValidationResult => {
  if (!field) {
    return { valid: false, message: `${fieldName}字段不能为空` };
  }

  // 1. 处理列表格式，如 1,3,5 或 1-5,7-9
  // 列表优先级最高，因为包含逗号
  if (field.includes(",")) {
    const items = field.split(",");
    for (const item of items) {
      const result = validateCronField(item.trim(), min, max, fieldName);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }

  // 2. 处理步长格式，如 */5, 1-10/2, 0/1
  if (field.includes("/")) {
    const parts = field.split("/");
    if (parts.length !== 2) {
      return { valid: false, message: `${fieldName}字段步长格式错误` };
    }
    const [range, stepStr] = parts as [string, string];
    const step = parseInt(stepStr);
    if (isNaN(step) || step <= 0) {
      return { valid: false, message: `${fieldName}字段步长必须是正整数` };
    }

    // 验证范围部分
    // 范围部分可以是 * (所有), 1-5 (范围), 1 (起始值)
    if (range === "*") {
      return { valid: true };
    }

    // 递归验证范围部分，但范围部分不能再包含步长或列表（因为已经处理过了）
    // 不过这里直接处理 range 的验证逻辑更清晰，避免无限递归或逻辑混乱
    if (range.includes("-")) {
      const rangeParts = range.split("-");
      if (rangeParts.length !== 2) {
        return { valid: false, message: `${fieldName}字段范围格式错误` };
      }
      const [start, end] = rangeParts.map(Number) as [number, number];
      if (
        isNaN(start) ||
        isNaN(end) ||
        start < min ||
        end > max ||
        start > end
      ) {
        return {
          valid: false,
          message: `${fieldName}字段范围必须在${min}-${max}之间，且开始值小于等于结束值`,
        };
      }
      return { valid: true };
    } else {
      // 单个数字作为起始值
      const num = parseInt(range);
      if (isNaN(num) || num < min || num > max) {
        return {
          valid: false,
          message: `${fieldName}字段起始值必须在${min}-${max}之间`,
        };
      }
      return { valid: true };
    }
  }

  // 3. 处理星号
  if (field === "*") {
    return { valid: true };
  }

  // 4. 处理范围格式，如 1-5
  if (field.includes("-")) {
    const rangeParts = field.split("-");
    if (rangeParts.length !== 2) {
      return { valid: false, message: `${fieldName}字段范围格式错误` };
    }
    const [start, end] = rangeParts.map(Number) as [number, number];
    if (
      isNaN(start) ||
      isNaN(end) ||
      start < min ||
      end > max ||
      start > end
    ) {
      return {
        valid: false,
        message: `${fieldName}字段范围必须在${min}-${max}之间，且开始值小于等于结束值`,
      };
    }
    return { valid: true };
  }

  // 5. 处理单个数字
  if (field === "L" && max === 31) {
    return { valid: true };
  }
  if (field === "?") {
    return { valid: true };
  }
  // 7. 处理工作日 'W'
  if (field.endsWith("W")) {
    const dayStr = field.slice(0, -1);
    const day = parseInt(dayStr);
    if (isNaN(day) || day < min || day > max) {
      return {
        valid: false,
        message: `${fieldName}字段工作日格式错误`,
      };
    }
    return { valid: true };
  }

  // 8. 处理第几个周几 '#'
  if (field.includes("#")) {
    const parts = field.split("#");
    if (parts.length !== 2) {
      return { valid: false, message: `${fieldName}字段格式错误` };
    }
    const [dayOfWeek, nth] = parts.map(Number) as [number, number];
    if (
      isNaN(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 7 ||
      isNaN(nth) ||
      nth < 1 ||
      nth > 5
    ) {
      return { valid: false, message: `${fieldName}字段格式错误` };
    }
    return { valid: true };
  }

  // 9. 处理周字段的 'L' (例如 6L 表示最后一个周六)
  if (field.endsWith("L") && fieldName === "星期") {
    const dayStr = field.slice(0, -1);
    const day = parseInt(dayStr);
    if (isNaN(day) || day < 0 || day > 7) {
      return {
        valid: false,
        message: `${fieldName}字段格式错误`,
      };
    }
    return { valid: true };
  }

  const num = parseInt(field);
  if (isNaN(num) || num < min || num > max) {
    return {
      valid: false,
      message: `${fieldName}字段必须在${min}-${max}之间`,
    };
  }

  return { valid: true };
};

/**
 * 验证Cron表达式
 * @param {string} expression - Cron表达式
 * @returns {object} - 验证结果 {valid: boolean, message: string}
 */
export const validateCronExpression = (expression: string): CronValidationResult => {
  if (!expression) return { valid: false, message: "Cron表达式不能为空" };

  const cronParts = expression.split(" ").filter(Boolean);
  if (cronParts.length !== 5) {
    return {
      valid: false,
      message: "Cron表达式必须包含5个字段：分 时 日 月 周",
    };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts as [
    string,
    string,
    string,
    string,
    string,
  ];

  // Validate minute (0-59)
  const minuteValidation = validateCronField(minute, 0, 59, "分钟");
  if (!minuteValidation.valid) {
    return minuteValidation;
  }

  // Validate hour (0-23)
  const hourValidation = validateCronField(hour, 0, 23, "小时");
  if (!hourValidation.valid) {
    return hourValidation;
  }

  // Validate dayOfMonth (1-31)
  const dayOfMonthValidation = validateCronField(dayOfMonth, 1, 31, "日期");
  if (!dayOfMonthValidation.valid) {
    return dayOfMonthValidation;
  }

  // Validate month (1-12)
  const monthValidation = validateCronField(month, 1, 12, "月份");
  if (!monthValidation.valid) {
    return monthValidation;
  }

  // Validate dayOfWeek (0-7, where 0 and 7 both represent Sunday)
  const dayOfWeekValidation = validateCronField(dayOfWeek, 0, 7, "星期");
  if (!dayOfWeekValidation.valid) {
    return dayOfWeekValidation;
  }

  return { valid: true, message: "Cron表达式格式正确" };
};

/**
 * 解析Cron字段，返回可能的值数组
 * @param {string} field - 字段值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number[]} - 可能的值数组
 */
export const parseCronField = (
  field: string,
  min: number,
  max: number,
): number[] => {
  const values = new Set<number>();

  // 处理列表，如 1,3,5 或 1-3,5-7
  if (field.includes(",")) {
    const parts = field.split(",");
    for (const part of parts) {
      // 递归处理每个列表项
      const partValues = parseCronField(part.trim(), min, max);
      partValues.forEach((value) => values.add(value));
    }
    return Array.from(values);
  }

  // 处理星号
  if (field === "*") {
    for (let i = min; i <= max; i++) {
      values.add(i);
    }
    return Array.from(values);
  }

  // 处理步长，如 */5 或 0/1 或 1-10/2
  if (field.includes("/")) {
    const [range, step] = field.split("/") as [string, string];
    const stepNum = parseInt(step);

    let start = min;
    let end = max;

    // 处理范围部分
    if (range !== "*") {
      if (range.includes("-")) {
        const [rangeStart, rangeEnd] = range.split("-").map(Number) as [
          number,
          number,
        ];
        start = rangeStart;
        end = rangeEnd;
      } else {
        start = parseInt(range);
        end = max;
      }
    }

    // 生成步长值
    for (let i = start; i <= end; i += stepNum) {
      values.add(i);
    }
    return Array.from(values);
  }

  // 处理范围，如 1-5
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number) as [number, number];
    for (let i = start; i <= end; i++) {
      values.add(i);
    }
    return Array.from(values);
  }

  // 处理不指定值 '?'
  if (field === "?") {
    return [];
  }

  // 处理工作日 'W'
  if (field.endsWith("W")) {
    return [];
  }

  // 处理第几个周几 '#'
  if (field.includes("#")) {
    return [];
  }

  // 处理周字段的 'L'
  if (field.endsWith("L")) {
    return [];
  }

  // 处理单个数字
  const num = parseInt(field);
  if (!isNaN(num)) {
    values.add(num);
  }
  return Array.from(values);
};

/**
 * 获取指定月份的最近工作日
 * @param {number} year - 年
 * @param {number} month - 月 (1-12)
 * @param {number} targetDay - 目标日期
 * @returns {number} - 最近工作日的日期
 */
const getNearestWeekday = (year: number, month: number, targetDay: number) => {
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  let day = Math.min(targetDay, lastDayOfMonth);
  
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();

  // 如果是周六 (6)，尝试前一天 (周五)
  if (dayOfWeek === 6) {
    if (day > 1) return day - 1;
    // 如果是1号周六，只能往后推到3号周一
    return day + 2; 
  }
  
  // 如果是周日 (0)，尝试后一天 (周一)
  if (dayOfWeek === 0) {
    if (day < lastDayOfMonth) return day + 1;
    // 如果是最后一天周日，只能往前推到前一个周五
    return day - 2;
  }

  return day;
};

/**
 * 检查日期是否匹配 'W' (最近工作日)
 * @param {Date} date - 当前日期
 * @param {string} field - 字段值 (e.g. "15W")
 * @returns {boolean}
 */
const matchesWeekday = (date: Date, field: string) => {
  if (!field.endsWith("W")) return false;
  const targetDay = parseInt(field.slice(0, -1));
  if (isNaN(targetDay)) return false;

  const nearestWeekday = getNearestWeekday(date.getFullYear(), date.getMonth() + 1, targetDay);
  return date.getDate() === nearestWeekday;
};

/**
 * 检查日期是否匹配 '#' (第几个周几)
 * @param {Date} date - 当前日期
 * @param {string} field - 字段值 (e.g. "2#3" - 第3个周一)
 * @returns {boolean}
 */
const matchesNthWeekday = (date: Date, field: string) => {
  if (!field.includes("#")) return false;
  const [targetDayOfWeek, nth] = field.split("#").map(Number) as [
    number,
    number,
  ];
  
  // 检查是否是目标周几
  const currentDayOfWeek = date.getDay();
  // 0和7都表示周日
  const normalizedTarget = targetDayOfWeek === 7 ? 0 : targetDayOfWeek;
  const normalizedCurrent = currentDayOfWeek === 7 ? 0 : currentDayOfWeek;
  
  if (normalizedCurrent !== normalizedTarget) return false;

  // 计算当前是第几个
  const day = date.getDate();
  const currentNth = Math.ceil(day / 7);
  
  return currentNth === nth;
};

/**
 * 检查日期是否匹配周字段的 'L' (最后一个周几)
 * @param {Date} date - 当前日期
 * @param {string} field - 字段值 (e.g. "6L" - 最后一个周六)
 * @returns {boolean}
 */
const matchesLastWeekday = (date: Date, field: string) => {
  if (!field.endsWith("L")) return false;
  const targetDayOfWeek = parseInt(field.slice(0, -1));
  
  // 检查是否是目标周几
  const currentDayOfWeek = date.getDay();
  const normalizedTarget = targetDayOfWeek === 7 ? 0 : targetDayOfWeek;
  const normalizedCurrent = currentDayOfWeek === 7 ? 0 : currentDayOfWeek;
  
  if (normalizedCurrent !== normalizedTarget) return false;

  // 检查是否是最后一个
  const nextWeekDate = new Date(date);
  nextWeekDate.setDate(date.getDate() + 7);
  
  // 如果下周同日期的月份不同，说明当前是当月最后一个
  return nextWeekDate.getMonth() !== date.getMonth();
};

/**
 * 计算下次执行时间
 * @param {string} minuteField - 分钟字段
 * @param {string} hourField - 小时字段
 * @param {string} dayOfMonthField - 日期字段
 * @param {string} monthField - 月份字段
 * @param {string} dayOfWeekField - 星期字段
 * @param {number} count - 计算次数
 * @returns {string[]} - 下次执行时间列表
 */
export const calculateNextRuns = (
  minuteField: string,
  hourField: string,
  dayOfMonthField: string,
  monthField: string,
  dayOfWeekField: string,
  count = 5,
): string[] => {
  const now = new Date();
  const nextRuns: string[] = [];
  let current = new Date(now);
  current.setMilliseconds(0);
  current.setSeconds(0);
  current.setMinutes(current.getMinutes() + 1); // Start from next minute

  // Limit the search to 1 year to prevent infinite loops
  const maxDate = new Date(now);
  maxDate.setFullYear(maxDate.getFullYear() + 1);

  while (nextRuns.length < count && current <= maxDate) {
    // Parse each field
    const possibleMinutes = parseCronField(minuteField, 0, 59);
    const possibleHours = parseCronField(hourField, 0, 23);
    const possibleDaysOfMonth = parseCronField(dayOfMonthField, 1, 31);
    const possibleMonths = parseCronField(monthField, 1, 12);
    const possibleDaysOfWeek = parseCronField(dayOfWeekField, 0, 7);

    // Check if current time matches all fields
    const matchesMinute = possibleMinutes.includes(current.getMinutes());
    const matchesHour = possibleHours.includes(current.getHours());
    const matchesMonth = possibleMonths.includes(current.getMonth() + 1); // months are 0-based in JS
    // const matchesDayOfWeek = possibleDaysOfWeek.includes(current.getDay()); // 0 is Sunday
    
    // Check day of month (including 'L' and 'W' logic)
    let matchesDayOfMonth = possibleDaysOfMonth.includes(current.getDate());
    
    // Check 'L'
    if (!matchesDayOfMonth && dayOfMonthField.includes("L")) {
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      if (dayOfMonthField === "L") {
        matchesDayOfMonth = (current.getDate() === lastDay);
      } else if (dayOfMonthField.split(",").includes("L")) {
        matchesDayOfMonth = (current.getDate() === lastDay);
      }
    }

    // Check 'W'
    if (!matchesDayOfMonth && dayOfMonthField.includes("W")) {
      if (dayOfMonthField.endsWith("W")) {
        // Single 'W' field (e.g. "15W")
        matchesDayOfMonth = matchesWeekday(current, dayOfMonthField);
      } else {
        // List with 'W' (e.g. "15W,20W")
        const wFields = dayOfMonthField
          .split(",")
          .map((f: string) => f.trim())
          .filter((f: string) => f.endsWith("W"));
        if (wFields.length > 0) {
          matchesDayOfMonth = wFields.some((f: string) => matchesWeekday(current, f));
        }
      }
    }
    
    // Check '?' for dayOfMonth (treated as match all)
    if (!matchesDayOfMonth && dayOfMonthField === "?") {
      matchesDayOfMonth = true;
    }

    // Check day of week (including '#', 'L' logic)
    let matchesDayOfWeek = possibleDaysOfWeek.includes(current.getDay());
    
    // Check '#'
    if (!matchesDayOfWeek && dayOfWeekField.includes("#")) {
       matchesDayOfWeek = matchesNthWeekday(current, dayOfWeekField);
    }
    
    // Check 'L' for dayOfWeek
    if (!matchesDayOfWeek && dayOfWeekField.includes("L")) {
      if (dayOfWeekField.endsWith("L")) {
        matchesDayOfWeek = matchesLastWeekday(current, dayOfWeekField);
      }
    }

    // Check '?' for dayOfWeek (treated as match all)
    if (!matchesDayOfWeek && dayOfWeekField === "?") {
      matchesDayOfWeek = true;
    }

    // Special handling: if both dayOfMonth and dayOfWeek are specified, they are OR'ed
    const isDayOfWeekSpecified = dayOfWeekField !== "*" && dayOfWeekField !== "?";
    const isDayOfMonthSpecified = dayOfMonthField !== "*" && dayOfMonthField !== "?";

    let matchesDay;
    if (isDayOfWeekSpecified && isDayOfMonthSpecified) {
      // If both are specified, match either
      matchesDay = matchesDayOfMonth || matchesDayOfWeek;
    } else {
      // If only one is specified, match that one
      matchesDay = matchesDayOfMonth && matchesDayOfWeek;
    }

    if (matchesMinute && matchesHour && matchesDay && matchesMonth) {
      // Format the date in a readable format with year, month, day, hour, minute, second
      const formatted = current.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      nextRuns.push(formatted);
      // Move to next minute for next iteration
      current.setMinutes(current.getMinutes() + 1);
    } else {
      // Move to next minute if no match
      current.setMinutes(current.getMinutes() + 1);
    }
  }

  return nextRuns;
};

/**
 * 计算下次执行时间（基于任务对象）
 * @param {object} task - 任务对象
 * @returns {Date|null} - 下次执行时间
 */
const calculateNextPlannedTime = (task: CronTask, now: Date): Date | null => {
  if (task.runType === "interval") {
    const interval = Number(task.intervalMinutes) * 60000;
    const anchor = Math.floor(Number(task.intervalAnchor) / 60000) * 60000;
    if (!Number.isInteger(task.intervalMinutes) || interval < 60000 || !Number.isFinite(anchor) || anchor <= 0)
      return null;
    const slot = Math.max(1, Math.floor((now.getTime() - anchor) / interval) + 1);
    return new Date(anchor + slot * interval);
  }

  if (task.runType === "daily" && validTime(task.runTime)) {
    // For daily tasks, parse the runTime and calculate next execution
    const [hours, minutes] = task.runTime.split(":").map(Number) as [
      number,
      number,
    ];
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // If today's time has passed, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  } else if (task.runType === "cron" && task.cronExpression) {
    // For cron tasks, parse the cron expression
    const cronParts = task.cronExpression.split(" ").filter(Boolean);
    if (cronParts.length < 5) return null;

    const [
      minuteField,
      hourField,
      dayOfMonthField,
      monthField,
      dayOfWeekField,
    ] = cronParts as [string, string, string, string, string];

    // 解析各个字段的可能值
    const possibleMinutes = parseCronField(minuteField, 0, 59);
    const possibleHours = parseCronField(hourField, 0, 23);
    const possibleDaysOfMonth = parseCronField(dayOfMonthField, 1, 31);
    const possibleMonths = parseCronField(monthField, 1, 12);
    const possibleDaysOfWeek = parseCronField(dayOfWeekField, 0, 7);

    // 从当前时间开始，寻找下一个匹配的时间
    let nextRun = new Date(now);
    nextRun.setSeconds(0, 0);
    nextRun.setMinutes(nextRun.getMinutes() + 1); // 从下一分钟开始检查

    // 最多检查未来一年
    const maxCheckTime = new Date(now);
    maxCheckTime.setFullYear(maxCheckTime.getFullYear() + 1);

    while (nextRun <= maxCheckTime) {
      const minutes = nextRun.getMinutes();
      const hours = nextRun.getHours();
      const dayOfMonth = nextRun.getDate();
      const month = nextRun.getMonth() + 1; // JavaScript月份是0-based
      const dayOfWeek = nextRun.getDay(); // 0是周日

      // 检查所有字段是否匹配
      const matchesMinute = possibleMinutes.includes(minutes);
      const matchesHour = possibleHours.includes(hours);
      const matchesMonth = possibleMonths.includes(month);
      let matchesDayOfWeek = possibleDaysOfWeek.includes(dayOfWeek);

      let matchesDayOfMonth = possibleDaysOfMonth.includes(dayOfMonth);
      if (!matchesDayOfMonth && dayOfMonthField.includes("L")) {
        const lastDay = new Date(nextRun.getFullYear(), nextRun.getMonth() + 1, 0).getDate();
        if (dayOfMonthField === "L") {
          matchesDayOfMonth = (dayOfMonth === lastDay);
        } else if (dayOfMonthField.split(",").includes("L")) {
          matchesDayOfMonth = (dayOfMonth === lastDay);
        }
      }

      // Check 'W'
    if (!matchesDayOfMonth && dayOfMonthField.includes("W")) {
      if (dayOfMonthField.endsWith("W")) {
        // Single 'W' field (e.g. "15W")
        matchesDayOfMonth = matchesWeekday(nextRun, dayOfMonthField);
      } else {
        // List with 'W' (e.g. "15W,20W")
        const wFields = dayOfMonthField
          .split(",")
          .map((f: string) => f.trim())
          .filter((f: string) => f.endsWith("W"));
        if (wFields.length > 0) {
          matchesDayOfMonth = wFields.some((f: string) =>
            matchesWeekday(nextRun, f),
          );
        }
      }
    }

      // Check '?' for dayOfMonth (treated as match all)
      if (!matchesDayOfMonth && dayOfMonthField === "?") {
        matchesDayOfMonth = true;
      }

      // let matchesDayOfWeek = possibleDaysOfWeek.includes(dayOfWeek);

      // Check '#'
      if (!matchesDayOfWeek && dayOfWeekField.includes("#")) {
        matchesDayOfWeek = matchesNthWeekday(nextRun, dayOfWeekField);
      }

      // Check 'L' for dayOfWeek
      if (!matchesDayOfWeek && dayOfWeekField.includes("L")) {
        if (dayOfWeekField.endsWith("L")) {
          matchesDayOfWeek = matchesLastWeekday(nextRun, dayOfWeekField);
        }
      }

      // Check '?' for dayOfWeek (treated as match all)
      if (!matchesDayOfWeek && dayOfWeekField === "?") {
        matchesDayOfWeek = true;
      }

      // Special handling: if both dayOfMonth and dayOfWeek are specified, they are OR'ed
      const isDayOfWeekSpecified = dayOfWeekField !== "*" && dayOfWeekField !== "?";
      const isDayOfMonthSpecified = dayOfMonthField !== "*" && dayOfMonthField !== "?";

      let matchesDay;
      if (isDayOfWeekSpecified && isDayOfMonthSpecified) {
        // If both are specified, match either
        matchesDay = matchesDayOfMonth || matchesDayOfWeek;
      } else {
        // If only one is specified, match that one
        matchesDay = matchesDayOfMonth && matchesDayOfWeek;
      }

      if (matchesMinute && matchesHour && matchesDay && matchesMonth) {
        return nextRun;
      }

      // 检查下一分钟
      nextRun.setMinutes(nextRun.getMinutes() + 1);
    }

    return null;
  }

  return null;
};

/**
 * 格式化时间差
 * @param {number} ms - 毫秒数
 * @returns {string} - 格式化后的时间字符串
 */
export const formatTimeDifference = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  let result = "";
  if (days > 0) result += `${days}天`;
  if (remainingHours > 0 || days > 0) result += `${remainingHours}小时`;
  if (remainingMinutes > 0 || remainingHours > 0 || days > 0)
    result += `${remainingMinutes}分`;
  result += `${remainingSeconds}秒`;

  return result;
};

/**
 * 检查当前时间是否匹配Cron表达式
 * @param {string} cronExpression - Cron表达式
 * @param {Date} now - 当前时间
 * @returns {boolean} - 是否匹配
 */
export const matchesCronExpression = (cronExpression: string, now = new Date()) => {
  const cronParts = cronExpression.split(" ").filter(Boolean);
  if (cronParts.length < 5) return false;

  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] =
    cronParts as [string, string, string, string, string];

  const possibleMinutes = parseCronField(minuteField, 0, 59);
  const possibleHours = parseCronField(hourField, 0, 23);
  const possibleDaysOfMonth = parseCronField(dayOfMonthField, 1, 31);
  const possibleMonths = parseCronField(monthField, 1, 12);
  const possibleDaysOfWeek = parseCronField(dayOfWeekField, 0, 7);

  const matchesMinute = possibleMinutes.includes(now.getMinutes());
  const matchesHour = possibleHours.includes(now.getHours());
  const matchesMonth = possibleMonths.includes(now.getMonth() + 1);
  // const matchesDayOfWeek = possibleDaysOfWeek.includes(now.getDay()); // 0 is Sunday

  let matchesDayOfMonth = possibleDaysOfMonth.includes(now.getDate());
  if (!matchesDayOfMonth && dayOfMonthField.includes("L")) {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (dayOfMonthField === "L") {
      matchesDayOfMonth = (now.getDate() === lastDay);
    } else if (dayOfMonthField.split(",").includes("L")) {
      matchesDayOfMonth = (now.getDate() === lastDay);
    }
  }

  // Check 'W'
  if (!matchesDayOfMonth && dayOfMonthField.includes("W")) {
    if (dayOfMonthField.endsWith("W")) {
      // Single 'W' field (e.g. "15W")
      matchesDayOfMonth = matchesWeekday(now, dayOfMonthField);
  } else if (dayOfMonthField.split(",").some((f: string) => f.endsWith("W"))) {
    // List with 'W' (e.g. "15W,20W")
    const wFields = dayOfMonthField
      .split(",")
      .filter((f: string) => f.endsWith("W"));
    matchesDayOfMonth = wFields.some((f: string) => matchesWeekday(now, f));
  }
  }
  
  // Check '?' for dayOfMonth (treated as match all)
  if (!matchesDayOfMonth && dayOfMonthField === "?") {
    matchesDayOfMonth = true;
  }

  let matchesDayOfWeek = possibleDaysOfWeek.includes(now.getDay());

  // Check '#'
  if (!matchesDayOfWeek && dayOfWeekField.includes("#")) {
     matchesDayOfWeek = matchesNthWeekday(now, dayOfWeekField);
  }
  
  // Check 'L' for dayOfWeek
  if (!matchesDayOfWeek && dayOfWeekField.includes("L")) {
    if (dayOfWeekField.endsWith("L")) {
      matchesDayOfWeek = matchesLastWeekday(now, dayOfWeekField);
    }
  }

  // Check '?' for dayOfWeek (treated as match all)
  if (!matchesDayOfWeek && dayOfWeekField === "?") {
    matchesDayOfWeek = true;
  }

  const isDayOfWeekSpecified = dayOfWeekField !== "*" && dayOfWeekField !== "?";
  const isDayOfMonthSpecified = dayOfMonthField !== "*" && dayOfMonthField !== "?";

  let matchesDay;
  if (isDayOfWeekSpecified && isDayOfMonthSpecified) {
    matchesDay = matchesDayOfMonth || matchesDayOfWeek;
  } else {
    matchesDay = matchesDayOfMonth && matchesDayOfWeek;
  }

  return matchesMinute && matchesHour && matchesDay && matchesMonth;
};

const minuteMs = 60000;
const validTime = (value: unknown): value is string => typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export const validateBlackoutWindows = (windows: unknown): string | null => {
  if (windows === undefined)
    return null;
  if (!Array.isArray(windows))
    return "禁止上线时段格式无效";
  for (const window of windows) {
    if (!window || !Number.isInteger(window.weekday) || window.weekday < 0 || window.weekday > 6
      || !validTime(window.start) || !validTime(window.end) || window.start === window.end) {
      return "请选择有效的星期、开始和结束时间，开始与结束时间不能相同";
    }
  }
  return null;
};

// 用真实日期构造每周时段，兼容跨午夜；相邻/重叠时段合并为一次禁止上线。
const blackoutRanges = (windows: WeeklyBlackout[] | undefined, around: Date) => {
  const ranges: { start: number; end: number }[] = [];
  if (!windows?.length)
    return ranges;
  for (let offset = -8; offset <= 8; offset++) {
    const day = new Date(around);
    day.setDate(day.getDate() + offset);
    for (const window of windows) {
      if (day.getDay() !== window.weekday)
        continue;
      const start = new Date(day);
      const end = new Date(day);
      const [startHour, startMinute] = window.start.split(":").map(Number);
      const [endHour, endMinute] = window.end.split(":").map(Number);
      start.setHours(startHour, startMinute, 0, 0);
      end.setHours(endHour, endMinute, 0, 0);
      if (end <= start)
        end.setDate(end.getDate() + 1);
      ranges.push({ start: start.getTime(), end: end.getTime() });
    }
  }
  const merged: typeof ranges = [];
  for (const range of ranges.sort((a, b) => a.start - b.start)) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end)
      last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
};

export const isInTaskBlackout = (task: Pick<CronTask, "blackoutWindows">, date = new Date()) => {
  if (validateBlackoutWindows(task.blackoutWindows))
    return true;
  const timestamp = date.getTime();
  return blackoutRanges(task.blackoutWindows, date).some((range) => timestamp >= range.start && timestamp < range.end);
};

const avoidBlackout = (task: CronTask, plannedAt: Date) => {
  let timestamp = plannedAt.getTime();
  let blockedUntil = timestamp;
  // 若提前后的时间仍在另一个禁用时段内，继续提前；不在全周禁用配置上无限回退。
  for (let attempts = 0; attempts < 32; attempts++) {
    const range = blackoutRanges(task.blackoutWindows, new Date(timestamp))
      .find((range) => timestamp >= range.start && timestamp < range.end);
    if (!range)
      return { executeAt: new Date(timestamp), blockedUntil };
    blockedUntil = Math.max(blockedUntil, range.end);
    timestamp = range.start - 5 * minuteMs;
    if (plannedAt.getTime() - timestamp > 8 * 86400000)
      return null;
  }
  return null;
};

export const calculateNextScheduledRun = (task: CronTask, after = new Date()): { plannedAt: Date; executeAt: Date } | null => {
  if (validateBlackoutWindows(task.blackoutWindows))
    return null;
  let cursor = new Date(after);
  for (let attempts = 0; attempts < 32; attempts++) {
    const plannedAt = calculateNextPlannedTime(task, cursor);
    if (!plannedAt)
      return null;
    const adjusted = avoidBlackout(task, plannedAt);
    if (!adjusted)
      return null;
    if (adjusted.executeAt <= after) {
      // 提前时间已错过，不能在原定时间补跑；直接跳过整个禁用时段。
      cursor = new Date(Math.max(plannedAt.getTime(), adjusted.blockedUntil - 1));
      continue;
    }
    let next = { plannedAt, executeAt: adjusted.executeAt };
    // 时段内的后续计划可能提前到当前首个计划之前，例如 19:58 和 20:05。
    for (const range of blackoutRanges(task.blackoutWindows, plannedAt)) {
      const shifted = avoidBlackout(task, new Date(range.start));
      if (!shifted || shifted.executeAt <= after || shifted.executeAt >= next.executeAt)
        continue;
      const upcoming = calculateNextPlannedTime(task, new Date(range.start - 1));
      if (upcoming && upcoming.getTime() < range.end)
        next = { plannedAt: upcoming, executeAt: shifted.executeAt };
    }
    return next;
  }
  return null;
};

export const calculateNextExecutionTime = (task: CronTask, now = new Date()): Date | null =>
  calculateNextScheduledRun(task, now)?.executeAt ?? null;

export const matchesScheduledTask = (task: CronTask, now = new Date()) => {
  if (isInTaskBlackout(task, now))
    return false;
  const minute = Math.floor(now.getTime() / minuteMs) * minuteMs;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (task.runType === "daily" && time === task.runTime)
    return true;
  if (task.runType === "cron" && task.cronExpression && matchesCronExpression(task.cronExpression, now))
    return true;
  if (task.runType === "interval") {
    const interval = Number(task.intervalMinutes) * minuteMs;
    const elapsed = minute - Math.floor(Number(task.intervalAnchor) / minuteMs) * minuteMs;
    if (Number(task.intervalAnchor) > 0 && Number.isInteger(task.intervalMinutes) && interval >= minuteMs && elapsed >= interval && elapsed % interval === 0)
      return true;
  }
  return blackoutRanges(task.blackoutWindows, now).some((range) => {
    const adjusted = avoidBlackout(task, new Date(range.start));
    if (adjusted?.executeAt.getTime() !== minute)
      return false;
    const planned = calculateNextPlannedTime(task, new Date(range.start - 1));
    return Boolean(planned && planned.getTime() < range.end);
  });
};
