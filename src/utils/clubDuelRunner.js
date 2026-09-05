export const CLUB_DUEL_DELAY_MS = 500;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function countDefeatedHeroes(teamInfo) {
  if (!Array.isArray(teamInfo))
    return 0;

  return teamInfo.filter((hero) => Number(hero?.hp) === 0).length;
}

export function normalizeClubDuelBattle(result, formatPower) {
  const battleData = result?.battleData;
  if (!battleData)
    return null;

  const leftDieHero = countDefeatedHeroes(
    battleData.result?.sponsor?.teamInfo,
  );
  const rightDieHero = countDefeatedHeroes(
    battleData.result?.accept?.teamInfo,
  );

  return {
    isWin: battleData.result?.isWin || false,
    leftName: battleData.leftTeam?.name || "未知",
    leftheadImg: battleData.leftTeam?.headImg || "",
    leftpower: formatPower(battleData.leftTeam?.power || 0),
    leftDieHero,
    rightName: battleData.rightTeam?.name || "未知",
    rightheadImg: battleData.rightTeam?.headImg || "",
    rightpower: formatPower(battleData.rightTeam?.power || 0),
    rightDieHero,
  };
}

export async function runClubDuels({
  totalCount,
  targetId,
  requestFight,
  formatPower,
  delayMs = CLUB_DUEL_DELAY_MS,
  sleepFn = sleep,
  onAttempt,
  onInvalidResult,
  onProgress,
}) {
  let winCount = 0;
  let lossCount = 0;
  let ourDieHeroGameCount = 0;
  let enemyDieHeroGameCount = 0;
  const resultCount = [];

  for (let index = 0; index < totalCount; index += 1) {
    const attemptNumber = index + 1;
    onAttempt?.({ attemptNumber, totalCount });

    const result = await requestFight(targetId);
    const battleResult = normalizeClubDuelBattle(result, formatPower);

    if (battleResult) {
      resultCount.push(battleResult);
      if (battleResult.leftDieHero > 0)
        ourDieHeroGameCount += 1;
      if (battleResult.rightDieHero > 0)
        enemyDieHeroGameCount += 1;

      if (battleResult.isWin)
        winCount += 1;
      else
        lossCount += 1;
    } else {
      lossCount += 1;
      onInvalidResult?.({
        attemptNumber,
        message: result?.message || "未返回战斗数据",
      });
    }

    onProgress?.({
      completedCount: attemptNumber,
      remainingCount: totalCount - attemptNumber,
      totalCount,
      winCount,
      lossCount,
      percentage: Math.round((attemptNumber / totalCount) * 100),
    });

    if (battleResult && delayMs > 0 && index < totalCount - 1) {
      await sleepFn(delayMs);
    }
  }

  return {
    totalCount,
    winCount,
    lossCount,
    winRate: Math.round((winCount / totalCount) * 100),
    ourDieRate: Math.round((ourDieHeroGameCount / totalCount) * 100),
    enemyDieRate: Math.round((enemyDieHeroGameCount / totalCount) * 100),
    ourDieHeroGameCount,
    enemyDieHeroGameCount,
    resultCount,
  };
}
