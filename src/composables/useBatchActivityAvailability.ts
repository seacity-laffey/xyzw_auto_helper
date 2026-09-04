import { computed } from "vue";

export const useBatchActivityAvailability = () => {
  const dreamActivityOpen = computed(() => {
    const day = new Date().getDay();
    return day === 0 || day === 1 || day === 3 || day === 4;
  });

  const arenaActivityOpen = computed(() => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 22;
  });

  const currentActivityWeek = computed(() => {
    const now = new Date();
    const start = new Date("2025-12-12T12:00:00");
    const weekDuration = 7 * 24 * 60 * 60 * 1000;
    const elapsed = now.getTime() - start.getTime();
    if (elapsed < 0)
      return null;

    const cyclePosition = elapsed % (3 * weekDuration);
    if (cyclePosition < weekDuration)
      return "黑市周";
    if (cyclePosition < 2 * weekDuration)
      return "招募周";
    return "宝箱周";
  });

  const weirdTowerActivityOpen = computed(() => {
    if (currentActivityWeek.value !== "黑市周")
      return false;
    const now = new Date();
    return now.getDay() !== 5 || now.getHours() >= 12;
  });

  const fourthSundayOfCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    let firstSundayDate = 1 + ((7 - firstDayOfWeek) % 7);

    // The March 2026 event calendar treated March 8 as the first event Sunday.
    if (year === 2026 && month === 2 && firstDayOfWeek === 0) {
      firstSundayDate = 8;
    }
    return new Date(year, month, firstSundayDate + 21);
  };

  const warGuessActivityOpen = computed(() => {
    const now = new Date();
    const beforeCutoff
      = now.getHours() < 19
        || (now.getHours() === 19 && now.getMinutes() <= 55);

    if (
      now.getFullYear() === 2026
      && now.getMonth() === 2
      && now.getDate() === 1
    ) {
      return beforeCutoff;
    }

    const fourthSunday = fourthSundayOfCurrentMonth();
    return now.getDate() === fourthSunday.getDate() && beforeCutoff;
  });

  const warGuessActivityTip = computed(() => {
    if (warGuessActivityOpen.value)
      return "";
    const fourthSunday = fourthSundayOfCurrentMonth();
    return `月赛助威仅在每月第四个周日 (${fourthSunday.getMonth() + 1}月${fourthSunday.getDate()}日) 00:00-19:55 开放`;
  });

  return {
    arenaActivityOpen,
    dreamActivityOpen,
    warGuessActivityOpen,
    warGuessActivityTip,
    weirdTowerActivityOpen,
  };
};
