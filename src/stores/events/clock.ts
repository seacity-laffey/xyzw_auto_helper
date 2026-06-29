import type { EVM, XyzwSession } from ".";
import type { RoleResponseBody } from "@/types/gameProtocol";

export const ClockPlugin = ({ onSome }: EVM) => {
  onSome(
    ["system_claimhangupreward", "system_claimhanguprewardresp"],
    async (data: XyzwSession) => {
      const { client } = data;
      client?.debounceSend("role_getroleinfo", {});
    },
  );

  onSome(["syncresp", "system_mysharecallback"], async (data: XyzwSession) => {
    const { client, body } = data;
    const roleBody = body as RoleResponseBody;
    if (roleBody?.role?.battleTeam || roleBody?.role?.heroes || roleBody?.role?.custom) {
      return;
    }
    client?.debounceSend("role_getroleinfo", {});
  });
};
