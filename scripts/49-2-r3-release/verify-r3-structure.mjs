import { writeFileSync } from "node:fs";
import pg from "pg";

const url = process.env.COMUN_DISPOSABLE_DB_URL;
const output = process.argv
  .find((arg) => arg.startsWith("--output="))
  ?.slice(9);
if (!url || !output) throw new Error("COMUN_R3_STRUCTURE_CONTEXT_MISSING");
const parsed = new URL(url);
if (
  parsed.protocol !== "postgresql:" ||
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  !/^comun_pr437_prodlike_post_[0-9]+$/.test(parsed.pathname.slice(1))
)
  throw new Error("COMUN_R3_DISPOSABLE_DESTINATION_REQUIRED");
for (const name of [
  "SUPABASE_DB_URL",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
])
  if (Object.hasOwn(process.env, name))
    throw new Error("COMUN_R3_PRODUCTION_SECRET_PRESENT");

const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const row = (
    await db.query(`
    select current_setting('transaction_read_only') as read_only,
      c.relrowsecurity as rls, c.relforcerowsecurity as force_rls,
      pg_get_userbyid(c.relowner) as owner,
      coalesce((select bool_or(has_table_privilege('anon',c.oid,priv))
        from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv),false) as anon_any,
      coalesce((select bool_or(has_table_privilege('authenticated',c.oid,priv))
        from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv),false) as authenticated_any,
      coalesce((select bool_or(has_table_privilege('service_role',c.oid,priv))
        from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv),false) as service_any,
      coalesce((select bool_or(a.grantee=0) from aclexplode(c.relacl) a),false) as public_any
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname='comun_relata_collective_entity_candidates'
  `)
  ).rows[0];
  const columns = (
    await db.query(`
    select a.attname from pg_attribute a
    where a.attrelid='private.comun_relata_collective_entity_candidates'::regclass
      and a.attnum>0 and not a.attisdropped order by a.attnum
  `)
  ).rows.map((item) => item.attname);
  const indexes = (
    await db.query(`
    select i.indisunique as unique_index, pg_get_expr(i.indpred,i.indrelid) as predicate
    from pg_index i join pg_class c on c.oid=i.indexrelid
    where c.relname='comun_relata_candidate_one_pending_per_entity'
  `)
  ).rows;
  const triggers = (
    await db.query(`
    select tgname from pg_trigger where tgname like 'comun_relata_candidate_%'
      and not tgisinternal order by tgname
  `)
  ).rows.map((item) => item.tgname);
  const bridge = (
    await db.query(`
    select p.prosecdef as security_definer, pg_get_userbyid(p.proowner) as owner,
      p.proconfig as config,
      has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
      has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute,
      coalesce((select bool_or(a.grantee=0 and a.privilege_type='EXECUTE')
        from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),false) as public_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='comun_relata_collective_entity_server_candidate_prepare'
  `)
  ).rows;
  const publicRelations = (
    await db.query(`
    select count(*)::int as count from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like '%collective_entity_candidate%'
  `)
  ).rows[0].count;
  const migrationCount = (
    await db.query(`
    select count(*)::int as count from supabase_migrations.schema_migrations
    where version='20260924225210'
  `)
  ).rows[0].count;
  const expectedColumns = [
    "id",
    "entity_id",
    "generation_request_id",
    "source_representation_id",
    "source_consent_id",
    "candidate_version",
    "candidate_state",
    "public_name",
    "entity_type",
    "generated_at",
    "invalidated_at",
    "invalidation_reason",
  ];
  const expectedTriggers = [
    "comun_relata_candidate_consent_invalidate",
    "comun_relata_candidate_entity_invalidate",
    "comun_relata_candidate_immutable",
    "comun_relata_candidate_representation_invalidate",
  ];
  if (
    !row ||
    row.read_only !== "on" ||
    !row.rls ||
    !row.force_rls ||
    row.owner !== "postgres" ||
    row.anon_any ||
    row.authenticated_any ||
    row.service_any ||
    row.public_any ||
    JSON.stringify(columns) !== JSON.stringify(expectedColumns) ||
    indexes.length !== 1 ||
    indexes[0].unique_index !== true ||
    !indexes[0].predicate?.includes("pending_legitimacy") ||
    JSON.stringify(triggers) !== JSON.stringify(expectedTriggers) ||
    bridge.length !== 1 ||
    !bridge[0].security_definer ||
    bridge[0].owner !== "postgres" ||
    !bridge[0].config?.includes("search_path=pg_catalog") ||
    bridge[0].anon_execute ||
    bridge[0].authenticated_execute ||
    bridge[0].public_execute ||
    !bridge[0].service_execute ||
    publicRelations !== 0 ||
    migrationCount !== 1
  )
    throw new Error("COMUN_49_2_R3_POST_STRUCTURE_INVALID");
  writeFileSync(
    output,
    `${JSON.stringify(
      {
        status: "COMUN_49_2_R3_PRIVATE_CANDIDATE_NO_PUBLIC_EFFECT",
        transactionReadOnly: row.read_only,
        candidateTableRls: row.rls,
        candidateTableForceRls: row.force_rls,
        candidateColumnCount: columns.length,
        uniquePendingIndex: true,
        triggerNames: triggers,
        bridgeOwner: bridge[0].owner,
        bridgeSecurityDefiner: bridge[0].security_definer,
        bridgeServiceOnly: true,
        publicCandidateRelations: publicRelations,
        r3MigrationRows: migrationCount,
      },
      null,
      2,
    )}\n`,
  );
  console.log("COMUN_49_2_R3_PRIVATE_CANDIDATE_NO_PUBLIC_EFFECT");
} finally {
  await db.query("ROLLBACK").catch(() => {});
  await db.end();
}
