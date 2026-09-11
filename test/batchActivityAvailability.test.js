import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);
const { useBatchActivityAvailability } = await jiti.import("../src/composables/useBatchActivityAvailability.ts");

test("manual refresh updates cached activity state across Friday noon and the next cycle", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-11T11:59:59").getTime() });
  const availability = useBatchActivityAvailability();
  assert.equal(availability.weirdTowerActivityOpen.value, false);
  t.mock.timers.setTime(new Date("2026-09-11T12:00:00").getTime());
  assert.equal(availability.weirdTowerActivityOpen.value, false);
  availability.refreshActivityAvailability();
  assert.equal(availability.weirdTowerActivityOpen.value, true);
  t.mock.timers.setTime(new Date("2026-09-18T12:00:00").getTime());
  assert.equal(availability.weirdTowerActivityOpen.value, true);
  availability.refreshActivityAvailability();
  assert.equal(availability.weirdTowerActivityOpen.value, false);
});
