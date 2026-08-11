import assert from "node:assert/strict";
import { test } from "node:test";

import { getRoleTokenMetadataUpdates } from "../src/utils/roleTokenMetadata.js";

test("fills a missing token name from role info", () => {
  assert.deepEqual(
    getRoleTokenMetadataUpdates(
      { name: "", server: "" },
      { role: { name: "  游戏角色  ", serverName: "一区" } },
    ),
    { name: "游戏角色", server: "一区" },
  );
});

test("preserves a user-defined token name", () => {
  assert.deepEqual(
    getRoleTokenMetadataUpdates(
      { name: "自定义名称", server: "一区" },
      { role: { name: "游戏角色", serverName: "一区" } },
    ),
    {},
  );
});

test("ignores empty role metadata", () => {
  assert.deepEqual(
    getRoleTokenMetadataUpdates({ name: "", server: "" }, { role: {} }),
    {},
  );
});
