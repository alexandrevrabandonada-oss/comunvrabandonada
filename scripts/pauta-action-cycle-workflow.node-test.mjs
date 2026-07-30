import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const promotion = readFileSync(
  ".github/workflows/comun-pauta-action-cycle-promote.yml",
  "utf8",
);
const deliverability = readFileSync(
  ".github/workflows/comun-pauta-action-cycle-deliverability.yml",
  "utf8",
);

function job(source, name, next) {
  const start = source.indexOf(`  ${name}:`);
  const end = next ? source.indexOf(`  ${next}:`, start + 1) : source.length;
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}

test("promoção separa preflight, migration, ensaio e ativação", () => {
  for (const mode of ["preflight", "migrate", "rehearse", "activate"]) {
    assert.match(promotion, new RegExp(`\\b${mode}\\b`));
  }
  assert.match(promotion, /expected_main_sha:/);
  assert.match(promotion, /git rev-parse origin\/main/);
});

test("preflight é somente leitura e não recebe credenciais de Vercel", () => {
  const source = job(promotion, "preflight", "migrate");
  assert.match(source, /preflight-pauta-action-cycle\.mjs/);
  assert.doesNotMatch(source, /VERCEL_TOKEN|db push|env add|deploy --prod/);
});

test("migration aceita somente o plano aditivo exato e não ativa feature", () => {
  const source = job(promotion, "migrate", "rehearse");
  assert.match(source, /verify-pauta-action-cycle-push-plan\.mjs/);
  assert.match(source, /--dry-run/);
  assert.match(source, /db push --db-url "\$SUPABASE_DB_URL"/);
  assert.match(source, /--expected after/);
  assert.match(source, /COMUN_PAUTA_ACTION_CYCLE_MIGRATION_ALREADY_APPLIED/);
  assert.match(source, /migration-attempt\.json/);
  assert.match(source, /blocked_before_write/);
  assert.doesNotMatch(
    source,
    /SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|supabase link/,
  );
  assert.doesNotMatch(
    source,
    /COMUN_COLLECTIVE_ACTIONS_V1|vercel@|deploy --prod/,
  );
});

test("ensaio remoto exige confirmação, é privado e transacional", () => {
  const source = job(promotion, "rehearse", "activate");
  assert.match(source, /--controlled-remote/);
  assert.match(source, /COMUN_PAUTA_ACTION_CYCLE_REHEARSAL_CONFIRMATION/);
  assert.doesNotMatch(source, /env add|deploy --prod|launch_publicly/);
});

test("ativação exige evidência do mesmo SHA e não aplica migration", () => {
  const source = job(promotion, "activate");
  assert.match(source, /REHEARSAL_RUN_ID/);
  assert.match(source, /head_sha/);
  assert.match(source, /COMUN_PAUTA_ACTION_CYCLE_REHEARSAL_GREEN/);
  assert.match(source, /COMUN_COLLECTIVE_ACTIONS_V1 production --force/);
  assert.doesNotMatch(source, /db push|migrate|launch_publicly/);
});

test("CI comprova schema, RLS, ensaio e experiência mobile", () => {
  assert.match(deliverability, /run-pauta-action-cycle-local-reset\.mjs/);
  assert.match(deliverability, /git diff --exit-code/);
  assert.match(deliverability, /audit:rls-matrix/);
  assert.match(deliverability, /rehearse-pauta-action-cycle\.mjs/);
  assert.match(deliverability, /playwright\.pauta-action-cycle\.config\.ts/);
  assert.match(deliverability, /mobile and keyboard/);
});
