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

test("preflight e inventário usam o mesmo auditor fixo read-only", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const remoteAudit =
    workflow.match(/  remote-audit:[\s\S]*?\n  operational-findings:/)?.[0] ??
    "";
  assert.match(workflow, /inputs\.mode == 'preflight'/);
  assert.match(workflow, /inputs\.mode == 'content-inventory'/);
  assert.match(workflow, /audit-comun-cultural-deliverability\.mjs/);
  assert.match(remoteAudit, /SUPABASE_PROJECT_REF:/);
  assert.match(remoteAudit, /COMUN_CULTURAL_ALLOWED_PROJECT_REFS:/);
  assert.doesNotMatch(
    remoteAudit,
    /\b(db push|migration up|insert|update|delete)\b/i,
  );
});

test("findings diários reutilizam uma única issue agregadora", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const findings =
    workflow.match(
      /  operational-findings:[\s\S]*?\n  private-rehearsal:/,
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
  assert.match(rehearsal, /actions\/upload-artifact@v4/);
  assert.match(rehearsal, /if: always\(\)/);
  assert.match(rehearsal, /SUPABASE_PROJECT_REF:/);
  assert.match(rehearsal, /COMUN_CULTURAL_ALLOWED_PROJECT_REFS:/);
});

test("workflow não possui canal de publicação ou lançamento", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  assert.doesNotMatch(workflow, /launch_publicly|mode == 'publish'/);
  assert.doesNotMatch(workflow, /VERCEL_TOKEN|storage\.from\(.+upload/);
});
