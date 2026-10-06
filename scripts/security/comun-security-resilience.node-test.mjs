import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { RESULT, validateRemoteTarget } from "./comun-security-contract.mjs";

const rehearsalFiles = [
  ["10-rls-complete.json", RESULT.rls],
  ["20-secrets-boundary.json", RESULT.secrets],
  ["30-database-restore.json", RESULT.databaseRestore],
  ["35-storage-restore.json", RESULT.storageRestore],
  ["40-migration-recovery.json", RESULT.migrationRecovery],
  ["45-deployment-rollback.json", RESULT.deploymentRollback],
  ["50-incident-rehearsal.json", RESULT.incidents],
  ["60-retention.json", RESULT.retention],
];

async function collectFixture(
  provider,
  remote = true,
  failedRehearsal = false,
) {
  const dir = await mkdtemp(path.join(tmpdir(), "comun-security-contract-"));
  try {
    for (const [file, result] of rehearsalFiles) {
      await writeFile(
        path.join(dir, file),
        JSON.stringify({
          result:
            failedRehearsal && file === "30-database-restore.json"
              ? "COMUN_DATABASE_RESTORE_BLOCKED"
              : result,
        }),
      );
    }
    if (provider !== undefined) {
      await writeFile(path.join(dir, "70-provider-capability.json"), provider);
    }
    const run = spawnSync(
      process.execPath,
      [
        "scripts/security/collect-comun-security-resilience.mjs",
        ...(remote ? ["--remote"] : []),
      ],
      {
        env: { ...process.env, COMUN_SECURITY_EVIDENCE_DIR: dir },
        encoding: "utf8",
      },
    );
    return {
      status: run.status,
      evidence: JSON.parse(
        await readFile(path.join(dir, "99-security-resilience.json"), "utf8"),
      ),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

for (const [name, provider] of [
  ["ausente", undefined],
  ["JSON inválido", "{private-secret-sentinel"],
  ["resultado desconhecido", JSON.stringify({ result: "UNRECOGNIZED" })],
  ["declaração verde sem contrato", JSON.stringify({ result: RESULT.green })],
]) {
  test(`coletor bloqueia capacidade ${name} apesar de oito ensaios verdes`, async () => {
    const { status, evidence } = await collectFixture(provider);
    assert.equal(status, 1);
    assert.equal(
      evidence.result,
      "COMUN_SECURITY_RESILIENCE_BLOCKED_INCOMPLETE_EVIDENCE",
    );
    assert.notEqual(evidence.remoteBackup, "verified");
    assert.doesNotMatch(JSON.stringify(evidence), /private-secret-sentinel/);
  });
}

test("capacidade bloqueada preserva ensaios isolados sem provar backup durável", async () => {
  const { status, evidence } = await collectFixture(
    JSON.stringify({
      result: "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
    }),
  );
  assert.equal(status, 0);
  assert.equal(
    evidence.result,
    "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
  );
  assert.equal(evidence.isolatedDatabaseRestore, "verified");
  assert.equal(
    evidence.remoteBackup,
    "ephemeral_verified_but_no_durable_recovery_point",
  );
});

test("auditoria histórica não renova observação do plano contratado", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "comun-provider-history-"));
  try {
    const run = spawnSync(
      process.execPath,
      ["scripts/security/audit-comun-provider-capability.mjs"],
      {
        env: { ...process.env, COMUN_SECURITY_EVIDENCE_DIR: dir },
        encoding: "utf8",
      },
    );
    assert.equal(run.status, 0);
    const evidence = JSON.parse(
      await readFile(path.join(dir, "70-provider-capability.json"), "utf8"),
    );
    assert.equal(evidence.observedPlan, "not_verified_currently");
    assert.equal(evidence.currentProviderCapacityVerified, false);
    assert.equal(evidence.historicalObservation.plan, "free");
    assert.equal(
      evidence.result,
      "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("bloqueio do provedor não esconde falha do ensaio de banco", async () => {
  const { status, evidence } = await collectFixture(
    JSON.stringify({
      result: "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
    }),
    true,
    true,
  );
  assert.equal(status, 1);
  assert.equal(
    evidence.result,
    "COMUN_SECURITY_RESILIENCE_BLOCKED_INCOMPLETE_EVIDENCE",
  );
  assert.equal(evidence.isolatedDatabaseRestore, "pending");
  assert.equal(
    evidence.checks.find((check) => check.evidence === "database-restore")
      .green,
    false,
  );
});

test("ensaios locais não se tornam restaurações remotas verificadas", async () => {
  const { status, evidence } = await collectFixture(
    JSON.stringify({
      result: "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
    }),
    false,
  );
  assert.equal(status, 0);
  assert.equal(evidence.evidenceScope, "local_implementation");
  assert.equal(evidence.remoteBackup, "pending");
  assert.equal(evidence.isolatedDatabaseRestore, "pending");
});

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

test("secret history gates receive full history in local and remote jobs", async () => {
  const workflow = await readFile(
    ".github/workflows/comun-security-resilience.yml",
    "utf8",
  );
  for (const job of ["pr-lane", "remote-full"]) {
    const block = workflow
      .split(`\n  ${job}:`)[1]
      ?.split(/\n  [a-z][a-z-]+:/)[0];
    assert.ok(block, job);
    assert.match(
      block,
      /uses: actions\/checkout@v4\s+with:[\s\S]*?fetch-depth: 0/,
      job,
    );
    assert.match(block, /npm run security:secrets/, job);
    assert.doesNotMatch(block, /fetch-depth: [1-9]/, job);
  }
});

test("backup recupera o schema privado quando ele existe", async () => {
  const rehearsal = await readFile(
    "scripts/security/rehearse-comun-database-restore.mjs",
    "utf8",
  );
  assert.match(rehearsal, /nspname in \('public','private'\)/);
  assert.match(rehearsal, /sourcePrivateCounts/);
  assert.match(rehearsal, /restoredPrivateCounts/);
  assert.match(rehearsal, /privateSchemaRecovered/);
  assert.match(rehearsal, /artifactPublished: false/);
});

test("Relata 48.0C mantém evidência local, privada e sem promoção", async () => {
  const [foundation, migration, feature, runtime, cleanup, manifest] =
    await Promise.all([
      readFile(
        "supabase/local-migrations/20260803161310_comun_relata_durable_local.sql",
        "utf8",
      ),
      readFile(
        "supabase/local-migrations/20260803192419_comun_relata_private_evidence_cases.sql",
        "utf8",
      ),
      readFile("lib/comun-relata-evidence-feature.ts", "utf8"),
      readFile("lib/comun-relata-evidence.ts", "utf8"),
      readFile("scripts/relata/evidence-cleanup.mjs", "utf8"),
      readFile(
        "supabase/local-releases/20260803192419-comun-relata-private-evidence-cases.json",
        "utf8",
      ),
    ]);
  assert.match(feature, /COMUN_RELATA_LOCAL_EVIDENCE/);
  assert.match(feature, /isLoopbackSupabaseUrl/);
  assert.match(runtime, /aes-256-gcm/);
  assert.match(runtime, /createHmac\("sha256"/);
  assert.match(runtime, /limitInputPixels: COMUN_RELATA_MAX_PHOTO_PIXELS/);
  assert.match(migration, /'comun-relata-private'.*false/s);
  assert.match(migration, /force row level security/g);
  assert.match(migration, /future_map_eligibility = false/);
  assert.match(foundation, /COMUN_RELATA_PUBLICATION_BLOCKED_48_0B/);
  assert.match(foundation, /comun_relata_public_snapshots_blocked/);
  assert.doesNotMatch(
    migration,
    /grant\s+(?:select|insert|update|delete|all)[^;]+to\s+(?:anon|authenticated)/i,
  );
  assert.match(cleanup, /--execute-local/);
  assert.match(cleanup, /remote: "not_contacted"/);
  assert.match(manifest, /"remotePromotionAllowed": false/);
  assert.match(manifest, /"requiresPromotion": false/);
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
  assert.doesNotMatch(
    caller,
    /console\.log\([^)]*(?:token|signature|signingKey)/i,
  );
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
  assert.match(workflow, /vercel@50\.28\.0 deploy --prod --yes --force/);
  assert.doesNotMatch(workflow, /env rm CRON_SECRET/);
});

test("roadmap 47.9A e 47.9B permanece separado", async () => {
  const scope = await readFile("docs/comun-v1-launch-scope.md", "utf8");
  assert.match(scope, /47\.9A/);
  assert.match(scope, /47\.9B/);
});
