import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateClubAverageRedQuench,
  countClubRanksByAlliance,
  createEmptyClubRankEntry,
  createRedQuenchRankMap,
  filterAndSortClubRanks,
  groupClubRankRows,
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

test("club rank detail loading limits club concurrency and preserves order", async () => {
  let activeRequests = 0;
  let maxActiveRequests = 0;
  const clubs = Array.from({ length: 6 }, (_, index) => ({ id: index + 1 }));

  const result = await loadClubWarRankDetails(clubs, {
    concurrency: 2,
    fetchClubDetail: async (clubId) => {
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await Promise.resolve();
      await Promise.resolve();
      activeRequests -= 1;
      return {
        legionData: {
          announcement: `联盟${clubId}`,
          members: {},
          power: clubId * 100,
          quenchNum: clubId,
        },
      };
    },
    fetchRoleInfo: async () => ({}),
    getHeroInfo: () => ({ heroList: [] }),
    getLineupType: () => "其他",
  });

  assert.equal(maxActiveRequests, 2);
  assert.deepEqual(result.map(club => club.id), clubs.map(club => club.id));
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

test("club rank view filtering preserves all sort modes", () => {
  const clubs = [
    { id: 1, alliance: "A", announcement: "A", redQuench: 5, sRScore: 2 },
    { id: 2, alliance: "B", announcement: "B", redQuench: 8, sRScore: 9 },
    { id: 3, alliance: "A", announcement: "A", redQuench: 2, sRScore: 5 },
  ];
  const options = {
    activeAlliance: "A",
    currentSortType: "redQuench",
    editingSortOrder: [],
    getMemberAlliance: (club) => club.alliance,
    getMemberRank: (club) => ({ 1: 2, 2: 3, 3: 1 })[club.id],
    isEditMode: false,
  };

  assert.deepEqual(
    filterAndSortClubRanks(clubs, options).map((club) => club.id),
    [1, 3],
  );
  assert.deepEqual(
    filterAndSortClubRanks(clubs, {
      ...options,
      activeAlliance: "all",
      currentSortType: "score",
    }).map((club) => club.id),
    [2, 3, 1],
  );
  assert.deepEqual(
    filterAndSortClubRanks(clubs, {
      ...options,
      activeAlliance: "all",
      editingSortOrder: [3, 1, 2],
      isEditMode: true,
    }).map((club) => club.id),
    [3, 1, 2],
  );
});

test("club rank view handles blank alliances and grouped summary rows", () => {
  const clubs = [
    { id: 1, alliance: "B", announcement: "B", redQuench: 6 },
    { id: 2, alliance: "A", announcement: "A", redQuench: 5 },
    { id: 3, alliance: "B", announcement: "B", redQuench: 2 },
    { id: 4, alliance: "空白", announcement: 0, redQuench: 7 },
  ];
  const getMemberAlliance = (club) => club.alliance;
  const blank = filterAndSortClubRanks(clubs, {
    activeAlliance: "空白",
    currentSortType: "redQuench",
    editingSortOrder: [],
    getMemberAlliance,
    getMemberRank: () => 0,
    isEditMode: false,
  });
  const rows = groupClubRankRows(clubs.slice(0, 3), {
    allianceOrder: ["A", "B"],
    getMemberAlliance,
  });

  assert.deepEqual(blank.map((club) => club.id), [4]);
  assert.deepEqual(rows.map((row) => row.id), ["group-A", 2, "group-B", 1, 3]);
  assert.equal(rows[0].avgRedQuench, 5);
  assert.equal(rows[2].avgRedQuench, 4);
});

test("club rank summaries calculate ranks, alliance counts, and fixed-slot average", () => {
  const clubs = [
    { id: "low", alliance: "A", announcement: "A", redQuench: 4 },
    { id: "high", alliance: "B", announcement: "B", redQuench: 9 },
    { id: "blank", alliance: "空白", announcement: "0", redQuench: 7 },
  ];

  assert.deepEqual(createRedQuenchRankMap(clubs), {
    high: 1,
    blank: 2,
    low: 3,
  });
  assert.deepEqual(
    countClubRanksByAlliance(
      clubs,
      ["A", "B", "空白"],
      (club) => club.alliance,
    ),
    { A: 1, B: 1, 空白: 1 },
  );
  assert.equal(calculateClubAverageRedQuench(clubs), 1);
  assert.equal(calculateClubAverageRedQuench(clubs, 2), 10);
});
