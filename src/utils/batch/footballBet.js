export const SALT_CUP_PICK_OPTIONS = Object.freeze([
  { label: "主胜", value: 1 },
  { label: "平局", value: 2 },
  { label: "客胜", value: 3 },
]);

export const normalizeSaltCupPick = (value) => {
  const pick = Number(value);
  return pick === 1 || pick === 2 || pick === 3 ? pick : 3;
};

export const getSaltCupPickLabel = (value) => {
  const pick = normalizeSaltCupPick(value);
  return (
    SALT_CUP_PICK_OPTIONS.find((option) => option.value === pick)?.label ||
    "客胜"
  );
};

export const getPendingSaltCupMatchIds = (response) => {
  const betRecord = response?.roleData?.betRecord;
  if (!betRecord || typeof betRecord !== "object") {
    return [];
  }

  const scheduleIds = Object.keys(betRecord);
  const latestScheduleId = scheduleIds.at(-1);
  if (!latestScheduleId) {
    return [];
  }

  const scheduleBets = betRecord[latestScheduleId];
  if (!scheduleBets || typeof scheduleBets !== "object") {
    return [];
  }

  return Object.entries(scheduleBets)
    .filter(([, bet]) => Number(bet?.pick) === 0)
    .map(([matchId]) => matchId);
};
