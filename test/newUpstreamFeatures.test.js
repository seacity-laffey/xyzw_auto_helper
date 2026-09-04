import assert from "node:assert/strict";
import { test } from "node:test";

import {
  resolveApexScheduleId,
  selectApexGuessTeam,
} from "../src/utils/batch/apexGuess.js";
import { getPendingEvoTowerRewardCount } from "../src/utils/evoTowerRewards.js";
import {
  buildEmbeddedGameLocation,
  buildEmbeddedGameSource,
  normalizeEmbeddedGameIds,
} from "../src/utils/embeddedGameRoute.js";
import {
  findPreparedEmbeddedGameBin,
  resolveEmbeddedGameBinData,
} from "../src/utils/embeddedGameStorage.js";
import {
  createProtocolObserverExport,
  decodeProtocolObserverEntry,
} from "../src/utils/protocolObserver.js";
import {
  aggregateClubBattleRecordStats,
  buildClubBattleExportRows,
  getClubBattleDayKey,
  getClubBattleTargetIds,
  getTodayClubBattleStats,
} from "../src/utils/clubDailyBattle.js";

test("apex schedule selection prefers the active empty claim map", () => {
  assert.equal(resolveApexScheduleId({ 45: { reward: true }, 46: {} }), "46");
  assert.equal(resolveApexScheduleId({}, 47), "47");
});

test("apex team selection skips completed pairs and favors cheer count", () => {
  const teams = [
    { teamId: "a", cheerCnt: 10 },
    { teamId: "b", cheerCnt: 20 },
  ];

  assert.equal(selectApexGuessTeam(teams)?.teamId, "b");
  assert.equal(selectApexGuessTeam(teams, new Set(["b"]))?.teamId, "a");
  assert.equal(selectApexGuessTeam(teams, new Set(["a", "b"])), null);
});

test("pending evo tower rewards are derived from cleared and claimed chapters", () => {
  assert.equal(
    getPendingEvoTowerRewardCount({ towerId: 240, rewardTowerId: 22 }),
    2,
  );
  assert.equal(
    getPendingEvoTowerRewardCount({ towerId: 240, rewardTowerId: 24 }),
    0,
  );
  assert.equal(getPendingEvoTowerRewardCount({ towerId: 0 }), 0);
});

test("embedded game ids support repeated and comma-separated route values", () => {
  assert.deepEqual(
    normalizeEmbeddedGameIds(["role-1,role-2", "role-1", null]),
    ["role-1", "role-2"],
  );
  assert.deepEqual(normalizeEmbeddedGameIds(undefined, "fallback"), [
    "fallback",
  ]);
});

test("embedded game routes pin each iframe to its token id", () => {
  assert.equal(
    buildEmbeddedGameSource("/helper", "role 1"),
    "/helper/game/index.html?bin_id=role%201",
  );
  assert.deepEqual(buildEmbeddedGameLocation(["a", "b", "a"], "batch"), {
    path: "/game",
    query: { bin_id: ["a", "b"], from: "batch" },
  });
});

test("embedded game bin lookup supports legacy name keys", async () => {
  const expected = new Uint8Array([1, 2, 3]).buffer;
  const requestedKeys = [];
  const resolved = await resolveEmbeddedGameBinData(
    { id: "role-id", name: "role-name" },
    async (key) => {
      requestedKeys.push(key);
      return key === "role-name" ? expected : null;
    },
    { storage: null },
  );

  assert.equal(resolved, expected);
  assert.deepEqual(requestedKeys, ["role-id", "role-name"]);
});

test("embedded game bin lookup reuses data imported by the game loader", async () => {
  const values = new Map([
    ["bin_file_list", JSON.stringify([{ id: "game-bin", name: "角色一" }])],
    ["bin_data_game-bin", "706c0102"],
  ]);
  const storage = { getItem: (key) => values.get(key) || null };
  const buffer = findPreparedEmbeddedGameBin(
    { id: "token-id", name: "角色一" },
    storage,
  );

  assert.deepEqual([...new Uint8Array(buffer)], [112, 108, 1, 2]);
});

test("embedded game bin lookup matches game-loader data by token id", () => {
  const values = new Map([
    [
      "bin_file_list",
      JSON.stringify([{ id: "generated-id", name: "file.bin" }]),
    ],
    ["bin_data_generated-id", "010203"],
  ]);
  const storage = { getItem: (key) => values.get(key) || null };
  const buffer = findPreparedEmbeddedGameBin(
    { id: "expected-id", name: "自定义名称" },
    storage,
    (candidate) =>
      [...new Uint8Array(candidate)].join(",") === "1,2,3"
        ? "expected-id"
        : "other-id",
  );

  assert.deepEqual([...new Uint8Array(buffer)], [1, 2, 3]);
});

