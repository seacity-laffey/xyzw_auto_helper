import assert from "node:assert/strict";
import test from "node:test";
import { useClubPlayerDuel } from "../src/composables/useClubPlayerDuel.js";

const createMessage = () => {
  const calls = [];
  return {
    calls,
    error: (text) => calls.push(["error", text]),
    info: (text) => calls.push(["info", text]),
    success: (text) => calls.push(["success", text]),
    warning: (text) => calls.push(["warning", text]),
  };
};

test("queries a player and runs a duel through the shared protocol", async () => {
  const commands = [];
  const tokenStore = {
    selectedToken: { id: "token-1" },
    getWebSocketStatus: () => "connected",
    sendMessageWithPromise: async (_tokenId, command) => {
      commands.push(command);
      if (command === "rank_getroleinfo") {
        return {
          roleInfo: {
            headImg: "avatar.png",
            heroes: {},
            name: "测试玩家",
            power: 12345,
          },
        };
      }
      return {
        battleData: {
          leftTeam: { name: "我方", power: 20000 },
          result: {
            accept: { teamInfo: [{ hp: 0 }] },
            isWin: true,
            sponsor: { teamInfo: [{ hp: "0" }] },
          },
          rightTeam: { name: "对手", power: 18000 },
        },
      };
    },
  };
  const message = createMessage();
  const duel = useClubPlayerDuel({
    tokenStore,
    message,
    fillPearls: () => ({}),
    formatPower: (value) => String(value),
    heroDict: {},
  });

  await duel.fetchTargetInfo(1001);
  await duel.handleDuel();

  assert.deepEqual(commands, ["rank_getroleinfo", "fight_startpvp"]);
  assert.equal(duel.playerInfo.value.name, "测试玩家");
  assert.equal(duel.showPlayerInfoModal.value, true);
  assert.equal(duel.fightResult.visible, true);
  assert.equal(duel.fightResult.winCount, 1);
  assert.equal(duel.dieStats.ourDieHeroGameCount, 1);
  assert.equal(duel.dieStats.enemyDieHeroGameCount, 1);
});

test("does not query while the websocket is disconnected", async () => {
  let requests = 0;
  const message = createMessage();
  const duel = useClubPlayerDuel({
    tokenStore: {
      selectedToken: { id: "token-1" },
      getWebSocketStatus: () => "disconnected",
      sendMessageWithPromise: async () => {
        requests += 1;
      },
    },
    message,
    fillPearls: () => ({}),
    formatPower: String,
    heroDict: {},
  });

  await duel.fetchTargetInfo(1001);

  assert.equal(requests, 0);
  assert.deepEqual(message.calls, [
    ["error", "WebSocket未连接，无法查询战绩"],
  ]);
});
