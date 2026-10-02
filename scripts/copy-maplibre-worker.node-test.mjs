import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("worker público preserva o módulo compartilhado da versão instalada", () => {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "comun-maplibre-assets-"),
  );
  try {
    execFileSync(
      process.execPath,
      [fileURLToPath(new URL("./copy-maplibre-worker.mjs", import.meta.url))],
      { cwd: directory },
    );
    const dist = path.join(
      path.dirname(
        createRequire(import.meta.url).resolve("maplibre-gl/package.json"),
      ),
      "dist",
    );
    const output = path.join(directory, "public", "maplibre");
    const worker = readFileSync(
      path.join(output, "maplibre-gl-worker.mjs"),
      "utf8",
    );
    assert.match(worker, /["']\.\/maplibre-gl-shared\.mjs["']/);
    for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
      assert.deepEqual(
        readFileSync(path.join(output, name)),
        readFileSync(path.join(dist, name)),
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
