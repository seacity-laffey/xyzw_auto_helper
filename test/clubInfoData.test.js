import assert from "node:assert/strict";
import test from "node:test";
import {
  createClubOverview,
  findClubLeader,
  formatClubNumber,
  getClubJobLabel,
  parseClubApplications,
  sortClubMembers,
} from "../src/utils/clubInfoData.js";

test("club members sort by position, red quench, and power", () => {
  const members = sortClubMembers([
    { roleId: 1, job: 0, power: 900, custom: { red_quench_cnt: 5 } },
    { roleId: 2, job: 2, power: 100, custom: { red_quench_cnt: 1 } },
    { roleId: 3, job: 1, power: 50, custom: { red_quench_cnt: 0 } },
    { roleId: 4, job: 0, power: 100, custom: { red_quench_cnt: 5 } },
  ]);

  assert.deepEqual(members.map((member) => member.roleId), [3, 2, 1, 4]);
  assert.equal(findClubLeader(members, "3").roleId, 3);
  assert.equal(getClubJobLabel(2), "副会长");
});

test("club applications normalize every supported response shape", () => {
  const application = {
    roleId: 7,
    name: "甲",
    ext: { legion_apply_reason: "申请", server_id: 3100 },
  };

  assert.deepEqual(parseClubApplications({ roleList: [application] })[0], {
    ...application,
    applyReason: "申请",
    serverId: 3100,
  });
  assert.equal(parseClubApplications({ applyList: [application] }).length, 1);
  assert.equal(parseClubApplications({ list: [application] }).length, 1);
  assert.equal(parseClubApplications({ data: [application] }).length, 1);
  assert.equal(parseClubApplications([application]).length, 1);
  assert.deepEqual(parseClubApplications({ roleList: [{ name: "无 ID" }] }), []);
});

test("club overview reads fallback fields and missing bosses", () => {
  const overview = createClubOverview(
    {
      info: { currentBoss: { bossId: 9, currentHP: 12000 }, s_power: 50000 },
      statistics: { "red:quench": 6, lastWarRank: 3 },
    },
    { "lb:1": 1, "lb:150": 1 },
  );

  assert.equal(overview.power, 50000);
  assert.equal(overview.redQuench, 6);
  assert.equal(overview.currentHP, "1.20万");
  assert.equal(overview.currentBossId, 9);
  assert.equal(overview.lastWarRank, 3);
  assert.equal(overview.unfoughtBosses.length, 148);
  assert.equal(formatClubNumber(250000000), "2.50亿");
});
