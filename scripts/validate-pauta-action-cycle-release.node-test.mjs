import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PAUTA_ACTION_CYCLE_RELEASE_MANIFEST,
  validatePautaActionCycleRelease,
} from "./validate-pauta-action-cycle-release.mjs";

test("release fixa exatamente as quatro migrations e seus checksums", async () => {
  const result = await validatePautaActionCycleRelease();
  assert.deepEqual(result, {
    release: "20260730122000-comun-pauta-action-cycle",
    migrationCount: 4,
    expectedObjects: 11,
    expectedRlsObjects: 11,
  });
});

test("manifesto não contém conexão, token ou credencial", async () => {
  const manifest = await readFile(PAUTA_ACTION_CYCLE_RELEASE_MANIFEST, "utf8");
  assert.doesNotMatch(
    manifest,
    /postgres(?:ql)?:\/\/|token|password|authorization|service_role|eyJ/i,
  );
});
