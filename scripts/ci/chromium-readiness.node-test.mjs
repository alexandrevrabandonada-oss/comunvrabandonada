import assert from "node:assert/strict";
import test from "node:test";
import { probeChromiumReadiness } from "./chromium-readiness.mjs";

function fakeChromium({ launchError, navigationError, state = "complete" } = {}) {
  const calls = [];
  const browser = {
    newPage: async () => ({
      goto: async (url) => {
        calls.push(["goto", url]);
        if (navigationError) throw navigationError;
      },
      evaluate: async () => state,
    }),
    close: async () => {
      calls.push(["close"]);
    },
  };
  return {
    calls,
    launch: async (options) => {
      calls.push(["launch", options]);
      if (launchError) throw launchError;
      return browser;
    },
  };
}

test("proves readiness only after actually launching Chromium", async () => {
  const chromium = fakeChromium();
  assert.equal(await probeChromiumReadiness(chromium), true);
  assert.deepEqual(chromium.calls, [
    ["launch", { headless: true, timeout: 30_000 }],
    ["goto", "about:blank"],
    ["close"],
  ]);
});

test("cache presence cannot turn a failed launch into success", async () => {
  const chromium = fakeChromium({ launchError: new Error("missing library") });
  assert.equal(await probeChromiumReadiness(chromium), false);
});

test("fails closed on failed navigation and releases the browser", async () => {
  const chromium = fakeChromium({ navigationError: new Error("failure") });
  assert.equal(await probeChromiumReadiness(chromium), false);
  assert.deepEqual(chromium.calls.at(-1), ["close"]);
});

test("does not accept an incomplete page as browser readiness", async () => {
  const chromium = fakeChromium({ state: "loading" });
  assert.equal(await probeChromiumReadiness(chromium), false);
  assert.deepEqual(chromium.calls.at(-1), ["close"]);
});
