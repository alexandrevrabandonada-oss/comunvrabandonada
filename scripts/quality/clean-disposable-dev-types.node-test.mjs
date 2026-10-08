import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { cleanDisposableDevTypes } from "./clean-disposable-dev-types.mjs";

const compiler = fileURLToPath(
  new URL("../../node_modules/typescript/bin/tsc", import.meta.url),
);
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "comun-static-types-"));
  const write = (name, content) => {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  };
  write(
    "tsconfig.json",
    JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, types: [] },
      include: ["app.ts", ".next/**/*.ts", ".next-miniapp-experience/**/*.ts"],
    }),
  );
  write("app.ts", "export const application: number = 1;\n");
  write(".next/types/route.ts", "export const route: string = '/comun';\n");
  write(".next/dev/types/validator.ts", "export const stale = ;\n");
  write(
    ".next-miniapp-experience/dev/types/validator.ts",
    "export const stale = ;\n",
  );
  const check = () =>
    spawnSync(process.execPath, [compiler, "-p", join(root, "tsconfig.json")], {
      encoding: "utf8",
    });
  try {
    run({ root, write, check });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("actual TypeScript rejects stale dev validators and passes after retiring only dev output", () => {
  fixture(({ root, check }) => {
    const before = check();
    assert.notEqual(before.status, 0);
    assert.match(
      before.stdout,
      /\.next-miniapp-experience\/dev\/types\/validator/,
    );
    assert.match(before.stdout, /TS1109/);
    cleanDisposableDevTypes(root);
    cleanDisposableDevTypes(root);
    const after = check();
    assert.equal(after.status, 0, after.stdout + after.stderr);
  });
});

test("application type errors remain blocking after disposable dev cleanup", () => {
  fixture(({ root, write, check }) => {
    write("app.ts", "export const application: number = 'invalid';\n");
    cleanDisposableDevTypes(root);
    const result = check();
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /app\.ts.*TS2322/);
  });
});

test("production route type errors remain blocking after disposable dev cleanup", () => {
  fixture(({ root, write, check }) => {
    write(".next/types/route.ts", "export const route: number = '/comun';\n");
    cleanDisposableDevTypes(root);
    const result = check();
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /\.next\/types\/route\.ts.*TS2322/);
  });
});
