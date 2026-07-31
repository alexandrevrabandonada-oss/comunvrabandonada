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

test("ensaio de Storage no runtime exige duas chaves, assinatura e prazo", async () => {
  const route = await readFile(
    "app/api/internal/security/storage-restore/route.ts",
    "utf8",
  );
  const caller = await readFile(
    "scripts/security/rehearse-comun-storage-runtime.mjs",
    "utf8",
  );
  assert.match(route, /matchesCronSecret/);
  assert.match(route, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /createHmac\("sha256"/);
  assert.match(route, /5 \* 60_000/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /COMUN_STORAGE_RUNTIME_CRON_AUTH_FAILED/);
  assert.match(route, /COMUN_STORAGE_RUNTIME_SIGNATURE_AUTH_FAILED/);
  assert.match(route, /\^COMUN_STORAGE_RUNTIME_\[A-Z_\]\+\$/);
  assert.match(caller, /X-COMUN-Rehearsal-Signature/);
  assert.match(caller, /COMUN_STORAGE_RUNTIME_HTTP_/);
  assert.doesNotMatch(caller, /console\.log\([^)]*(?:token|signature|signingKey)/i);
});

test("rotação do cron preserva a chave atual durante a transição", async () => {
  const auth = await readFile("lib/security/cron-auth.ts", "utf8");
  const workflow = await readFile(
    ".github/workflows/comun-security-resilience.yml",
    "utf8",
  );
  assert.match(auth, /CRON_SECRET/);
  assert.match(auth, /CRON_SECRET_NEXT/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(workflow, /mode == 'dual-key'/);
  assert.match(workflow, /env add CRON_SECRET_NEXT production/);
  assert.match(
    workflow,
    /vercel@50\.28\.0 deploy --prod --yes --force/,
  );
  assert.doesNotMatch(workflow, /env rm CRON_SECRET/);
});

test("roadmap 47.9A e 47.9B permanece separado", async () => {
  const scope = await readFile("docs/comun-v1-launch-scope.md", "utf8");
  assert.match(scope, /47\.9A/);
  assert.match(scope, /47\.9B/);
});
