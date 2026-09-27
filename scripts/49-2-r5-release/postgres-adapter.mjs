import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { schemaFingerprintQuery } from "../solo/apply-forward-only.mjs";
import { buildDocuments,query as canonicalQuery } from "../db/verify-canonical-baseline.mjs";

const R5="20260926110454";
const R12_MANIFEST="supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json";
const R3_MANIFEST="supabase/release-bundles/20260924-comun-49-2-r3-private-candidate.json";
const R4_MANIFEST="supabase/release-bundles/20260925-comun-49-2-r4-private-legitimacy-eligibility.json";
const HARDENING_MANIFEST="supabase/releases/20260922120000-canonical-security-hardening-v2.json";
const hash=(value)=>createHash("sha256").update(value).digest("hex");

export function requireR5DisposableUrl(url){
  const parsed=new URL(url);
  if(parsed.protocol!=="postgresql:"||
    !["127.0.0.1","localhost"].includes(parsed.hostname)||
    !/^comun_r5_promotion_[0-9]+$/.test(parsed.pathname.slice(1)))
    throw new Error("COMUN_R5_DISPOSABLE_DESTINATION_REQUIRED");
  return url;
}

export function requireR5WriteAuthorization({authorization,expectedSha,disposable}){
  if(disposable)return;
  if(authorization!=="COMUN_49_2_R5_PRODUCTION_SCHEMA_WRITE"||
    !/^[a-f0-9]{40}$/.test(expectedSha??"")||
    process.env.GITHUB_SHA!==expectedSha||
    process.env.GITHUB_REF!=="refs/heads/main")
    throw new Error("COMUN_R5_PRODUCTION_WRITE_AUTHORIZATION_REQUIRED");
}

function exactLedger(rows,release,expected){
  const matches=rows.filter((row)=>row.release===release);
  if(matches.length===0)return "ABSENT";
  if(matches.length!==1)return "PRESENT_MISMATCH";
  const row=matches[0];
  return row.migration_path===expected.path&&
    row.migration_sha256===expected.migrationSha256&&
    row.pre_fingerprint===expected.preFingerprint&&
    row.post_fingerprint===expected.postFingerprint&&
    row.status==="applied"?"PRESENT_ACCEPTED":"PRESENT_MISMATCH";
}

