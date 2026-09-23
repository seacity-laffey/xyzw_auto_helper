import { APEX_TAOTAI_STAGES, apexSupportLevels } from "./apexStageMap.js";
import {
  ApexScheduleStatus,
  ApexStage,
  ApexStageType,
  getDateZeroTime,
  getRoundSchedules,
  getStageName,
  thisWeekStart,
  WEEK_MS,
} from "./apexScheduleData.js";
import { getScheduleStatus, getStageInfoByRound } from "./apexStages.js";

/**
 * 助威是否开放（等价客户端 checkSupportInTime）。
 *
 * 规则：
 *   1) 该期必须处于淘汰赛段窗口内，或处于正式赛段窗口内且正式赛段未结束；
 *   2) 该期最近一场非 None 状态的场次不得为 Locked / Fighting；
 *   3) 若最近场次为 Completed，则本周（周一起）之后必须还有该期的场次，否则本期已结束。
 *
 * @param {number} round
 * @param {number} season
 * @param {number} nowMs
 * @returns {boolean} 助威开放为 true
 */
export function checkSupportInTime(round, season, nowMs) {
  const list = getRoundSchedules(round, season);
  if (!list.length)
    return false;

  const stageInfo = getStageInfoByRound(round, season, nowMs);
  const taotai = stageInfo[ApexStageType.TaoTai];
  if (taotai.isEnable) {
    if (taotai.isEnded)
      return false;
  } else {
    const zhengshi = stageInfo[ApexStageType.ZhengShi];
    if (!zhengshi.isEnable || zhengshi.isEnded)
      return false;
  }

  let lastStatus = ApexScheduleStatus.None;
  let lastIdx = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    const status = getScheduleStatus(list[i].id, nowMs);
    if (
      status === ApexScheduleStatus.Locked
      || status === ApexScheduleStatus.Fighting
    ) {
      return false;
    }
    if (status !== ApexScheduleStatus.None) {
      lastStatus = status;
      lastIdx = i;
      break;
    }
  }

  if (lastStatus === ApexScheduleStatus.Completed) {
    const weekStart = thisWeekStart(nowMs);
    const weekEnd = weekStart + WEEK_MS;
    const hasLaterThisWeek = list.some((conf, i) => {
      if (i <= lastIdx)
        return false;
      const dayZero = getDateZeroTime(conf.date);
      return (
        Number.isFinite(dayZero) && dayZero >= weekStart && dayZero < weekEnd
      );
    });
    if (!hasLaterThisWeek)
      return false;
  }
  return true;
}

/**
 * 竞猜页签列表（等价客户端 ApexGuessDialog._initTabs）。
 * 页签固定为 7 个淘汰赛阶段，scheduleId 取自该期配置；阶段缺配置则不出页签。
 * @param {number} round
 * @param {number} season
 * @param {number} nowMs
 * @returns {Array<{stage:number, scheduleId:number, title:string, state:number}>} 竞猜页签列表，按阶段升序；阶段缺配置时不出页签
 */
export function getGuessTabs(round, season, nowMs) {
  const list = getRoundSchedules(round, season);
  return APEX_TAOTAI_STAGES.flatMap((stage) => {
    const conf = list.find((c) => c.stage === stage);
    if (!conf)
      return [];
    return [
      {
        stage,
        scheduleId: conf.id,
        title: getStageName(stage),
        state: getScheduleStatus(conf.id, nowMs),
      },
    ];
  });
}

/**
 * 是否真的可以押注（等价客户端 ApexGuessDialog._onGuessTeam）：
 * 仅 None / Fighting / Completed 拦截，Unlocked 与 Locked（阵容已锁定、开赛前）
 * 均可押，押注截止于 fightTime。
 * @param {number} state
 * @returns {boolean} 该场次当前可以押注为 true
 */
export const canGuessNow = (state) =>
  state === ApexScheduleStatus.Unlocked || state === ApexScheduleStatus.Locked;

