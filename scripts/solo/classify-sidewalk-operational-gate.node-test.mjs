import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import {
  assertOperationalGateClassification,
  classifySidewalkOperationalGate,
  persistOperationalGateClassification,
} from "./classify-sidewalk-operational-gate.mjs";

const inventory = {
  flagKeyPresent: true,
  flagTargetsProduction: true,
  databaseUrlKeyPresent: true,
  databaseUrlTargetsProduction: true,
  publicSupabaseUrlPresent: true,
  serviceRoleKeyPresent: true,
};
const diagnostic = {
  formatVersion: 1,
  flag: "disabled",
  databaseUrl: "present",
  database: "reachable",
  ledger: "exact",
  operationalState: "FLAG_DISABLED",
};

test("operational gate classification selects only one cause from sanitized evidence", () => {
  const scenarios = [
    [
      { ...inventory, databaseUrlKeyPresent: false },
      diagnostic,
      "PRODUCTION_DATABASE_URL_KEY_MISSING",
    ],
    [
      { ...inventory, databaseUrlTargetsProduction: false },
      diagnostic,
      "PRODUCTION_DATABASE_URL_WRONG_TARGET",
    ],
    [
      inventory,
      { ...diagnostic, database: "unreachable" },
      "RUNTIME_DATABASE_CONNECTION_FAILED",
    ],
    [
      inventory,
      { ...diagnostic, ledger: "missing" },
      "RUNTIME_LEDGER_ROW_MISSING",
    ],
    [
      inventory,
      { ...diagnostic, ledger: "mismatch" },
      "RUNTIME_LEDGER_MISMATCH",
    ],
    [inventory, diagnostic, "FLAG_DEPLOYMENT_BINDING_NOT_CONFIRMED"],
  ];
  for (const [env, runtime, expected] of scenarios) {
    const classification = classifySidewalkOperationalGate({
      inventory: env,
      diagnostic: runtime,
    });
    assert.equal(classification, expected);
    assert.equal(assertOperationalGateClassification(classification), expected);
  }
});

test("missing or extra diagnostic evidence never becomes a green classification", () => {
  assert.equal(
    classifySidewalkOperationalGate({
      inventory,
      diagnostic: { ...diagnostic, url: "forbidden" },
    }),
    "INSUFFICIENT_EVIDENCE",
  );
  assert.equal(
    classifySidewalkOperationalGate({ inventory: {}, diagnostic }),
    "INSUFFICIENT_EVIDENCE",
  );
  assert.throws(
    () => assertOperationalGateClassification("DEPLOYMENT_FLAG_NOT_VISIBLE"),
    /CLASSIFICATION_INVALID/,
  );
});

test("classification persistence writes only the one allowed result", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "comun-gate-classification-"),
  );
  const output = path.join(directory, ".ci-artifacts", "classification.json");
  await persistOperationalGateClassification(
    output,
    "PRODUCTION_DATABASE_URL_KEY_MISSING",
  );
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), {
    classification: "PRODUCTION_DATABASE_URL_KEY_MISSING",
  });
});