export function createR5PostgresAdapter({url,manifest,disposable=false,authorization,expectedSha}){
  if(!url)throw new Error("COMUN_R5_DATABASE_URL_MISSING");
  if(disposable)requireR5DisposableUrl(url);
  const r12=JSON.parse(readFileSync(R12_MANIFEST,"utf8"));
  const r3=JSON.parse(readFileSync(R3_MANIFEST,"utf8"));
  const r4=JSON.parse(readFileSync(R4_MANIFEST,"utf8"));
  const hardening=JSON.parse(readFileSync(HARDENING_MANIFEST,"utf8"));

  const connect=async()=>{
    const client=new pg.Client({connectionString:url});
    await client.connect();
    return client;
  };

  const capture=async()=>{
    const db=await connect();
    try{
      await db.query("BEGIN READ ONLY");
      const mode=(await db.query("select current_setting('transaction_read_only') value")).rows[0]?.value;
      if(mode!=="on")throw new Error("COMUN_R5_CAPTURE_NOT_READ_ONLY");
      const version=(await db.query("show server_version")).rows[0]?.server_version;
      const runnerRows=await db.query(schemaFingerprintQuery);
      const normalized=runnerRows.rows.map((row)=>Object.values(row)[0]).join("\n").replace(/\r\n/g,"\n").trimEnd();
      if(!normalized)throw new Error("COMUN_R5_RUNNER_FINGERPRINT_EMPTY");
      const canonicalRows=await db.query(canonicalQuery);
      const canonical=buildDocuments(JSON.parse(Object.values(canonicalRows.rows[0]??{})[0])).compact;

      const objects=(await db.query(`
        select
          to_regclass('private.comun_relata_collective_entity_projection_decisions') is not null decision_table,
          to_regclass('public.comun_relata_collective_entity_public_projections') is not null projection_table,
          (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='public' and p.proname in (
              'comun_relata_collective_entity_server_projection_review_queue',
              'comun_relata_collective_entity_server_projection_decide',
              'comun_relata_collective_entity_server_public_projection_list')) bridge_count,
          (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='private' and p.proname in (
              'comun_relata_projection_decision_append_only',
              'comun_relata_projection_row_guard',
              'comun_relata_candidate_publisher_profile',
              'comun_relata_projection_suppress_if_ineligible',
              'comun_relata_projection_review_guard',
              'comun_relata_projection_candidate_guard')) helper_count,
          (select count(*)::int from pg_trigger t where t.tgname in (
              'comun_relata_projection_decision_append_only',
              'comun_relata_public_entity_projection_guard',
              'comun_relata_projection_suppress_after_review',
              'comun_relata_projection_suppress_after_candidate_change')
            and not t.tgisinternal) trigger_count
      `)).rows[0];

      let decisionRows=null,projectionRows=null;
      if(objects.decision_table)
        decisionRows=(await db.query("select count(*)::int count from private.comun_relata_collective_entity_projection_decisions")).rows[0].count;
      if(objects.projection_table)
        projectionRows=(await db.query("select count(*)::int count from public.comun_relata_collective_entity_public_projections")).rows[0].count;

      const rows=(await db.query(
        `select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status
           from public.comun_schema_releases where release=any($1::text[])`,
        [[r12.release,r3.release,r4.release,hardening.release,manifest.release]]
      )).rows;

      return {
        migrations:canonical.canonical.migrations,
        postgresVersion:String(version).match(/^\d+\.\d+/)?.[0],
        runnerFingerprint:hash(normalized),
        canonicalFingerprint:canonical.fingerprint,
        blockingFindings:canonical.security.blockingFindings.length,
        r12Ledger:exactLedger(rows,r12.release,{
          path:r12.releaseLedger.migrationPath,migrationSha256:r12.migrationSetSha256,
          preFingerprint:r12.expectedPreFingerprint,postFingerprint:r12.expectedPostFingerprint}),
        r3Ledger:exactLedger(rows,r3.release,{
          path:r3.releaseLedger.migrationPath,migrationSha256:r3.migrationSetSha256,
          preFingerprint:r3.expectedPreFingerprint,postFingerprint:r3.expectedPostFingerprint}),
        r4Ledger:exactLedger(rows,r4.release,{
          path:r4.releaseLedger.migrationPath,migrationSha256:r4.migrationSetSha256,
          preFingerprint:r4.expectedPreFingerprint,postFingerprint:r4.expectedPostFingerprint}),
        hardeningLedger:exactLedger(rows,hardening.release,{
          path:hardening.migration,migrationSha256:hardening.migrationSha256,
          preFingerprint:hardening.expectedPreFingerprint,postFingerprint:hardening.expectedPostFingerprint}),
        r5Ledger:exactLedger(rows,manifest.release,{
          path:manifest.releaseLedger.migrationPath,migrationSha256:manifest.migrationSetSha256,
          preFingerprint:manifest.expectedPreFingerprint,postFingerprint:manifest.expectedPostFingerprint}),
        r5Present:canonical.canonical.migrations.includes(R5),
        decisionTablePresent:objects.decision_table,
        projectionTablePresent:objects.projection_table,
        bridgeCount:objects.bridge_count,
        helperCount:objects.helper_count,
        triggerCount:objects.trigger_count,
        decisionRows,projectionRows
      };
    }finally{
      await db.query("ROLLBACK").catch(()=>{});
      await db.end();
    }
  };

  const verifyPost=async()=>{
    const db=await connect();
    try{
      await db.query("BEGIN READ ONLY");
      const readOnly=(await db.query("select current_setting('transaction_read_only') value")).rows[0]?.value;
      if(readOnly!=="on")throw new Error("COMUN_R5_POST_NOT_READ_ONLY");

      const tables=(await db.query(`
        select n.nspname,c.relname,c.relrowsecurity rls,c.relforcerowsecurity force_rls,
          pg_get_userbyid(c.relowner) owner,
          coalesce((select bool_or(has_table_privilege('anon',c.oid,p))
            from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p),false) anon_any,
          coalesce((select bool_or(has_table_privilege('authenticated',c.oid,p))
            from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p),false) authenticated_any,
          coalesce((select bool_or(has_table_privilege('service_role',c.oid,p))
            from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p),false) service_any,
          coalesce((select bool_or(a.grantee=0) from aclexplode(c.relacl) a),false) public_any
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where (n.nspname='private' and c.relname='comun_relata_collective_entity_projection_decisions')
           or (n.nspname='public' and c.relname='comun_relata_collective_entity_public_projections')
        order by n.nspname,c.relname
      `)).rows;
      if(tables.length!==2||tables.some((table)=>!table.rls||!table.force_rls||table.owner!=="postgres"||
        table.anon_any||table.authenticated_any||table.service_any||table.public_any))
        throw new Error("COMUN_R5_POST_TABLE_SECURITY_INVALID");

      const decisionColumns=(await db.query(`
        select attname,attidentity from pg_attribute
        where attrelid='private.comun_relata_collective_entity_projection_decisions'::regclass
          and attnum>0 and not attisdropped order by attnum
      `)).rows;
      const projectionColumns=(await db.query(`
        select attname from pg_attribute
        where attrelid='public.comun_relata_collective_entity_public_projections'::regclass
          and attnum>0 and not attisdropped order by attnum
      `)).rows.map((row)=>row.attname);
      const expectedDecision=["id","decision_order","decision_request_id","candidate_id","decision","rationale_private","publisher_profile_id","publisher_auth_user_id","publisher_role","created_at"];
      const expectedProjection=["id","candidate_id","entity_id","projection_version","public_name","entity_type","projection_state","activation_decision_id","published_at","state_changed_at","suppressed_at","suppression_reason"];
      if(JSON.stringify(decisionColumns.map((row)=>row.attname))!==JSON.stringify(expectedDecision)||
        decisionColumns.find((row)=>row.attname==="decision_order")?.attidentity!=="a"||
        JSON.stringify(projectionColumns)!==JSON.stringify(expectedProjection))
        throw new Error("COMUN_R5_POST_COLUMNS_INVALID");

      const uniqueOrder=(await db.query(`
        select count(*)::int count from pg_index i join pg_attribute a
          on a.attrelid=i.indrelid and a.attnum=any(i.indkey)
        where i.indrelid='private.comun_relata_collective_entity_projection_decisions'::regclass
          and i.indisunique and a.attname='decision_order'
      `)).rows[0]?.count;
      if(uniqueOrder!==1)throw new Error("COMUN_R5_POST_DECISION_ORDER_INVALID");

      const bridges=(await db.query(`
        select p.proname,p.prosecdef security_definer,pg_get_userbyid(p.proowner) owner,p.proconfig config,
          has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
          has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
          has_function_privilege('service_role',p.oid,'EXECUTE') service_execute,
          coalesce((select bool_or(a.grantee=0 and a.privilege_type='EXECUTE')
            from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),false) public_execute
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (
          'comun_relata_collective_entity_server_projection_review_queue',
          'comun_relata_collective_entity_server_projection_decide',
          'comun_relata_collective_entity_server_public_projection_list')
      `)).rows;
      if(bridges.length!==3||bridges.some((fn)=>!fn.security_definer||fn.owner!=="postgres"||
        !fn.config?.includes("search_path=pg_catalog")||fn.anon_execute||fn.authenticated_execute||
        fn.public_execute||!fn.service_execute))
        throw new Error("COMUN_R5_POST_BRIDGE_SECURITY_INVALID");

      const helpers=(await db.query(`
        select p.proname,p.prosecdef security_definer,pg_get_userbyid(p.proowner) owner,p.proconfig config,
          has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
          has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
          has_function_privilege('service_role',p.oid,'EXECUTE') service_execute,
          coalesce((select bool_or(a.grantee=0 and a.privilege_type='EXECUTE')
            from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),false) public_execute
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='private' and p.proname in (
          'comun_relata_projection_decision_append_only',
          'comun_relata_projection_row_guard',
          'comun_relata_candidate_publisher_profile',
          'comun_relata_projection_suppress_if_ineligible',
          'comun_relata_projection_review_guard',
          'comun_relata_projection_candidate_guard')
      `)).rows;
      if(helpers.length!==6||helpers.some((fn)=>!fn.security_definer||fn.owner!=="postgres"||
        !fn.config?.includes("search_path=pg_catalog")||fn.anon_execute||fn.authenticated_execute||
        fn.public_execute||fn.service_execute))
        throw new Error("COMUN_R5_POST_HELPER_SECURITY_INVALID");

      const triggers=(await db.query(`
        select tgname from pg_trigger where tgname in (
          'comun_relata_projection_decision_append_only',
          'comun_relata_public_entity_projection_guard',
          'comun_relata_projection_suppress_after_review',
          'comun_relata_projection_suppress_after_candidate_change')
          and not tgisinternal order by tgname
      `)).rows;
      const migrationCount=(await db.query(
        "select count(*)::int count from supabase_migrations.schema_migrations where version=$1",[R5]
      )).rows[0]?.count;
      const decisionRows=(await db.query("select count(*)::int count from private.comun_relata_collective_entity_projection_decisions")).rows[0]?.count;
      const projectionRows=(await db.query("select count(*)::int count from public.comun_relata_collective_entity_public_projections")).rows[0]?.count;
      const sources=(await db.query(`
        select
          to_regclass('private.comun_relata_collective_entity_candidates') is not null r3_table,
          to_regclass('private.comun_relata_collective_entity_candidate_reviews') is not null r4_table,
          (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
            where n.nspname='public' and p.proname in (
              'comun_relata_collective_entity_server_candidate_review',
              'comun_relata_collective_entity_server_candidate_review_queue',
              'comun_relata_entity_server_candidate_legitimacy_list_own')) r4_bridges
      `)).rows[0];
      if(triggers.length!==4||migrationCount!==1||decisionRows!==0||projectionRows!==0||
        !sources.r3_table||!sources.r4_table||sources.r4_bridges!==3)
        throw new Error("COMUN_R5_POST_STRUCTURE_INVALID");

      return {status:"COMUN_49_2_R5_POST_STRUCTURE_ACCEPTED",transactionReadOnly:"on"};
    }finally{
      await db.query("ROLLBACK").catch(()=>{});
      await db.end();
    }
  };

  const withWriteTransaction=async(operation)=>{
    requireR5WriteAuthorization({authorization,expectedSha,disposable});
    const db=await connect();
    try{
      await db.query("BEGIN");
      await operation(db);
      await db.query("COMMIT");
    }catch(error){
      await db.query("ROLLBACK").catch(()=>{});
      throw error;
    }finally{await db.end();}
  };

  const applyMigration=async(migration)=>{
    if(manifest.migrations.length!==1||
      manifest.migrations[0].path!==migration.path||
      manifest.migrations[0].sha256!==migration.sha256||
      migration.version!==R5)
      throw new Error("COMUN_R5_MIGRATION_NOT_IN_RELEASE");
    const sql=readFileSync(migration.path,"utf8");
    if(hash(sql)!==migration.sha256||!/^begin;[\s\S]*commit;\s*$/i.test(sql.trim()))
      throw new Error("COMUN_R5_MIGRATION_BYTES_INVALID");
    const body=sql.trim().replace(/^begin;\s*/i,"").replace(/\s*commit;\s*$/i,"");
    await withWriteTransaction(async(db)=>{
      await db.query(body);
      await db.query("insert into supabase_migrations.schema_migrations(version) values ($1)",[R5]);
    });
  };

  const recordLedger=async()=>withWriteTransaction(async(db)=>{
    await db.query(`insert into public.comun_schema_releases
      (release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status)
      values ($1,$2,$3,$4,$5,'applied')`,[
      manifest.release,manifest.releaseLedger.migrationPath,manifest.migrationSetSha256,
      manifest.expectedPreFingerprint,manifest.expectedPostFingerprint
    ]);
  });

  return {capture,verifyPost,applyMigration,recordLedger};
}
