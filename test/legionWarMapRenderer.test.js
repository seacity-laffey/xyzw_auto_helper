import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateLegionWarHexSize,
  getLegionWarHexCenter,
  getLegionWarTypeColor,
  getLegionWarTypeLabel,
} from "../src/utils/legionWarMapRenderer.js";

test("legion-war hex size stays within rendering bounds", () => {
  assert.equal(calculateLegionWarHexSize(200, 200), 12);
  assert.equal(calculateLegionWarHexSize(4000, 4000), 30);

  const fitted = calculateLegionWarHexSize(1200, 960);
  assert.ok(fitted >= 12 && fitted <= 30);
});

test("legion-war hex centers offset odd columns vertically", () => {
  const even = getLegionWarHexCenter(2, 3, 16);
  const odd = getLegionWarHexCenter(3, 3, 16);

  assert.equal(even.x, 70);
  assert.equal(odd.x, 97);
  assert.ok(odd.y > even.y);
  assert.ok(Math.abs(odd.y - even.y - Math.sqrt(3) * 8) < 1e-10);
});

test("legion-war node colors and labels preserve the map legend", () => {
  assert.equal(getLegionWarTypeColor(1), "#4477CE");
  assert.equal(getLegionWarTypeColor(6), "#000000");
  assert.equal(getLegionWarTypeColor(99), "#cccccc");
  assert.equal(getLegionWarTypeLabel(4), "本");
  assert.equal(getLegionWarTypeLabel(9), "");
});
