import assert from "node:assert/strict";
import test from "node:test";
import { createLatestRequestController } from "../src/utils/latestRequest.js";

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

test("latest request controller coalesces identical active requests", async () => {
  const loadingChanges = [];
  const pending = deferred();
  let calls = 0;
  const controller = createLatestRequestController((loading) => {
    loadingChanges.push(loading);
  });

  const first = controller.run("role-1:2026/09/05", async () => {
    calls += 1;
    return pending.promise;
  });
  const second = controller.run("role-1:2026/09/05", async () => {
    calls += 1;
  });

  assert.equal(first, second);
  pending.resolve("done");
  assert.equal(await first, "done");
  assert.equal(calls, 1);
  assert.deepEqual(loadingChanges, [true, false]);
});

test("an older request cannot finish the latest request loading state", async () => {
  const loadingChanges = [];
  const firstPending = deferred();
  const secondPending = deferred();
  const controller = createLatestRequestController((loading) => {
    loadingChanges.push(loading);
  });

  const first = controller.run("role-1", async (isCurrent) => {
    await firstPending.promise;
    return isCurrent();
  });
  const second = controller.run("role-2", async (isCurrent) => {
    await secondPending.promise;
    return isCurrent();
  });

  firstPending.resolve();
  assert.equal(await first, false);
  assert.deepEqual(loadingChanges, [true, true]);

  secondPending.resolve();
  assert.equal(await second, true);
  assert.deepEqual(loadingChanges, [true, true, false]);
});

test("latest request controller clears loading after failure or cancellation", async () => {
  const loadingChanges = [];
  const controller = createLatestRequestController((loading) => {
    loadingChanges.push(loading);
  });

  await assert.rejects(
    controller.run("failed", async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
  controller.run("cancelled", () => new Promise(() => {}));
  controller.cancel();

  assert.deepEqual(loadingChanges, [true, false, true, false]);
});
