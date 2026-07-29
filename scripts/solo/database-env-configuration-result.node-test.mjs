import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertSanitizedDatabaseEnvArtifact,
  buildDatabaseUrlConfigurationAuthorization,
  createDatabaseEnvConfigurationResult,
  findSensitiveDatabaseEnvArtifactFindings,
  writeDatabaseEnvConfigurationArtifact,
} from "./database-env-configuration-result.mjs";

const mainSha = "4e404c3ab2ff1bcb0592c879f51e6fcbc1d9fa76";
const ledgerHash =
  "e36b508762b19da01afa91ff810c18c8d5d3a000c20618793eafc25c7a012793";
const projectId = "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X";
const attemptId = "sidewalk-db-env-20260729-01";

const state = (value) => ({ type: "state", value });
const marker = (value) => ({ type: "marker", value });

test("database URL configuration authorization binds the fixed project, SHA, ledger, and configuration attempt", () => {
  const authorization = buildDatabaseUrlConfigurationAuthorization({
    projectId,
    mainSha,
    ledgerHash,
    configurationAttemptId: attemptId,
  });
  assert.match(
    authorization,
    /^AUTORIZO_CONFIGURAR_CALCADAS_DATABASE_URL_prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X_4e404c3ab2ff1bcb0592c879f51e6fcbc1d9fa76_/,
  );
  assert.match(authorization, /_MANTER_FLAG_DISABLED$/);
  assert.notEqual(
    authorization,
    buildDatabaseUrlConfigurationAuthorization({
      projectId,
      mainSha,
      ledgerHash,
      configurationAttemptId: "sidewalk-db-env-20260729-02",
    }),
  );
  for (const invalid of [
    {
      projectId: "other",
      mainSha,
      ledgerHash,
      configurationAttemptId: attemptId,
    },
    {
      projectId,
      mainSha: "previous",
      ledgerHash,
      configurationAttemptId: attemptId,
    },
    {
      projectId,
      mainSha,
      ledgerHash,
      configurationAttemptId: "sidewalk-activate-20260729-01",
    },
  ]) {
    assert.throws(
      () => buildDatabaseUrlConfigurationAuthorization(invalid),
      /COMUN_DATABASE_ENV_(?:CONFIGURATION|RESULT)_/,
    );
  }
});

test("configuration result is green only after the database is reachable, the ledger is exact, and the public state remains paused", () => {
  const result = createDatabaseEnvConfigurationResult({
    events: [
      state("DATABASE_ENV_CONFIGURED"),
      state("DEPLOYMENT_READY"),
      state("DATABASE_REACHABLE"),
      state("LEDGER_EXACT"),
      state("FLAG_DISABLED_CONFIRMED"),
      state("PUBLIC_PAUSED_CONFIRMED"),
      state("CONFIGURATION_GREEN"),
    ],
    expectedMainSha: mainSha,
    runId: "30413297938",
    configurationAttemptId: attemptId,
    durationSeconds: 20,
  });
  assert.equal(
    result.terminalMarker,
    "COMUN_SIDEWALK_DATABASE_ENV_CONFIGURED_RUNTIME_GREEN_FLAG_DISABLED",
  );
  assert.equal(result.databaseWrites, "none");
  assert.equal(result.storageWrites, "none");
});

test("configuration failure reports rollback without exposing the authorization or a connection string", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "comun-db-env-"));
  const events = path.join(root, "events.txt");
  const output = path.join(root, "nested", "artifact");
  await writeFile(
    events,
    [
      "state=DATABASE_ENV_CONFIGURED",
      "marker=SOLO_DATABASE_ENV_PROTECTED_DIAGNOSTIC_FAILED",
      "state=ROLLBACK_ATTEMPTED",
      "state=ROLLBACK_VARIABLE_REMOVED",
      "state=PUBLIC_PAUSED_CONFIRMED",
      "",
    ].join("\n"),
    "utf8",
  );
  const result = await writeDatabaseEnvConfigurationArtifact({
    eventFile: events,
    outputDirectory: output,
    expectedMainSha: mainSha,
    runId: "30413297938",
    configurationAttemptId: attemptId,
    durationSeconds: 12,
  });
  assert.equal(result.rollbackAttempted, true);
  assert.equal(result.rollbackResult, "completed");
  assert.equal(
    result.terminalMarker,
    "COMUN_SIDEWALK_DATABASE_ENV_CONFIGURATION_FAILED_ROLLED_BACK",
  );
  const artifact = await Promise.all(
    [
      "configuration-result.json",
      "configuration-result.md",
      "sanitization-report.json",
    ].map((name) => readFile(path.join(output, name), "utf8")),
  );
  assert.equal(
    findSensitiveDatabaseEnvArtifactFindings(artifact.join("\n")).length,
    0,
  );
  assert.doesNotMatch(
    artifact.join("\n"),
    /AUTORIZO_CONFIGURAR|postgres(?:ql)?:\/\//i,
  );
});

test("configuration artifact scanner rejects DSNs and authorization data", () => {
  for (const unsafe of [
    "postgresql://redacted",
    "authorization: redacted",
    "https://immutable.example",
  ]) {
    assert.throws(
      () => assertSanitizedDatabaseEnvArtifact({ "result.json": unsafe }),
      /COMUN_DATABASE_ENV_CONFIGURATION_ARTIFACT_SENSITIVE/,
    );
  }
});
