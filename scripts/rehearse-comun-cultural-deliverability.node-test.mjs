import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertCulturalRehearsalContract,
  CULTURAL_REHEARSAL_CONFIRMATION,
  resolveCulturalRehearsalDatabaseUrl,
  sanitizeCulturalRehearsalResult,
} from "./rehearse-comun-cultural-deliverability.mjs";

test("exige confirmação e conexão explícitas", () => {
  assert.throws(() => assertCulturalRehearsalContract({}), /CONFIRMATION/);
  assert.equal(
    assertCulturalRehearsalContract({
      COMUN_CULTURAL_REHEARSAL_CONFIRMATION: CULTURAL_REHEARSAL_CONFIRMATION,
      SUPABASE_DB_URL: "local-test-placeholder",
    }),
    true,
  );
});

test("aceita a conexão publicada pelo helper local canônico", () => {
  const environment = {
    COMUN_CULTURAL_REHEARSAL_CONFIRMATION: CULTURAL_REHEARSAL_CONFIRMATION,
    PR23_DATABASE_URL: "local-test-placeholder",
  };
  assert.equal(
    resolveCulturalRehearsalDatabaseUrl(environment),
    "local-test-placeholder",
  );
  assert.equal(assertCulturalRehearsalContract(environment), true);
});

test("ensaio verde exige os três domínios, projeção privada e rollback", () => {
  const artifact = sanitizeCulturalRehearsalResult({
    counts: { archive: 1, communityRadio: 1, territorialArt: 1 },
    privateVisibilityVerified: true,
    publicProjectionBlocked: true,
    transactionRolledBack: true,
    rowsRemainingAfterRollback: 0,
    storageMetadataRehearsed: true,
  });
  assert.equal(
    artifact.result,
    "COMUN_ARCHIVE_RADIO_ART_PRIVATE_REHEARSAL_GREEN",
  );
  assert.equal(artifact.databaseWritesPersisted, "none");
  assert.equal(artifact.containsIds, false);
});

test("ausência de um domínio falha fechada", () => {
  const artifact = sanitizeCulturalRehearsalResult({
    counts: { archive: 1, communityRadio: 0, territorialArt: 1 },
    privateVisibilityVerified: true,
    publicProjectionBlocked: true,
    transactionRolledBack: true,
    rowsRemainingAfterRollback: 0,
  });
  assert.equal(
    artifact.result,
    "COMUN_ARCHIVE_RADIO_ART_PRIVATE_REHEARSAL_BLOCKED",
  );
});

test("script não contém commit nem expõe dados privados no artifact", async () => {
  const source = await readFile(
    new URL("./rehearse-comun-cultural-deliverability.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /client\.query\(["'`]commit/i);
  assert.match(source, /client\.query\(["'`]rollback/);
  assert.doesNotMatch(source, /containsIds:\s*true/);
});
