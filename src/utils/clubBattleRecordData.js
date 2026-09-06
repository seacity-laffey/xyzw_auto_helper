const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const topThree = (records, compare) => [...records].sort(compare).slice(0, 3);

export function getClubBattleReviveCount(record) {
  if (
    record?.computedReviveCnt !== undefined
    && record?.computedReviveCnt !== null
  ) {
    return Math.max(numberValue(record.computedReviveCnt), 0);
  }
  return Math.max(numberValue(record?.loseCnt) - 6, 0);
}

export function createClubBattleRecordSummary(records) {
  const roleDetails = Array.isArray(records) ? records : [];
  const totalKills = roleDetails.reduce(
    (total, member) => total + numberValue(member?.winCnt),
    0,
  );
  const totalDeaths = roleDetails.reduce(
    (total, member) => total + numberValue(member?.loseCnt),
    0,
  );
  const totalBuilding = roleDetails.reduce(
    (total, member) => total + numberValue(member?.buildingCnt),
    0,
  );
  const totalRevives = roleDetails.reduce(
    (total, member) => total + getClubBattleReviveCount(member),
    0,
  );
  const killRank = topThree(
    roleDetails,
    (left, right) => numberValue(right?.winCnt) - numberValue(left?.winCnt),
  );
  const occupyRank = topThree(
    roleDetails,
    (left, right) =>
      numberValue(right?.buildingCnt) - numberValue(left?.buildingCnt),
  );
  const deathRank = topThree(
    roleDetails,
    (left, right) => numberValue(right?.loseCnt) - numberValue(left?.loseCnt),
  );
  const kdRank = topThree(
    roleDetails.map((member) => ({
      ...member,
      kd: numberValue(member?.loseCnt)
        ? (numberValue(member?.winCnt) / numberValue(member?.loseCnt)).toFixed(2)
        : "0.00",
    })),
    (left, right) => Number(right.kd) - Number(left.kd),
  );
  const reviveRank = topThree(
    roleDetails.map((member) => ({
      ...member,
      reviveCnt: getClubBattleReviveCount(member),
    })),
    (left, right) => right.reviveCnt - left.reviveCnt,
  );
  const survivalRank = topThree(
    roleDetails.filter(
      (member) =>
        numberValue(member?.winCnt) > 0
        || numberValue(member?.buildingCnt) > 0,
    ),
    (left, right) => numberValue(left?.loseCnt) - numberValue(right?.loseCnt),
  ).map((member) => ({
    ...member,
    survivalCnt: numberValue(member?.loseCnt),
  }));
  const totalAttempts = totalKills + totalDeaths;

  return {
    avgKills: roleDetails.length
      ? (totalKills / roleDetails.length).toFixed(1)
      : 0,
    deathRank,
    kdRank,
    killRank,
    maxDeaths: Math.max(0, ...roleDetails.map((member) => numberValue(member?.loseCnt))),
    maxKills: Math.max(0, ...roleDetails.map((member) => numberValue(member?.winCnt))),
    maxOccupies: Math.max(
      0,
      ...roleDetails.map((member) => numberValue(member?.buildingCnt)),
    ),
    mvpPlayer: killRank[0] || null,
    occupyRank,
    reviveRank,
    survivalRank,
    totalBuilding,
    totalDeaths,
    totalKD: totalDeaths ? (totalKills / totalDeaths).toFixed(2) : 0,
    totalKills,
    totalRevives,
    totalWinRate: totalAttempts
      ? ((totalKills / totalAttempts) * 100).toFixed(1)
      : "0.0",
  };
}

export function getBattleRecordPercent(value, maximum) {
  const max = numberValue(maximum);
  if (!max)
    return 0;
  return Math.max(0, Math.min(100, (numberValue(value) / max) * 100));
}

export function getBattleRecordHeatColor(metric, value) {
  const amount = numberValue(value);
  const thresholds = {
    building: [
      [100, "rgba(255, 204, 128, 0.3)"],
      [50, "rgba(255, 224, 178, 0.3)"],
    ],
    death: [
      [20, "rgba(239, 154, 154, 0.3)"],
      [10, "rgba(255, 205, 210, 0.3)"],
    ],
    kill: [
      [50, "rgba(76, 175, 80, 0.3)"],
      [20, "rgba(139, 195, 74, 0.3)"],
    ],
    revive: [[5, "rgba(200, 230, 201, 0.3)"]],
  };

  return thresholds[metric]?.find(([minimum]) => amount >= minimum)?.[1]
    || "transparent";
}