/**
 * 单场是否已不可押（在 canGuessNow 基础上叠加客户端 _renderVsItem 的决赛判定：
 * 决赛阶段任一方胜负已定即停止押注）。
 * @param {number} state 单场状态
 * @param {number} stage ApexStage
 * @param {{team1Win?:boolean, team2Win?:boolean}} row 对阵行
 * @returns {boolean} 该场次仍可押注为 true
 */
export const canGuessRow = (state, stage, row) =>
  canGuessNow(state)
  && !(stage === ApexStage.TAOTAI_2 && !!(row && (row.team1Win || row.team2Win)));

/**
 * 该阶段可押队伍数上限（等价客户端 getRiseRank + 竞猜红点判定）：
 * 取该阶段首条 advanceNum > 0 的配置（advanceNum = 晋级名额数 = 可押队伍数），
 * 季军赛恒为 1。
 * @param {number} round
 * @param {number} season
 * @param {number} stage
 * @returns {number} 0 表示该阶段不可竞猜
 */
export function getAdvanceNum(round, season, stage) {
  if (stage === ApexStage.TAOTAI_3)
    return 1;
  const conf = getRoundSchedules(round, season).find(
    (c) =>
      c.stage === stage && Number.isFinite(c.advanceNum) && c.advanceNum > 0,
  );
  return conf ? conf.advanceNum : 0;
}

/**
 * 助威等级（等价客户端 ApexUIUtil.setSupportLevelIcon）：
 * 从最高等级向下取第一个满足 cheerCnt >= supportNum 的等级；都不满足为 0。
 * @param {number} cheerCnt
 * @returns {number} 助威等级；未达到最低档时为 0
 */
export function getSupportLevel(cheerCnt) {
  for (let i = apexSupportLevels.length - 1; i >= 0; i--) {
    if (cheerCnt >= apexSupportLevels[i].supportNum)
      return apexSupportLevels[i].level;
  }
  return 0;
}

/**
 * 助威榜「全部」页分组号（逐行等价客户端 ApexUtil.getMyTeamVSGroupId 与 `|| 1` 的组合）。
 *
 * 客户端：
 *   getMyTeamVSGroupId(sid) { const g = apexRoleInfo.group.get(sid); return g != null ? g : 0 }
 *   currentTeamVsGroupId = getMyTeamVSGroupId(currentScheduleId) || 1
 *   ApexSupportDialog: this._groupId = apexScheduleData.currentTeamVsGroupId
 * 即：取「本期我在哪个分组」（1 基，随期变化）；无值或 0 时由 `|| 1` 落为 1。
 *
 * 说明：客户端另有合法性闸门 `0 < g && g <= teamMatchNum`
 * （ApexMatchPage._refreshTeamInfo），与本函数的下界判定一致；
 * 服务端该字段为数值型，此处的数值校验仅作合约保险，不改变合法输入的取值。
 *
 * 注：客户端还有一个「淘汰赛」页（sendGetTaotaiVoteList，groupId 恒传 0），
 * 本工具只呈现「全部」页，故不涉及该分支。
 *
 * @param {{[scheduleId:number|string]:number}|null|undefined} groupMap apexRoleInfo.group
 * @param {number} scheduleId 当前期的 scheduleId
 * @returns {number} 助威榜分组号（合法时原样返回，0 / 缺失 / NaN 时回退 1）
 */
export function getSupportGroupId(groupMap, scheduleId) {
  const raw = groupMap ? groupMap[String(scheduleId)] : undefined;
  // 对齐客户端 `g != null ? g : 0`：null / undefined 视为 0
  const mine = raw == null ? 0 : raw;
  // 对齐客户端 `0 || 1`：0 / NaN 一律回退 1
  return mine || 1;
}

/**
 * 取指定阶段在某期的 scheduleId（等价客户端 ApexScheduleData.getScheduleIdByStage）。
 * 客户端 currentScheduleId 即由此类查询得到，助威榜分组号依赖它。
 * @param {number} stage ApexStage
 * @param {number} round 期号
 * @param {number} season 赛季号
 * @returns {number} 该阶段的 scheduleId；缺失时返回 -1（与客户端一致）
 */
export function getScheduleIdByStage(stage, round, season) {
  const conf = getRoundSchedules(round, season).find((c) => c.stage === stage);
  return conf ? conf.id : -1;
}
