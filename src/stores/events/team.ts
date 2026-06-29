import { gameLogger } from "@/utils/logger";
import type { EVM, XyzwSession } from ".";
import type { GameResponseBody } from "@/types/gameProtocol";

export const TeamPlugin = ({
  onSome,
}: EVM) => {

  onSome(
    [
      "team_getteaminfo",
      "team_getteaminforesp",
      "role_gettargetteam",
      "role_gettargetteamresp",
    ],
    (data: XyzwSession) => {
      gameLogger.verbose(`收到队伍信息事件: ${data.tokenId}`, data);
      const { body, gameData } = data;
      const teamBody = body as GameResponseBody;
      if (!body) {
        gameLogger.debug("队伍信息响应为空");
        return;
      }
      // 更新队伍数据
      if (!gameData.value.presetTeam) {
        gameData.value.presetTeam = {};
      }
      gameData.value.presetTeam = { ...gameData.value.presetTeam, ...teamBody };
      data.gameData.value.lastUpdated = new Date().toISOString();
    },
  );

  onSome(
    [
      "presetteam_setteam",
      "presetteam_setteamresp",
      "presetteam_saveteam",
      "presetteam_saveteamresp",
    ],
    (data: XyzwSession) => {
      gameLogger.verbose(`收到队伍信息事件: ${data.tokenId}`, data);
      const { body, gameData } = data;
      const teamBody = body as GameResponseBody;
      if (!body) {
        gameLogger.debug("队伍信息响应为空");
        return;
      }
      // 更新队伍数据
      if (!gameData.value.presetTeam) {
        gameData.value.presetTeam = {};
      }
      const presetTeam = gameData.value.presetTeam;
      // 设置/保存队伍响应 - 可能只返回确认信息
      if (teamBody.presetTeamInfo) {
        presetTeam.presetTeamInfo = teamBody.presetTeamInfo;
      }
      // 合并其他队伍相关数据
      Object.keys(teamBody).forEach((key) => {
        if (key.includes("team") || key.includes("Team")) {
          presetTeam[key] = teamBody[key];
        }
      });
    },
  );

}
