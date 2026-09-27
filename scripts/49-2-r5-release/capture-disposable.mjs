import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import pg from "pg";
import { schemaFingerprintQuery } from "../solo/apply-forward-only.mjs";
import {
  buildDocuments,
  query as canonicalQuery,
} from "../db/verify-canonical-baseline.mjs";

const url = process.env.COMUN_DISPOSABLE_DB_URL;
const mode = process.argv.find((arg) => arg.startsWith("--mode="))?.slice(7);
const output = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
if (!url || !["pre","post"].includes(mode) || !output)
  throw new Error("COMUN_R5_DISPOSABLE_CONTEXT_INVALID");
const parsed = new URL(url);
if (
  parsed.protocol !== "postgresql:" ||
  !["127.0.0.1","localhost"].includes(parsed.hostname)
)
  throw new Error("COMUN_R5_DISPOSABLE_DESTINATION_REQUIRED");
for (const name of ["SUPABASE_DB_URL","SUPABASE_ACCESS_TOKEN","SUPABASE_SERVICE_ROLE_KEY"])
  if (Object.hasOwn(process.env,name))
    throw new Error("COMUN_R5_PRODUCTION_SECRET_PRESENT");

const sha256=(value)=>createHash("sha256").update(value).digest("hex");
const db=new pg.Client({connectionString:url});
await db.connect();
try {
  await db.query("BEGIN READ ONLY");
  const readOnly=(await db.query("select current_setting('transaction_read_only') value")).rows[0]?.value;
  if(readOnly!=="on") throw new Error("COMUN_R5_DISPOSABLE_NOT_READ_ONLY");

  const version=(await db.query("show server_version")).rows[0]?.server_version;
  const runnerRows=await db.query(schemaFingerprintQuery);
  const normalized=runnerRows.rows.map((row)=>Object.values(row)[0]).join("\n").replace(/\r\n/g,"\n").trimEnd();
  const canonicalRows=await db.query(canonicalQuery);
  const canonical=buildDocuments(JSON.parse(Object.values(canonicalRows.rows[0]??{})[0])).compact;
  const migrations=canonical.canonical.migrations;

  const objects=(await db.query(`
    select
      to_regclass('private.comun_relata_collective_entity_projection_decisions') is not null as decision_table,
      to_regclass('public.comun_relata_collective_entity_public_projections') is not null as projection_table,
      (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (
          'comun_relata_collective_entity_server_projection_review_queue',
          'comun_relata_collective_entity_server_projection_decide',
          'comun_relata_collective_entity_server_public_projection_list'
        )) as bridge_count,
      (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='private' and p.proname in (
          'comun_relata_projection_decision_append_only',
          'comun_relata_projection_row_guard',
          'comun_relata_candidate_publisher_profile',
          'comun_relata_projection_suppress_if_ineligible',
          'comun_relata_projection_review_guard',
          'comun_relata_projection_candidate_guard'
        )) as helper_count,
      (select count(*)::int from pg_trigger t where t.tgname in (
        'comun_relata_projection_decision_append_only',
        'comun_relata_public_entity_projection_guard',
        'comun_relata_projection_suppress_after_review',
        'comun_relata_projection_suppress_after_candidate_change'
      ) and not t.tgisinternal) as trigger_count
  `)).rows[0];

  let decisionRows=null,projectionRows=null,decisionSecurity=null,projectionSecurity=null,bridges=[];
  if(objects.decision_table){
    decisionRows=(await db.query("select count(*)::int count from private.comun_relata_collective_entity_projection_decisions")).rows[0].count;
    decisionSecurity=(await db.query(`
      select c.relrowsecurity rls,c.relforcerowsecurity force_rls,
        coalesce((select bool_or(has_table_privilege('anon',c.oid,p)) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p),false) anon_any,
        coalesce((select bool_or(has_table_privilege('authenticated',c.oid,p)) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p),false) authenticated_any,
        coalesce((select bool_or(has_table_privilege('service_role',c.oid,p)) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p),false) service_any
      from pg_class c where c.oid='private.comun_relata_collective_entity_projection_decisions'::regclass
    `)).rows[0];
  }
  if(objects.projection_table){
    projectionRows=(await db.query("select count(*)::int count from public.comun_relata_collective_entity_public_projections")).rows[0].count;
    projectionSecurity=(await db.query(`
      select c.relrowsecurity rls,c.relforcerowsecurity force_rls,
        coalesce((select bool_or(has_table_privilege('anon',c.oid,p)) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p),false) anon_any,
        coalesce((select bool_or(has_table_privilege('authenticated',c.oid,p)) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p),false) authenticated_any,
        coalesce((select bool_or(has_table_privilege('service_role',c.oid,p)) from unnest(array['SELECT','INSERT','UPDATE','DELETE']) p),false) service_any
      from pg_class c where c.oid='public.comun_relata_collective_entity_public_projections'::regclass
    `)).rows[0];
  }
  if(objects.bridge_count){
    bridges=(await db.query(`
      select p.proname,p.prosecdef security_definer,
        pg_get_userbyid(p.proowner) owner,p.proconfig config,
        has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
        has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') service_execute
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in (
        'comun_relata_collective_entity_server_projection_review_queue',
        'comun_relata_collective_entity_server_projection_decide',
        'comun_relata_collective_entity_server_public_projection_list'
      ) order by p.proname
    `)).rows;
  }

  const document={
    scope:"COMUN_49_2_R5_DISPOSABLE_"+mode.toUpperCase(),
    transactionReadOnly:readOnly,
    postgresVersion:String(version).match(/^\d+\.\d+/)?.[0],
    runnerFingerprint:sha256(normalized),
    canonicalFingerprint:canonical.fingerprint,
    blockingFindings:canonical.security.blockingFindings.length,
    migrations,
    r5Present:migrations.includes("20260926110454"),
    decisionTablePresent:objects.decision_table,
    projectionTablePresent:objects.projection_table,
    bridgeCount:objects.bridge_count,
    helperCount:objects.helper_count,
    triggerCount:objects.trigger_count,
    decisionRows,projectionRows,
    decisionSecurity,projectionSecurity,
    bridges
  };

  if(mode==="pre"){
    if(document.r5Present||document.decisionTablePresent||document.projectionTablePresent||
       document.bridgeCount!==0||document.helperCount!==0||document.triggerCount!==0||
       document.blockingFindings!==0)
      throw new Error("COMUN_R5_DISPOSABLE_PRE_INVALID");
  } else {
    if(!document.r5Present||!document.decisionTablePresent||!document.projectionTablePresent||
       document.bridgeCount!==3||document.helperCount!==6||document.triggerCount!==4||
       document.decisionRows!==0||document.projectionRows!==0||
       !document.decisionSecurity?.rls||!document.decisionSecurity?.force_rls||
       document.decisionSecurity.anon_any||document.decisionSecurity.authenticated_any||document.decisionSecurity.service_any||
       !document.projectionSecurity?.rls||!document.projectionSecurity?.force_rls||
       document.projectionSecurity.anon_any||document.projectionSecurity.authenticated_any||document.projectionSecurity.service_any||
       document.bridges.length!==3||document.bridges.some((b)=>
         !b.security_definer||b.owner!=="postgres"||!b.config?.includes("search_path=pg_catalog")||
         b.anon_execute||b.authenticated_execute||!b.service_execute
       )||document.blockingFindings!==0)
      throw new Error("COMUN_R5_DISPOSABLE_POST_INVALID");
  }

  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify(document,null,2)+"\n");
  console.log("COMUN_49_2_R5_DISPOSABLE_"+mode.toUpperCase()+"_ACCEPTED");
} finally {
  await db.query("ROLLBACK").catch(()=>{});
  await db.end();
}
