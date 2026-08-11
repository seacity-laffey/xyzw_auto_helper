import type { EVM, XyzwSession } from ".";
import { gameLogger } from "@/utils/logger";
import { useTokenStore } from "../tokenStore";
import type { RoleResponseBody } from "@/types/gameProtocol";
import { getRoleTokenMetadataUpdates } from "@/utils/roleTokenMetadata";

// 处理加钟/时钟相关事件，触发获取角色信息以更新状态
export const RolePlugin = ({
  onSome,
  $emit
}: EVM) => {

  onSome(["role_getroleinforesp", "role_getroleinfo"], (data: XyzwSession) => {
    gameLogger.verbose(`收到角色信息事件: ${data.tokenId}`, data);
    const { body, tokenId } = data;
    const roleBody = body as RoleResponseBody;
    data.gameData.value.roleInfo = body;
    data.gameData.value.lastUpdated = new Date().toISOString();
    if (roleBody.role?.study?.maxCorrectNum !== undefined) {
      $emit.emit("I-study", data);
    }

    // 从角色信息中补齐本地缺失的名称，并同步服务器信息。
    const tokenStore = useTokenStore();
    const token = tokenStore.gameTokens.find((t) => t.id === tokenId);
    if (token) {
      const updates = getRoleTokenMetadataUpdates(token, roleBody);
      if (Object.keys(updates).length > 0) {
        tokenStore.updateToken(tokenId, updates);
        gameLogger.verbose(`已更新Token ${tokenId} 的角色信息`, updates);
      }
    }
  });
}
