import assert from "node:assert/strict";
import test from "node:test";
import { createClubWarRankColumns } from "../src/composables/createClubWarRankColumns.js";

function createFixture() {
  const manualRankings = { value: { 101: 3 } };
  const manualAlliances = { value: { 101: "梦盟" } };
  const selectedHeroes = [];
  const allianceOptions = [
    { label: "大联盟", value: "大联盟" },
    { label: "梦盟", value: "梦盟" },
  ];
  const columns = createClubWarRankColumns({
    InputNumber: "input",
    Select: "select",
    allianceOptions,
    formatPower: value => String(value),
    getAllianceTagClass: () => "alliance-tag",
    getLineupTagStyle: () => ({}),
    getMemberAlliance: row => manualAlliances.value[row.id],
    getMemberRank: row => manualRankings.value[row.id],
    handleHeroClick: hero => selectedHeroes.push(hero.id),
    handleRankBlur: () => {},
    handleRankFocus: () => {},
    isCurrentAccountClub: row => row.id === 101,
    isEditMode: { value: true },
    manualAlliances,
    manualRankings,
  });
  return { allianceOptions, columns, manualAlliances, manualRankings, selectedHeroes };
}

test("club war rank columns merge group rows across the table", () => {
  const { columns } = createFixture();
  const group = { __isGroupHeader: true };
  assert.equal(columns[0].colSpan(group), 9);
  assert.equal(columns[1].colSpan(group), 0);
  assert.equal(columns[0].colSpan({ id: 101 }), 1);
});

test("club war rank edit columns write rank and alliance changes back", () => {
  const { allianceOptions, columns, manualAlliances, manualRankings } = createFixture();
  const row = { id: 101 };

  const rankInput = columns.find(column => column.key === "rank").render(row);
  assert.equal(rankInput.props.value, 3);
  rankInput.props["onUpdate:value"](7);
  assert.equal(manualRankings.value[101], 7);

  const allianceSelect = columns.find(column => column.key === "alliance").render(row);
  assert.equal(allianceSelect.props.options, allianceOptions);
  allianceSelect.props["onUpdate:value"]("大联盟");
  assert.equal(manualAlliances.value[101], "大联盟");
});

test("club war rank hero column forwards hero clicks", () => {
  const { columns, selectedHeroes } = createFixture();
  const heroColumn = columns.find(column => column.key === "topHeroes");
  const cell = heroColumn.render({
    id: 101,
    topHeroes: [{
      id: 9001,
      name: "测试角色",
      power: 100,
      redQuench: 2,
      holyBeast: 1,
      lineupType: "其他",
    }],
  });

  cell.children[0].children[0].props.onClick();
  assert.deepEqual(selectedHeroes, [9001]);
});
