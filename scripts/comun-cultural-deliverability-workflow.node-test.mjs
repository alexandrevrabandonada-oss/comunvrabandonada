import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL(
  "../.github/workflows/comun-cultural-deliverability.yml",
  import.meta.url,
);

test("lane de PR é local e não injeta credenciais remotas", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const verify =
    workflow.match(/  verify:[\s\S]*?\n  remote-audit:/)?.[0] ?? "";
  assert.doesNotMatch(verify, /\$\{\{\s*secrets\./);
  assert.match(verify, /COMUN_ARCHIVE_RADIO_ART_CONTRACT/);
});

test("preflight, postflight e inventário usam o mesmo auditor fixo read-only", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const remoteAudit =
    workflow.match(/  remote-audit:[\s\S]*?\n  operational-findings:/)?.[0] ??
    "";
  assert.match(workflow, /inputs\.mode == 'preflight'/);
  assert.match(workflow, /inputs\.mode == 'postflight'/);
  assert.match(workflow, /inputs\.mode == 'content-inventory'/);
  assert.match(workflow, /audit-comun-cultural-deliverability\.mjs/);
  assert.match(remoteAudit, /SUPABASE_PROJECT_REF:/);
  assert.match(remoteAudit, /COMUN_CULTURAL_ALLOWED_PROJECT_REFS:/);
  assert.doesNotMatch(
    remoteAudit,
    /\b(db push|migration up|insert|update|delete)\b/i,
  );
});

test("migration de perfil é separada, exata e não cria objetos", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const migration =
    workflow.match(/  migrate-radio-profile:[\s\S]*?\n  repair:/)?.[0] ?? "";
  assert.match(migration, /inputs\.mode == 'migrate-radio-profile'/);
  assert.match(migration, /APLICAR_PERFIL_GRATUITO_RADIO_V1_47_6B/);
  assert.match(migration, /radio-v1-storage-migration\.mjs/);
  assert.match(migration, /apply-radio-v1-storage-migration\.mjs/);
  assert.match(migration, /COMUN_RADIO_V1_STORAGE_PROFILE_APPLIED/);
  assert.doesNotMatch(migration, /supabase db push|migration repair/);
  assert.doesNotMatch(
    migration,
    /SUPABASE_SERVICE_ROLE_KEY|storage\.(?:upload|createBucket)/,
  );
});

test("correção de alt text é uma lane separada com SHA e plano exatos", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const repair =
    workflow.match(/  repair:[\s\S]*?\n  private-rehearsal:/)?.[0] ?? "";
  assert.match(repair, /inputs\.mode == 'repair'/);
  assert.match(repair, /EXECUTAR_CORRECAO_ALT_CULTURAL_47_6B/);
  assert.match(repair, /inputs\.expected_plan_hash/);
  assert.match(repair, /repair-comun-cultural-remote-state\.mjs/);
  assert.match(repair, /if: always\(\)/);
  assert.doesNotMatch(
    repair,
    /SUPABASE_SERVICE_ROLE_KEY|storage\.from\(.+upload|launch_publicly/,
  );
});

test("findings diários reutilizam uma única issue agregadora", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const findings =
    workflow.match(
      /  operational-findings:[\s\S]*?\n  migrate-radio-profile:/,
    )?.[0] ?? "";
  assert.match(findings, /github\.event_name == 'schedule'/);
  assert.match(findings, /issues:\s*write/);
  assert.match(findings, /Entregabilidade cultural — findings/);
  assert.match(findings, /listForRepo/);
  assert.doesNotMatch(findings, /\$\{\{\s*secrets\./);
});

test("ensaio privado é separado, confirmado e publica artifact", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const rehearsal = workflow.match(/  private-rehearsal:[\s\S]*/)?.[0] ?? "";
  assert.match(rehearsal, /EXECUTAR_ENSAIO_PRIVADO_ARCHIVE_RADIO_ART/);
  assert.match(rehearsal, /rehearse-comun-cultural-deliverability\.mjs/);
  assert.match(rehearsal, /pre-rehearsal-audit\.json/);
  assert.match(
    rehearsal,
    /COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL/,
  );
  assert.match(rehearsal, /actions\/upload-artifact@v4/);
  assert.match(rehearsal, /if: always\(\)/);
  assert.match(rehearsal, /SUPABASE_PROJECT_REF:/);
  assert.match(rehearsal, /COMUN_CULTURAL_ALLOWED_PROJECT_REFS:/);
});

test("workflow não possui canal de publicação ou lançamento", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  assert.doesNotMatch(workflow, /launch_publicly|mode == 'publish'/);
  assert.doesNotMatch(
    workflow,
    /VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY|storage\.from\(.+upload/,
  );
});
