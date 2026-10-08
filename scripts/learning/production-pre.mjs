import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { validateRemoteTarget } from "../security/comun-security-contract.mjs";
import { readAtomicSnapshot } from "./atomic-disposable.mjs";
import { metadataSql, classifyMetadata } from "./release-review.mjs";

export const digest = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const connectionOptions = "-c default_transaction_read_only=on";
export const manifests = [
  "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
  "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json",
  "supabase/release-bundles/20260924-comun-49-2-r3-private-candidate.json",
  "supabase/release-bundles/20260925-comun-49-2-r4-private-legitimacy-eligibility.json",
  "supabase/release-bundles/20260927-comun-49-2-r5-public-projection-gate.json",
];

// Catalogs only. In particular, no SELECT from private collective/business tables.
export const scopeSql = `select json_build_object(
  'database', current_database(), 'serverVersion', current_setting('server_version'),
  'readOnly', current_setting('transaction_read_only'),
  'p4ProjectionPresent', to_regclass('public.comun_sidewalk_records') is not null,
  'p4ProjectionRlsEnabled', coalesce((select relrowsecurity from pg_catalog.pg_class
    where oid=to_regclass('public.comun_sidewalk_records')),false),
  'p4PublicGeometryPresent', exists(select 1 from pg_catalog.pg_attribute
    where attrelid=to_regclass('public.comun_sidewalk_records') and attname='public_geometry_geojson' and not attisdropped),
  'p6cCApplied', exists(select 1 from supabase_migrations.schema_migrations where version='20260810194054')
) as value`;

// The canonical v2 serializer excludes private objects. Bind those relevant to
// the accepted collective releases separately, without reading their contents.
export const privateCatalogSql = `select json_build_object(
 'relations',coalesce((select json_agg(json_build_object('name',c.relname,'kind',c.relkind,
   'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'acl',c.relacl::text) order by c.relname)
   from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='private' and c.relname like 'comun_relata_collective_entity%' and c.relkind in ('r','p','S')), '[]'::json),
 'columns',coalesce((select json_agg(json_build_object('table',c.relname,'name',a.attname,
   'type',pg_catalog.format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'identity',a.attidentity,
   'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid)) order by c.relname,a.attnum)
   from pg_catalog.pg_attribute a join pg_catalog.pg_class c on c.oid=a.attrelid
   join pg_catalog.pg_namespace n on n.oid=c.relnamespace left join pg_catalog.pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
   where n.nspname='private' and c.relname like 'comun_relata_collective_entity%' and a.attnum>0 and not a.attisdropped), '[]'::json),
 'constraints',coalesce((select json_agg(json_build_object('table',c.relname,'name',x.conname,
   'definition',pg_catalog.pg_get_constraintdef(x.oid)) order by c.relname,x.conname)
   from pg_catalog.pg_constraint x join pg_catalog.pg_class c on c.oid=x.conrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='private' and c.relname like 'comun_relata_collective_entity%'), '[]'::json),
 'functions',coalesce((select json_agg(json_build_object('name',p.proname,
   'arguments',pg_catalog.pg_get_function_identity_arguments(p.oid),'owner',pg_get_userbyid(p.proowner),
   'securityDefiner',p.prosecdef,'config',p.proconfig,'acl',p.proacl::text,
   'definition',regexp_replace(pg_catalog.pg_get_functiondef(p.oid),'\\s+',' ','g')) order by p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid))
   from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='private' and (p.proname like 'comun_relata_collective_entity%' or p.proname like 'comun_relata_projection_%'
     or p.proname='comun_relata_candidate_publisher_profile')), '[]'::json),
 'triggers',coalesce((select json_agg(json_build_object('table',c.relname,'name',t.tgname,
   'definition',pg_catalog.pg_get_triggerdef(t.oid)) order by c.relname,t.tgname)
   from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='private' and c.relname like 'comun_relata_collective_entity%' and not t.tgisinternal), '[]'::json)
) as value`;

export function ledgerStates(rows, releases) {
  return Object.fromEntries(
    releases.map((m) => {
      const found = rows.filter((r) => r.release === m.release);
      const expected = {
        migration_path: m.releaseLedger?.migrationPath ?? m.migration,
        migration_sha256: m.migrationSetSha256 ?? m.migrationSha256,
        pre_fingerprint: m.expectedPreFingerprint,
        post_fingerprint: m.expectedPostFingerprint,
        status: "applied",
      };
      return [
        m.release,
        found.length === 0
          ? "ABSENT"
          : found.length === 1 &&
              Object.entries(expected).every(([k, v]) => found[0][k] === v)
            ? "PRESENT_ACCEPTED"
            : "PRESENT_MISMATCH",
      ];
    }),
  );
}

