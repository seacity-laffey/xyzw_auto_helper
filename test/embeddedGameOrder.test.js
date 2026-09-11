import assert from "node:assert/strict";
import test from "node:test";
import { getGameWindowKey, reconcileGameWindowOrder, orderEmbeddedGameIds, saveEmbeddedGameOrder, moveEmbeddedGameId } from "../src/utils/embeddedGameOrder.js";

const account = (id, serverId = 3136, name = id) => ({ id, name, serverId, server: "3109服" });
const tokens = ["a", "b", "c", "d"].map(id => account(id));
const keys = records => records.map(getGameWindowKey);

test("window identity combines displayed nickname and real server ID without delimiter collisions", () => {
  assert.equal(getGameWindowKey(account("id", "003136", "昵称-0-123")), getGameWindowKey(account("new-id", 3136, "昵称")));
  assert.notEqual(getGameWindowKey(account("a", 3136, "同名")), getGameWindowKey(account("b", 1003136, "同名")));
  assert.notEqual(getGameWindowKey(account("a", "b:c", "a")), getGameWindowKey(account("b", "c", "a:b")));
  assert.notEqual(getGameWindowKey({ id: "a", name: "同名" }), getGameWindowKey({ id: "b", name: "同名" }));
});

test("deletion prunes its position, new accounts and deleted-then-readded accounts append", () => {
  let order = reconcileGameWindowOrder([], tokens);
  const withoutB = tokens.filter(token => token.id !== "b");
  order = reconcileGameWindowOrder(order, withoutB, tokens);
  assert.deepEqual(orderEmbeddedGameIds(["d", "b", "a", "c"], withoutB, order), ["a", "c", "d"]);
  const after = [...withoutB, account("e"), account("new-b", 3136, "b")];
  order = reconcileGameWindowOrder(order, after, withoutB);
  assert.deepEqual(orderEmbeddedGameIds(["new-b", "e", "d", "c", "a"], after, order), ["a", "c", "d", "e", "new-b"]);
});

test("saved visible order survives reload while unopened accounts retain their relative positions", () => {
  const order = saveEmbeddedGameOrder(keys(tokens), ["d", "b"], tokens);
  assert.deepEqual(orderEmbeddedGameIds(["a", "b", "c", "d"], tokens, JSON.parse(JSON.stringify(order))), ["a", "d", "c", "b"]);
  assert.deepEqual(orderEmbeddedGameIds(["b", "d"], tokens, order), ["d", "b"]);
});

test("metadata enrichment and token refresh preserve position, corrupt preferences recover", () => {
  const old = [{ id: "a", name: "a", server: "3109服" }, ...tokens.slice(1)];
  const saved = keys([old[2], old[0], old[1], old[3]]);
  const enriched = reconcileGameWindowOrder(saved, tokens, old);
  assert.deepEqual(orderEmbeddedGameIds(["a", "b", "c", "d"], tokens, enriched), ["c", "a", "b", "d"]);
  const refreshed = tokens.map(token => token.id === "a" ? { ...token, id: "fresh-a" } : token);
  assert.deepEqual(orderEmbeddedGameIds(["b", "fresh-a", "c", "d"], refreshed, reconcileGameWindowOrder(enriched, refreshed, tokens)), ["c", "fresh-a", "b", "d"]);
  for (const invalid of [null, {}, "bad", [null, 1, "missing"]]) assert.deepEqual(reconcileGameWindowOrder(invalid, tokens), keys(tokens));
});

test("draft moves neither mutate the input nor persist anything until saved", () => {
  const original = ["a", "b", "c", "d"];
  assert.deepEqual(moveEmbeddedGameId(original, "a", "d"), ["b", "c", "d", "a"]);
  assert.deepEqual(moveEmbeddedGameId(original, "d", "b"), ["a", "d", "b", "c"]);
  assert.deepEqual(moveEmbeddedGameId(original, "missing", "a"), original);
  assert.deepEqual(original, ["a", "b", "c", "d"]);
});
