import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyClubRankEntry,
  loadClubWarRankDetails,
  sortClubRanksByDominantAlliance,
} from "../src/utils/clubWarRankData.js";

test("club rank detail loading keeps member requests sequential and selects the top three", async () => {
  const calls = [];
  let activeRequests = 0;
  let maxActiveRequests = 0;
  const result = await loadClubWarRankDetails(
    [{ id: 10, name: "测试俱乐部" }],
    {
      fetchClubDetail: async () => ({
        legionData: {
          announcement: "梦盟",
          power: 900,
          quenchNum: 30,
          members: {
            1: { name: "一", custom: { red_quench_cnt: 1 } },
            2: { name: "二", custom: { red_quench_cnt: 4 } },
            3: { name: "三", custom: { red_quench_cnt: 3 } },
            4: { name: "四", custom: { red_quench_cnt: 2 } },
          },
        },
      }),
      fetchRoleInfo: async (roleId) => {
        activeRequests += 1;
        maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
        calls.push(roleId);
        await Promise.resolve();
        activeRequests -= 1;
        return { roleInfo: { power: Number(roleId) * 100, heroes: {} } };
      },
      getHeroInfo: () => ({ heroList: [] }),
      getLineupType: () => "其他",
    },
  );

  assert.deepEqual(calls, ["1", "2", "3", "4"]);
  assert.equal(maxActiveRequests, 1);
  assert.deepEqual(result[0].topHeroes.map(hero => hero.id), ["2", "3", "4"]);
  assert.deepEqual([result[0].redno1, result[0].redno2, result[0].redno3], ["4红", "3红", "2红"]);
});

test("club rank detail loading falls back when detail requests fail", async () => {
  const errors = [];
  const [result] = await loadClubWarRankDetails([{ id: 20, sRScore: -1 }], {
    fetchClubDetail: async () => { throw new Error("offline"); },
    fetchRoleInfo: async () => ({}),
    getHeroInfo: () => ({ heroList: [] }),
    getLineupType: () => "其他",
    onClubError: club => errors.push(club.id),
  });

  assert.deepEqual(result, createEmptyClubRankEntry({ id: 20, sRScore: -1 }));
  assert.deepEqual(errors, [20]);
});

test("club ranks put the largest alliance first and sort each group by red count", () => {
  const result = sortClubRanksByDominantAlliance(
    [
      { id: 1, announcement: "B", redQuench: 3 },
      { id: 2, announcement: "A", redQuench: 1 },
      { id: 3, announcement: "B", redQuench: 8 },
      { id: 4, announcement: "C", redQuench: 9 },
    ],
    value => value,
  );

  assert.deepEqual(result.map(club => club.id), [3, 1, 2, 4]);
  assert.deepEqual(result.map(club => club.alliance), ["B", "B", "A", "C"]);
});
