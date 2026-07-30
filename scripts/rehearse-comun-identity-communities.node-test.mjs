import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CANONICAL_PROJECT_REF,
  IDENTITY_REHEARSAL_CONFIRMATION,
  assertIdentityArtifactSanitized,
  classifyIdentityRehearsalTarget,
} from "./rehearse-comun-identity-communities.mjs";

test("aceita ambiente local sem autorização remota", () => {
  assert.equal(
    classifyIdentityRehearsalTarget({
      connectionString: "postgresql://postgres:local@127.0.0.1:5432/postgres",
    }),
    "local",
  );
});

test("bloqueia remoto sem confirmação e projeto canônicos", () => {
  const connectionString =
    "postgresql://fixture:fixture@db.example.invalid:5432/postgres";
  assert.throws(
    () =>
      classifyIdentityRehearsalTarget({
        connectionString,
        controlledRemote: true,
        confirmation: "INVALID",
        projectRef: CANONICAL_PROJECT_REF,
      }),
    /REMOTE_REHEARSAL_BLOCKED/,
  );
  assert.equal(
    classifyIdentityRehearsalTarget({
      connectionString,
      controlledRemote: true,
      confirmation: IDENTITY_REHEARSAL_CONFIRMATION,
      projectRef: CANONICAL_PROJECT_REF,
    }),
    "controlled_remote",
  );
});

test("artifact sanitizado não aceita conexão, segredo ou UUID bruto", () => {
  assert.equal(
    assertIdentityArtifactSanitized({
      result: "COMUN_IDENTITY_COMMUNITIES_GREEN",
      containsPersonalData: false,
    }),
    true,
  );
  for (const unsafe of [
    "postgresql://user:pass@host/db",
    "service_role",
    "550e8400-e29b-41d4-a716-446655440000",
    "fixture@example.invalid",
  ])
    assert.throws(
      () => assertIdentityArtifactSanitized({ unsafe }),
      /ARTIFACT_NOT_SANITIZED/,
    );
});

test("workflow exige label explícita e executa somente ensaio transacional", async () => {
  const workflow = await readFile(
    new URL(
      "../.github/workflows/comun-communities-deliverability.yml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(workflow, /comun:controlled-rehearsal/);
  assert.match(
    workflow,
    /COMUN_IDENTITY_REHEARSAL_CONFIRMATION: EXECUTAR_ENSAIO_PRIVADO_IDENTITY_COMMUNITIES/,
  );
  assert.match(
    workflow,
    /rehearse-comun-identity-communities\.mjs[\s\S]*--controlled-remote/,
  );
  assert.match(workflow, /if: always\(\)/);
  assert.doesNotMatch(
    workflow,
    /supabase db push|migration up|storage.*upload|launch_publicly/,
  );
});

test("script usa rollback e não envia comunicação externa", async () => {
  const source = await readFile(
    new URL("./rehearse-comun-identity-communities.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /await client\.query\("rollback"\)/);
  assert.match(source, /emailExternalSend: false/);
  assert.match(source, /postflightSyntheticRows: 0/);
  assert.doesNotMatch(source, /sendEmail|fetch\(|storage\.from/);
});
