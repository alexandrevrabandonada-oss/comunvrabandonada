import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLocalEnvironment,
  parseLocalStatus,
  printSafeEnvironment,
  readLocalStatus,
} from "./comun-local-env.mjs";

const local = {
  API_URL: "http://127.0.0.1:56531",
  DB_URL: "postgresql://local:example@127.0.0.1:56532/postgres",
  ANON_KEY: "local-anon-only",
  SERVICE_ROLE_KEY: "local-service-only",
};

test("local environment propagates the published database URL to both sidewalk runners", () => {
  const env = buildLocalEnvironment(local, {
    COMUN_BASE_URL: "http://localhost:3000",
  });
  assert.equal(env.PR23_DATABASE_URL, local.DB_URL);
  assert.equal(env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL, local.DB_URL);
  assert.equal(env.SUPABASE_PROJECT_REF, "LOCAL_VALIDATION");
  assert.equal(env.PR23_ALLOWED_PROJECT_REFS, "LOCAL_VALIDATION");
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, local.API_URL);
});

test("local environment rejects missing or remote database destinations before a child starts", () => {
  assert.throws(
    () => buildLocalEnvironment({ ...local, DB_URL: "" }),
    /PostgreSQL local obrigatório/,
  );
  assert.throws(
    () =>
      buildLocalEnvironment({
        ...local,
        DB_URL: "postgresql://local:example@remote.example:5432/postgres",
      }),
    /PostgreSQL local obrigatório/,
  );
  assert.throws(
    () =>
      buildLocalEnvironment(local, {
        COMUN_BASE_URL: "https://example.vercel.app",
      }),
    /Destino remoto detectado/,
  );
});

test("print-safe output never includes local connection or credential values", () => {
  const env = buildLocalEnvironment(local, {
    COMUN_BASE_URL: "http://localhost:3000",
  });
  const safe = JSON.stringify(printSafeEnvironment(env));
  assert.doesNotMatch(safe, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(safe, /local-(?:anon|service)-only/);
  assert.match(safe, /redacted/);
});

test("status parsing has the same logical contract across Windows and Linux", () => {
  const parsed = parseLocalStatus(
    [
      `API_URL=${local.API_URL}`,
      `DB_URL=${local.DB_URL}`,
      "ANON_KEY=local-anon-only",
      "SERVICE_ROLE_KEY=local-service-only",
    ].join("\n"),
  );
  const windows = buildLocalEnvironment(parsed, {
    COMUN_BASE_URL: "http://127.0.0.1:3000",
  });
  const linux = buildLocalEnvironment(parsed, {
    COMUN_BASE_URL: "http://localhost:3000",
  });
  for (const key of [
    "PR23_DATABASE_URL",
    "COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL",
    "SUPABASE_PROJECT_REF",
    "PR23_ALLOWED_PROJECT_REFS",
  ]) {
    assert.equal(windows[key], linux[key]);
  }
});

test("GitHub Actions routes only local status through the fail-closed retry reader", () => {
  let calls = 0;
  const raw = readLocalStatus({
    platform: "linux",
    inherited: { GITHUB_ACTIONS: "true" },
    retryReader: ({ invoke }) => {
      calls += 1;
      assert.equal(typeof invoke, "function");
      return { ok: true, output: 'API_URL="http://127.0.0.1:54321"' };
    },
  });
  assert.equal(calls, 1);
  assert.equal(raw, 'API_URL="http://127.0.0.1:54321"');
});

test("GitHub Actions fails closed when the retry reader cannot obtain status", () => {
  assert.throws(
    () =>
      readLocalStatus({
        platform: "linux",
        inherited: { GITHUB_ACTIONS: "true" },
        retryReader: () => ({ ok: false }),
      }),
    /COMUN_LOCAL_STATUS_RETRY_FAILED/,
  );
});
