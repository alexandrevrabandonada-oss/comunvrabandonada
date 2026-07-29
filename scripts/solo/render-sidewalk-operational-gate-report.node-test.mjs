import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertSanitizedOperationalGateReport,
  createOperationalGateReport,
  writeOperationalGateReport,
} from "./render-sidewalk-operational-gate-report.mjs";

const inventory = {
  flagKeyPresent: true,
  flagTargetsProduction: true,
  databaseUrlKeyPresent: false,
  databaseUrlTargetsProduction: false,
  publicSupabaseUrlPresent: true,
  serviceRoleKeyPresent: true,
};
const diagnostic = {
  formatVersion: 1,
  flag: "disabled",
  databaseUrl: "missing",
  database: "not_tested",
  ledger: "not_tested",
  operationalState: "FLAG_DISABLED",
};

test("operational gate package records only the classified read-only evidence", async () => {
  const report = createOperationalGateReport({
    mainSha: "a".repeat(40),
    inventory,
    diagnostic,
  });
  assert.equal(report.classification, "PRODUCTION_DATABASE_URL_KEY_MISSING");
  assert.deepEqual(report.requiredNextChange, [
    "CONFIGURAR_COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL_EM_PRODUCTION",
    "MANTER_COMUN_SIDEWALK_OPERATIONAL_V2_DISABLED",
  ]);
  assert.equal(report.attempt03, "not_created");
  assert.equal(report.artifactType, "legacy_sidewalk_operational_gate");
  assert.equal(report.evidenceScope, "historical_pre_activation");
  assert.equal(report.databaseWrites, "none");
  assert.equal(report.storageWrites, "none");

  const directory = await mkdtemp(path.join(tmpdir(), "comun-gate-report-"));
  await writeOperationalGateReport({ outputDirectory: directory, report });
  const output = path.join(
    directory,
    "reports",
    "current",
    "comun-tijolo-45-3l-operational-gate-package.json",
  );
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), report);
});

test("operational gate package rejects secret-shaped content", () => {
  assert.throws(
    () =>
      assertSanitizedOperationalGateReport({
        value: "postgresql://never-allowed",
      }),
    /REPORT_SENSITIVE/,
  );
});
