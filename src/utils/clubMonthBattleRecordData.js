import { createClubBattleRecordSummary } from "./clubBattleRecordData.js";

const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

export function getCurrentMonthBattleDates(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const saturdays = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month, day);
    if (date.getDay() === 6)
      saturdays.push(date);
  }

  const battleDates = saturdays.slice(0, 4);
  if (saturdays.length >= 4) {
    const finalSunday = new Date(saturdays[3]);
    finalSunday.setDate(finalSunday.getDate() + 1);
    battleDates.push(finalSunday);
  }

  const today = formatDate(now);
  return battleDates.map(formatDate).filter((date) => date <= today);
}

export function formatClubBattleMonth(now = new Date()) {
  return `${now.getFullYear()}年${now.getMonth() + 1}月`;
}

export function formatClubBattleShortDate(date) {
  return String(date || "").split("/").slice(1).join("/");
}

export function getClubMonthDailyStat(member, date, field) {
  return numberValue(member?.dailyRecords?.[date]?.[field]);
}

export async function loadClubMonthBattleRecords(
  dates,
  loadDate,
  isCurrentRequest = () => true,
) {
  const records = {};
  for (const date of dates) {
    if (!isCurrentRequest())
      return null;
    const result = await loadDate(date);
    if (!isCurrentRequest())
      return null;
    if (result)
      records[date] = result;
  }
  return records;
}

export function createClubMonthBattleSummary(recordsByDate) {
  const memberMap = new Map();
  const entries = recordsByDate && typeof recordsByDate === "object"
    ? Object.entries(recordsByDate)
    : [];

  for (const [recordDate, dailyRecord] of entries) {
    const date = dailyRecord?.date || recordDate;
    const records = Array.isArray(dailyRecord?.roleDetailsList)
      ? dailyRecord.roleDetailsList
      : [];

    for (const record of records) {
      const roleId = record?.roleId;
      if (roleId === undefined || roleId === null)
        continue;

      const member = memberMap.get(roleId) || {
        dailyRecords: {},
        headImg: record.headImg,
        name: record.name,
        roleId,
        totalBuildingCnt: 0,
        totalLoseCnt: 0,
        totalResurrection: 0,
        totalWinCnt: 0,
      };

      member.name = record.name || member.name;
      member.headImg = record.headImg || member.headImg;
      member.totalWinCnt += numberValue(record.winCnt);
      member.totalLoseCnt += numberValue(record.loseCnt);
      member.totalBuildingCnt += numberValue(record.buildingCnt);
      member.totalResurrection += Math.max(numberValue(record.loseCnt) - 6, 0);
      member.dailyRecords[date] = record;
      memberMap.set(roleId, member);
    }
  }

  const members = [...memberMap.values()].sort(
    (left, right) => right.totalWinCnt - left.totalWinCnt,
  );
  const reportRecords = members.map((member) => ({
    ...member,
    buildingCnt: member.totalBuildingCnt,
    computedReviveCnt: member.totalResurrection,
    loseCnt: member.totalLoseCnt,
    winCnt: member.totalWinCnt,
  }));
  const reportStats = createClubBattleRecordSummary(reportRecords);

  return {
    members,
    reportRecords,
    stats: {
      ...reportStats,
      totalMembers: members.length,
      totalResurrection: reportStats.totalRevives,
    },
  };
}
