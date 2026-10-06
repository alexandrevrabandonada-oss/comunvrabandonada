import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const runner = resolve("scripts/quality/run-comun-quality-performance.mjs");

for (const distDir of [".next", ".next-performance-test"]) {
  test(`performance build removes stale development types in ${distDir}`, (t) => {
    const root = mkdtempSync(join(tmpdir(), "comun-performance-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, distDir, "dev/types"), { recursive: true });
    mkdirSync(join(root, distDir, "types"), { recursive: true });
    mkdirSync(join(root, "bin"));
    writeFileSync(
      join(root, distDir, "dev/types/validator.ts"),
      "export type Broken = ;",
    );
    writeFileSync(
      join(root, distDir, "types/validator.ts"),
      "production route types",
    );
    for (const command of ["npm", "npx"]) {
      writeFileSync(
        join(root, "bin", command),
        `#!/usr/bin/env node
const fs = require("node:fs");
const dist = process.env.COMUN_NEXT_DIST_DIR || ".next";
if (fs.existsSync(dist + "/dev/types/validator.ts")) process.exit(7);
if (!fs.existsSync(dist + "/types/validator.ts")) process.exit(8);
fs.appendFileSync("commands", ${JSON.stringify(command)} + "\\n");
if (${JSON.stringify(command)} === "npm" && process.env.FAIL_BUILD === "1") process.exit(9);
`,
        { mode: 0o755 },
      );
    }
    const env = {
      ...process.env,
      PATH: join(root, "bin") + ":" + process.env.PATH,
      COMUN_NEXT_DIST_DIR: distDir,
    };
    const result = spawnSync(process.execPath, [runner], {
      cwd: root,
      env,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(join(root, "commands"), "utf8"), "npm\nnpx\n");
    assert.equal(existsSync(join(root, distDir, "dev")), false);
    rmSync(join(root, "commands"));
    const failure = spawnSync(process.execPath, [runner], {
      cwd: root,
      env: { ...env, FAIL_BUILD: "1" },
      encoding: "utf8",
    });
    assert.notEqual(failure.status, 0);
    assert.equal(
      readFileSync(join(root, "commands"), "utf8"),
      "npm\n",
      "failed build must prevent performance measurement",
    );
  });
}

test("rejects unsafe output paths before deleting artifacts or running commands", (t) => {
  const root = mkdtempSync(join(tmpdir(), "comun-performance-path-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "keep/dev"), { recursive: true });
  writeFileSync(join(root, "keep/dev/proof"), "retain");
  for (const distDir of ["keep", "../keep", ".next-../keep", "/tmp/keep"]) {
    const result = spawnSync(process.execPath, [runner], {
      cwd: root,
      env: { ...process.env, COMUN_NEXT_DIST_DIR: distDir },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /diretório .next-/);
    assert.equal(readFileSync(join(root, "keep/dev/proof"), "utf8"), "retain");
  }
});
