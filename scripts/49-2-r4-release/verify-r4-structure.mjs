import { writeFileSync } from "node:fs";
import pg from "pg";

const url = process.env.COMUN_DISPOSABLE_DB_URL;
const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
if (!url || !output) throw new Error("COMUN_R4_STRUCTURE_CONTEXT_MISSING");
const parsed = new URL(url);
if (
  parsed.protocol !== "postgresql:" ||
  !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
  !/^comun_pr437_prodlike_post_[0-9]+$/.test(parsed.pathname.slice(1))
)
  throw new Error("COMUN_R4_DISPOSABLE_DESTINATION_REQUIRED");
for (const name of [
  "SUPABASE_DB_URL",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY",
])
  if (Object.hasOwn(process.env, name))
    throw new Error("COMUN_R4_PRODUCTION_SECRET_PRESENT");

const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const table = (
    await db.query(`
      select current_setting('transaction_read_only') as read_only,
        c.relrowsecurity as rls,c.relforcerowsecurity as force_rls,
        pg_get_userbyid(c.relowner) as owner,
        coalesce((select bool_or(has_table_privilege('anon',c.oid,priv))
          from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv),false) as anon_any,
        coalesce((select bool_or(has_table_privilege('authenticated',c.oid,priv))
          from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv),false) as authenticated_any,
        coalesce((select bool_or(has_table_privilege('service_role',c.oid,priv))
          from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv),false) as service_any,
        coalesce((select bool_or(a.grantee=0) from aclexplode(c.relacl) a),false) as public_any
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='private'
        and c.relname='comun_relata_collective_entity_candidate_reviews'
    `)
  ).rows[0];

  const columns = (
    await db.query(`
      select a.attname,a.attidentity
      from pg_attribute a
      where a.attrelid='private.comun_relata_collective_entity_candidate_reviews'::regclass
        and a.attnum>0 and not a.attisdropped
      order by a.attnum
    `)
  ).rows;

  const reviewOrderUnique = (
    await db.query(`
      select count(*)::int as count
      from pg_index i
      join pg_attribute a
        on a.attrelid=i.indrelid and a.attnum=any(i.indkey)
      where i.indrelid='private.comun_relata_collective_entity_candidate_reviews'::regclass
        and i.indisunique and a.attname='review_order'
    `)
  ).rows[0]?.count;

  const appendTrigger = (
    await db.query(`
      select count(*)::int as count
      from pg_trigger t
      where t.tgrelid='private.comun_relata_collective_entity_candidate_reviews'::regclass
        and t.tgname='comun_relata_candidate_review_append_only'
        and not t.tgisinternal
    `)
  ).rows[0]?.count;

  const bridges = (
    await db.query(`
      select p.proname,p.prosecdef as security_definer,
        pg_get_userbyid(p.proowner) as owner,p.proconfig as config,
        has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
        has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute,
        coalesce((select bool_or(a.grantee=0 and a.privilege_type='EXECUTE')
          from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),false) as public_execute
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in (
        'comun_relata_collective_entity_server_candidate_review',
        'comun_relata_collective_entity_server_candidate_review_queue',
        'comun_relata_entity_server_candidate_legitimacy_list_own'
      )
      order by p.proname
    `)
  ).rows;

  const helpers = (
    await db.query(`
      select p.proname,p.prosecdef as security_definer,
        pg_get_userbyid(p.proowner) as owner,p.proconfig as config,
        has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute,
        coalesce((select bool_or(a.grantee=0 and a.privilege_type='EXECUTE')
          from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),false) as public_execute,
        has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
        has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='private' and p.proname in (
        'comun_relata_candidate_review_append_only',
        'comun_relata_candidate_reviewer_profile',
        'comun_relata_candidate_legitimacy_snapshot'
      )
      order by p.proname
    `)
  ).rows;

  const publicRelations = (
    await db.query(`
      select count(*)::int as count
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public'
        and (c.relname like '%collective_entity%legitim%'
          or c.relname like '%collective_entity%review%')
    `)
  ).rows[0]?.count;

  const reviewRows = (
    await db.query(
      "select count(*)::int as count from private.comun_relata_collective_entity_candidate_reviews",
    )
  ).rows[0]?.count;

  const migrationCount = (
    await db.query(`
      select count(*)::int as count
      from supabase_migrations.schema_migrations
      where version='20260925014131'
    `)
  ).rows[0]?.count;

  const expectedColumns = [
    "id","review_order","review_request_id","candidate_id","review_stage",
    "decision","basis_kind","basis_reference_private","reviewer_profile_id",
    "reviewer_auth_user_id","reviewer_role","created_at"
  ];
  const columnNames = columns.map((item) => item.attname);
  const reviewOrder = columns.find((item) => item.attname === "review_order");

  if (
    !table ||
    table.read_only !== "on" ||
    !table.rls ||
    !table.force_rls ||
    table.owner !== "postgres" ||
    table.anon_any ||
    table.authenticated_any ||
    table.service_any ||
    table.public_any ||
    JSON.stringify(columnNames) !== JSON.stringify(expectedColumns) ||
    reviewOrder?.attidentity !== "a" ||
    reviewOrderUnique !== 1 ||
    appendTrigger !== 1 ||
    bridges.length !== 3 ||
    bridges.some((bridge) =>
      !bridge.security_definer ||
      bridge.owner !== "postgres" ||
      !bridge.config?.includes("search_path=pg_catalog") ||
      bridge.anon_execute ||
      bridge.authenticated_execute ||
      bridge.public_execute ||
      !bridge.service_execute
    ) ||
    helpers.length !== 3 ||
    helpers.some((helper) =>
      !helper.security_definer ||
      helper.owner !== "postgres" ||
      !helper.config?.includes("search_path=pg_catalog") ||
      helper.anon_execute ||
      helper.authenticated_execute ||
      helper.public_execute ||
      helper.service_execute
    ) ||
    publicRelations !== 0 ||
    reviewRows !== 0 ||
    migrationCount !== 1
  )
    throw new Error("COMUN_49_2_R4_POST_STRUCTURE_INVALID");

  const document = {
    status: "COMUN_49_2_R4_PRIVATE_LEGITIMACY_NO_PUBLIC_EFFECT",
    transactionReadOnly: table.read_only,
    reviewTableRls: table.rls,
    reviewTableForceRls: table.force_rls,
    reviewColumnCount: columnNames.length,
    reviewOrderIdentity: reviewOrder.attidentity,
    reviewOrderUnique: true,
    appendOnlyTrigger: true,
    publicBridgeCount: bridges.length,
    publicBridgesServiceOnly: true,
    privateHelperCount: helpers.length,
    privateHelpersUnexposed: true,
    publicLegitimacyRelations: publicRelations,
    reviewRows,
    r4MigrationRows: migrationCount,
  };
  writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
  console.log("COMUN_49_2_R4_PRIVATE_LEGITIMACY_NO_PUBLIC_EFFECT");
} finally {
  await db.query("ROLLBACK").catch(() => {});
  await db.end();
}
