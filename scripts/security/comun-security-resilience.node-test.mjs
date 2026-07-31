import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateRemoteTarget } from "./comun-security-contract.mjs";

test("allowlist reconhece alvos Supabase diretos e pooler sem aceitar host externo", () => {
  const projectRef = "abcdefghijklmnopqrst";
  const allowedRefs = projectRef;
  assert.equal(
    validateRemoteTarget({
      databaseUrl: `postgresql://postgres:synthetic@db.${projectRef}.supabase.co:5432/postgres`,
      projectRef,
      allowedRefs,
    }).target,
    "verified",
  );
  assert.equal(
    validateRemoteTarget({
      databaseUrl: `postgresql://postgres.${projectRef}:synthetic@aws-0-region.pooler.supabase.com:6543/postgres`,
      projectRef,
      allowedRefs,
    }).target,
    "verified",
  );
  assert.throws(
    () =>
      validateRemoteTarget({
        databaseUrl: `postgresql://postgres.${projectRef}:synthetic@external.invalid:6543/postgres`,
        projectRef,
        allowedRefs,
      }),
    /TARGET_MISMATCH/,
  );
});

test("workflow nunca publica dump, env ou object keys", async () => {
  const workflow = await readFile(
    ".github/workflows/comun-security-resilience.yml",
    "utf8",
  );
  const artifactBlocks = [
    ...workflow.matchAll(
      /uses: actions\/upload-artifact@v4[\s\S]*?(?=\n\s{6}- |\n  [a-z]|\s*$)/g,
    ),
  ].map((match) => match[0]);
  assert.ok(artifactBlocks.length >= 1);
  for (const block of artifactBlocks) {
    assert.doesNotMatch(block, /\.dump|\.env|backups\/|object[_-]keys?/i);
    assert.match(block, /\.security-evidence/);
  }
});

test("superfície administrativa não mostra materiais proibidos", async () => {
  const page = await readFile("app/comun/admin/auditoria/page.tsx", "utf8");
  assert.doesNotMatch(
    page,
    /SUPABASE_|VERCEL_|R2_|object_key|signed_url|target_id|admin_email|JSON\.stringify/i,
  );
  assert.match(page, /\/comun\/admin\/operacao/);
});

test("roadmap 47.9A e 47.9B permanece separado", async () => {
  const scope = await readFile("docs/comun-v1-launch-scope.md", "utf8");
  assert.match(scope, /47\.9A/);
  assert.match(scope, /47\.9B/);
});