test("protocol observer decodes complete websocket binary messages", () => {
  const shortEntry = decodeProtocolObserverEntry(
    {
      id: "message-1",
      transport: "ws",
      payload: { kind: "binary", byteLength: 3, base64: "AQID" },
    },
    () => {
      throw new Error("short packets must not be parsed");
    },
  );
  assert.equal(shortEntry.decoded, undefined);

  const decoded = decodeProtocolObserverEntry(
    {
      id: "message-2",
      transport: "ws",
      payload: { kind: "binary", byteLength: 5, base64: "AQIDBAU=" },
    },
    (buffer) => ({
      cmd: "activity_get",
      seq: 7,
      ack: 6,
      code: 0,
      rawData: { actId: 42, bytes: new Uint8Array(buffer).subarray(0, 2) },
    }),
  );

  assert.deepEqual(decoded.decoded, {
    cmd: "activity_get",
    seq: 7,
    ack: 6,
    code: 0,
    error: undefined,
    time: undefined,
    body: { actId: 42, bytes: [1, 2] },
  });
});

test("protocol observer export includes capture metadata and JSON-safe values", () => {
  const startedAt = new Date("2026-09-03T01:00:00.000Z");
  const endedAt = new Date("2026-09-03T01:01:00.000Z");
  const exported = createProtocolObserverExport(
    [{ id: "message-1", value: 12n }],
    startedAt,
    endedAt,
  );

  assert.deepEqual(exported, {
    schemaVersion: 1,
    generatedAt: endedAt.toISOString(),
    capture: {
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      entryCount: 1,
    },
    entries: [{ id: "message-1", value: "12" }],
  });
});

test("club battle stats only use the current Shanghai calendar day", () => {
  const response = {
    club: { dayScore: 114 },
    siege: {
      score: 12,
      attackMap: {
        260902: { attackCnt: 8, aSuccessCnt: 7 },
        260903: { attackCnt: 3, aSuccessCnt: 2 },
      },
    },
  };

  assert.deepEqual(
    getTodayClubBattleStats(response, new Date("2026-09-03T06:00:00.000Z")),
    {
      dayKey: "260903",
      attackCount: 3,
      successCount: 2,
      successRate: 67,
      personalScore: 12,
      clubDayScore: 114,
    },
  );
});

test("club battle day rolls over using Shanghai time", () => {
  assert.equal(
    getClubBattleDayKey(new Date("2026-09-02T15:59:59.000Z")),
    "260902",
  );
  assert.equal(
    getClubBattleDayKey(new Date("2026-09-02T16:00:00.000Z")),
    "260903",
  );
});

test("club battle export keeps every member and marks unavailable counts", () => {
  const response = {
    club: {
      members: {
        1: { roleId: 101, name: "Alpha" },
        2: { roleId: 102, name: "Beta" },
      },
    },
  };
  const statsByRoleId = new Map([["101", { successCount: 3, attackCount: 4 }]]);

  assert.deepEqual(buildClubBattleExportRows(response, statsByRoleId), [
    {
      roleId: "101",
      name: "Alpha",
      headImg: "",
      successCount: 3,
      attackCount: 4,
      available: true,
    },
    {
      roleId: "102",
      name: "Beta",
      headImg: "",
      successCount: null,
      attackCount: null,
      available: false,
    },
  ]);
});

test("club battle target ids only include points with battle history", () => {
  const response = {
    club: {
      oppoMap: {
        2: {
          defenders: {
            1: { roleId: 201, challengeCnt: 0, failCnt: 0, defeated: false },
            2: { roleId: 202, challengeCnt: 3, failCnt: 1, defeated: false },
          },
        },
        3: {
          defenders: {
            1: { roleId: 203, challengeCnt: 0, failCnt: 0, defeated: true },
            2: { roleId: 202, challengeCnt: 2, failCnt: 0, defeated: false },
          },
        },
      },
    },
  };

  assert.deepEqual(getClubBattleTargetIds(response), ["202", "203"]);
});

test("club battle records sum attacker wins across multiple target points", () => {
  const currentDay = Math.floor(new Date("2026-09-03T06:00:00.000Z").getTime() / 1000);
  const previousDay = Math.floor(new Date("2026-09-02T06:00:00.000Z").getTime() / 1000);
  const stats = aggregateClubBattleRecordStats(
    [
      {
        targetId: 201,
        records: [
          { roleId: 101, isWin: false, created: currentDay, recordName: "b" },
          { roleId: 101, isWin: false, created: currentDay, recordName: "a" },
          { roleId: 102, isWin: true, created: previousDay, recordName: "old" },
        ],
      },
      {
        targetId: 202,
        records: [
          { roleId: 101, isWin: false, created: currentDay, recordName: "c" },
          { roleId: 101, isWin: true, created: currentDay, recordName: "d" },
          { roleId: 102, isWin: false, created: currentDay, recordName: "e" },
        ],
      },
    ],
    new Date("2026-09-03T10:00:00.000Z"),
  );

  assert.deepEqual(Object.fromEntries(stats), {
    101: { successCount: 3, attackCount: 4 },
    102: { successCount: 1, attackCount: 1 },
  });
});
