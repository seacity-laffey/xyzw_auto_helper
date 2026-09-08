import assert from "node:assert/strict";
import test from "node:test";
import { resolveOriginalResponseCommands } from "../src/utils/webSocketResponse.js";

test("club battle detail responses match their request command", () => {
  assert.deepEqual(
    resolveOriginalResponseCommands("legionwar_getdetailsresp"),
    ["legionwar_getdetails"],
  );
  assert.deepEqual(
    resolveOriginalResponseCommands("LEGIONWAR_GETDETAILSRESP"),
    ["legionwar_getdetails"],
  );
});

test("black market config responses match their request commands", () => {
  assert.deepEqual(resolveOriginalResponseCommands("store_getpurchaseresp"), [
    "store_getpurchase",
  ]);
  assert.deepEqual(resolveOriginalResponseCommands("store_setpurchaseresp"), [
    "store_setpurchase",
  ]);
});

test("reward status responses match their read commands", () => {
  assert.deepEqual(resolveOriginalResponseCommands("discount_getdiscountinforesp"), [
    "discount_getdiscountinfo",
  ]);
  assert.deepEqual(resolveOriginalResponseCommands("mail_getlistresp"), [
    "mail_getlist",
  ]);
});

test("explicit response mappings keep priority over suffix fallback", () => {
  const commandMap = {
    syncresp: ["first_command", "second_command"],
    store_buyresp: "store_purchase",
  };

  assert.deepEqual(
    resolveOriginalResponseCommands("syncresp", commandMap),
    ["first_command", "second_command"],
  );
  assert.deepEqual(
    resolveOriginalResponseCommands("store_buyresp", commandMap),
    ["store_purchase"],
  );
});

test("other unmapped responses retain exact matching", () => {
  assert.deepEqual(resolveOriginalResponseCommands("heart_beat"), [
    "heart_beat",
  ]);
  assert.deepEqual(resolveOriginalResponseCommands("unknown_commandresp"), [
    "unknown_commandresp",
  ]);
});
