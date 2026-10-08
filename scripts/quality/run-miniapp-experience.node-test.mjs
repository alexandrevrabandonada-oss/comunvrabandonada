import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

function invoke({ baseUrl, code = "0", signal, error = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "comun-miniapp-runner-"));
  try {
    const capture = join(directory, "capture.json");
    const preload = join(directory, "spawn-fixture.mjs");
    writeFileSync(
      preload,
      `
      import childProcess from 'node:child_process';
      import { syncBuiltinESMExports } from 'node:module';
      import { EventEmitter } from 'node:events';
      import { writeFileSync } from 'node:fs';
      childProcess.spawn = (command, args, options) => {
        writeFileSync(process.env.MINIAPP_CAPTURE, JSON.stringify({
          command, args, baseUrl: options.env.COMUN_BASE_URL,
          siteUrl: options.env.NEXT_PUBLIC_SITE_URL,
          distDir: options.env.COMUN_NEXT_DIST_DIR,
        }));
        const child = new EventEmitter();
        process.nextTick(() => {
          if (process.env.MINIAPP_ERROR === 'true') child.emit('error', new Error('fixture'));
          else child.emit('exit', Number(process.env.MINIAPP_EXIT), process.env.MINIAPP_SIGNAL || null);
        });
        return child;
      };
      syncBuiltinESMExports();
    `,
    );
    const env = {
      ...process.env,
      MINIAPP_CAPTURE: capture,
      MINIAPP_EXIT: code,
    };
    delete env.COMUN_BASE_URL;
    delete env.MINIAPP_SIGNAL;
    delete env.MINIAPP_ERROR;
    if (baseUrl) env.COMUN_BASE_URL = baseUrl;
    if (signal) env.MINIAPP_SIGNAL = signal;
    if (error) env.MINIAPP_ERROR = "true";
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        preload,
        resolve("scripts/quality/run-miniapp-experience.mjs"),
        "--project=mobile-360",
        "--grep",
        "jornada",
      ],
      { env, encoding: "utf8" },
    );
    return {
      status: result.status,
      stderr: result.stderr,
      capture: JSON.parse(readFileSync(capture, "utf8")),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("actual runner chooses an isolated default and preserves Playwright arguments", () => {
  const result = invoke();
  assert.equal(result.status, 0);
  assert.equal(result.capture.command, process.execPath);
  assert.equal(result.capture.baseUrl, "http://127.0.0.1:3048");
  assert.equal(result.capture.siteUrl, result.capture.baseUrl);
  assert.equal(result.capture.distDir, ".next-miniapp-experience");
  assert.deepEqual(result.capture.args, [
    "scripts/comun-local-env.mjs",
    "run",
    "playwright",
    "test",
    "-c",
    "playwright.miniapp-experience.config.ts",
    "--project=mobile-360",
    "--grep",
    "jornada",
  ]);
});

test("explicit local URL retains its port and separate build", () => {
  const result = invoke({ baseUrl: "http://localhost:3051" });
  assert.equal(result.capture.baseUrl, "http://localhost:3051");
  assert.equal(result.capture.siteUrl, result.capture.baseUrl);
  assert.equal(result.capture.distDir, ".next-miniapp-experience");
});

test("subprocess failure, termination and startup error never become success", () => {
  assert.equal(invoke({ code: "7" }).status, 7);
  assert.equal(invoke({ signal: "SIGTERM" }).status, 1);
  const failed = invoke({ error: true });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /COMUN_MINIAPP_TEST_RUNNER_FAILED/);
});