export function classifyPre({
  snapshot,
  metadata,
  scope,
  releases,
  localVersions,
}) {
  assert.equal(scope.readOnly, "on", "LEARNING_READ_ONLY_REQUIRED");
  assert.equal(
    scope.database,
    "postgres",
    "LEARNING_DATABASE_IDENTITY_MISMATCH",
  );
  const r5 = releases.at(-1);
  const ledgers = ledgerStates(snapshot.ledger, releases);
  const pending = localVersions.filter(
    (v) => !snapshot.compact.canonical.migrations.includes(v),
  );
  const external = releases[0].migration.split("/").at(-1).split("_")[0];
  const unknown = snapshot.compact.canonical.migrations.filter(
    (v) => !localVersions.includes(v) && v !== external,
  );
  const schoolLedger = snapshot.ledger.filter(
    (r) => r.release === "20261006134804-comun-learning-r0",
  );
  const failedObjects = [
    "p4ProjectionPresent",
    "p4ProjectionRlsEnabled",
    "p4PublicGeometryPresent",
    "p6cCApplied",
  ].filter((k) => scope[k] !== true);
  const reasons = [];
  if (
    classifyMetadata(metadata) !==
      "ABSENT_REQUIRES_BASELINE_AND_PROMOTION_REVIEW" ||
    schoolLedger.length
  )
    reasons.push("SCHOOL_NOT_ABSENT");
  if (
    snapshot.compact.fingerprint !== r5.expectedPostCanonicalFingerprint ||
    snapshot.runner !== r5.expectedPostFingerprint
  )
    reasons.push("BASELINE_FINGERPRINT_DRIFT");
  if (
    !scope.serverVersion.startsWith(`${r5.postgresVersion}.`) &&
    scope.serverVersion !== r5.postgresVersion
  )
    reasons.push("POSTGRES_VERSION_DRIFT");
  if (Object.values(ledgers).some((s) => s !== "PRESENT_ACCEPTED"))
    reasons.push("ACCEPTED_RELEASE_LEDGER_DRIFT");
  if (snapshot.compact.security.blockingFindings.length)
    reasons.push("CANONICAL_SECURITY_FINDINGS");
  if (
    JSON.stringify(pending) !== JSON.stringify(["20261006134804"]) ||
    unknown.length
  )
    reasons.push("MIGRATION_HISTORY_DRIFT");
  if (failedObjects.length) reasons.push("OBSERVATORY_OBJECT_DRIFT");
  return {
    status: reasons.length
      ? "COMUN_LEARNING_PRE_DIVERGED"
      : "COMUN_LEARNING_PRE_CAPTURED_AWAITING_DISPOSABLE_EQUIVALENCE",
    reasons,
    ledgers,
    schoolLedgerState: schoolLedger.length ? "PRESENT_BLOCKED" : "ABSENT",
    pending,
    unknown,
    failedObjects,
    promotionReady: false,
    remotePromotionAllowed: false,
  };
}

export async function captureProductionPre(db, inputs) {
  await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const scope = (await db.query(scopeSql)).rows[0]?.value;
    assert.equal(scope?.readOnly, "on", "LEARNING_READ_ONLY_REQUIRED");
    const snapshot = await readAtomicSnapshot(db);
    const metadata = (await db.query(metadataSql, ["20261006134804"])).rows[0];
    const privateCatalog = (await db.query(privateCatalogSql)).rows[0]?.value;
    assert.ok(
      privateCatalog && Object.values(privateCatalog).every(Array.isArray),
      "LEARNING_PRIVATE_CATALOG_INVALID",
    );
    return {
      ...classifyPre({ snapshot, metadata, scope, ...inputs }),
      snapshot,
      metadata,
      scope,
      privateCatalog,
      canonicalSectionHashes: Object.fromEntries(
        Object.entries(snapshot.compact.canonical).map(([k, v]) => [
          k,
          digest(v),
        ]),
      ),
      privateCatalogSha256: digest(privateCatalog),
      transactionReadOnly: true,
      businessRowsRead: false,
      schemaWrites: 0,
      ledgerWrites: 0,
      rollback: "CONFIRMED",
    };
  } finally {
    await db.query("ROLLBACK");
  }
}

async function main() {
  validateRemoteTarget({
    databaseUrl: process.env.SUPABASE_DB_URL,
    projectRef: process.env.SUPABASE_PROJECT_REF,
    allowedRefs: process.env.COMUN_LEARNING_REVIEW_ALLOWED_PROJECT_REFS,
  });
  const { loadAtomicPackage } = await import("./atomic-disposable.mjs");
  await loadAtomicPackage();
  const releases = await Promise.all(
    manifests.map(async (p) => JSON.parse(await readFile(p, "utf8"))),
  );
  const { readdir } = await import("node:fs/promises");
  const localVersions = (await readdir("supabase/migrations"))
    .filter((p) => /^\d{14}_.*\.sql$/.test(p))
    .map((p) => p.slice(0, 14))
    .sort();
  const { default: pg } = await import("pg");
  const db = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    options: connectionOptions,
    connectionTimeoutMillis: 15000,
    query_timeout: 30000,
  });
  let result;
  try {
    await db.connect();
    result = await captureProductionPre(db, { releases, localVersions });
  } finally {
    await db.end();
  }
  result.sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  result.sourceTree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    encoding: "utf8",
  }).trim();
  result.run = process.env.GITHUB_RUN_ID ?? "local";
  result.target = {
    allowlisted: true,
    projectRefSha256: digest(process.env.SUPABASE_PROJECT_REF),
  };
  await mkdir(".ci-artifacts/learning-production-pre", { recursive: true });
  await writeFile(
    ".ci-artifacts/learning-production-pre/capture.json",
    JSON.stringify(result, null, 2) + "\n",
    { mode: 0o600 },
  );
  console.log(result.status);
  if (result.reasons.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => {
    console.error("COMUN_LEARNING_PRODUCTION_PRE_BLOCKED_SANITIZED");
    process.exitCode = 1;
  });
