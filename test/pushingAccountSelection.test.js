import assert from "node:assert/strict";
import test from "node:test";
import { ref } from "vue";
import { usePushingAccountSelection } from "../src/composables/usePushingAccountSelection.js";

test("filters accounts and keeps visible selection operations scoped", () => {
  const tokens = ref([
    { id: "late", name: "Beta", server: "2服", createdAt: 2 },
    { id: "early", name: "Alpha", server: "1服", createdAt: 1 },
  ]);
  const selectedTokenIds = ref([]);
  const selection = usePushingAccountSelection({
    getConnectionStatus: (id) => id === "early" ? "connected" : "disconnected",
    selectedTokenIds,
    tokenGroups: ref([]),
    tokens,
  });

  assert.deepEqual(selection.filteredTokens.value.map((token) => token.id), ["early", "late"]);
  assert.equal(selection.filteredTokens.value[0].statusClass, "status-green");

  selection.searchKeyword.value = "alpha";
  selection.toggleAllVisible(true);
  assert.deepEqual(selectedTokenIds.value, ["early"]);
  selection.toggleAllVisible(false);
  assert.deepEqual(selectedTokenIds.value, []);
});

test("group toggles add and remove only valid account ids", () => {
  const selectedTokenIds = ref(["manual"]);
  const selection = usePushingAccountSelection({
    getConnectionStatus: () => "disconnected",
    selectedTokenIds,
    tokenGroups: ref([{ id: "group", tokenIds: ["member", "missing"] }]),
    tokens: ref([{ id: "manual" }, { id: "member" }]),
  });

  selection.toggleGroup("group");
  assert.deepEqual(selectedTokenIds.value, ["manual", "member"]);
  selection.toggleGroup("group");
  assert.deepEqual(selectedTokenIds.value, ["manual"]);
});
