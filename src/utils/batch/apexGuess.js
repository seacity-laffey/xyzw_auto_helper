export function resolveApexScheduleId(guessClaimMap, fallbackScheduleId = 46) {
  const activeScheduleId = Object.keys(guessClaimMap || {}).find(
    (key) => Object.keys(guessClaimMap[key] || {}).length === 0,
  );
  return activeScheduleId || String(fallbackScheduleId);
}

export function selectApexGuessTeam(group, guessedTeamIds = new Set()) {
  const [team0, team1] = group || [];
  if (!team0 || !team1)
    return null;

  const team0Guessed = guessedTeamIds.has(team0.teamId);
  const team1Guessed = guessedTeamIds.has(team1.teamId);
  if (team0Guessed && team1Guessed)
    return null;
  if (team0Guessed)
    return team1;
  if (team1Guessed)
    return team0;
  return (team0.cheerCnt ?? 0) >= (team1.cheerCnt ?? 0) ? team0 : team1;
}
