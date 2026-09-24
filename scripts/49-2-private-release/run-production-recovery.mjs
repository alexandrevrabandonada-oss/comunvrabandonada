import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import pg from "pg";
import { createPostgresAdapter } from "./postgres-adapter.mjs";
import { classifyPrivateSchemaRecovery } from "./recovery-state-machine.mjs";
import { resumePrivateSchemaRecovery } from "./recovery-runner.mjs";

const manifest = JSON.parse(readFileSync(
  "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json","utf8"));
const baseline = JSON.parse(readFileSync(
  "reports/current/comun-49-2-private-release-production-pre.json","utf8"));
const recovery = JSON.parse(readFileSync(
  "reports/current/comun-49-2-private-schema-recovery-fingerprints.json","utf8"));

const arg=(name)=>process.argv.find(v=>v.startsWith(`--${name}=`))?.slice(name.length+3);
const mode=arg("mode")??"inspect";
const output=arg("output")??".ci-artifacts/comun-49-2-private-schema-recovery/result.json";
const expectedSha=arg("expected-sha")??process.env.COMUN_49_2_EXPECTED_MAIN_SHA;
const url=process.env.SUPABASE_DB_URL;
const persist=(doc)=>{ mkdirSync(dirname(output),{recursive:true}); writeFileSync(output,`${JSON.stringify(doc,null,2)}\n`); };

if (!url) throw new Error("COMUN_49_2_PRODUCTION_DB_URL_MISSING");
if (!/^[a-f0-9]{40}$/.test(expectedSha??"")) throw new Error("COMUN_49_2_EXPECTED_MAIN_SHA_INVALID");
if (process.env.GITHUB_SHA!==expectedSha) throw new Error("COMUN_49_2_GITHUB_SHA_MISMATCH");
if (process.env.GITHUB_REF!=="refs/heads/main") throw new Error("COMUN_49_2_MAIN_REF_REQUIRED");
if (mode==="recover" && process.env.COMUN_49_2_SCHEMA_RECOVERY_AUTHORIZATION!=="COMUN_49_2_PRODUCTION_SCHEMA_RECOVERY")
  throw new Error("COMUN_49_2_PRODUCTION_RECOVERY_AUTHORIZATION_REQUIRED");

const adapter=createPostgresAdapter({
  url,manifest,
  authorization:{kind:"COMUN_49_2_PRODUCTION_SCHEMA_RECOVERY",sha:expectedSha},
});
const classify=async()=>{
  const capture=await adapter.capture();
  const classification=classifyPrivateSchemaRecovery(capture,manifest,{migrations:baseline.migrations},recovery);
  return {capture,classification};
};

async function verifyPost(){
  const client=new pg.Client({connectionString:url});
  await client.connect();
  try{
    await client.query("BEGIN READ ONLY");
    const modeRow=await client.query("select current_setting('transaction_read_only') value");
    if(modeRow.rows[0]?.value!=="on") throw new Error("COMUN_49_2_RECOVERY_POST_NOT_READ_ONLY");
    const bridges=await client.query(`
      select p.proname,p.prosecdef,coalesce(array_to_string(p.proconfig,','),'') config,
        pg_get_userbyid(p.proowner) owner,
        has_function_privilege('public',p.oid,'EXECUTE') public_execute,
        has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
        has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
        has_function_privilege('service_role',p.oid,'EXECUTE') service_role_execute
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname like 'comun_relata_collective_entity_server_%'
      order by p.proname`);
    if(bridges.rows.length!==4 || bridges.rows.some(r=>!r.prosecdef||r.config!=="search_path=pg_catalog"||r.owner!=="postgres"||r.public_execute||r.anon_execute||r.authenticated_execute||!r.service_role_execute))
      throw new Error("COMUN_49_2_RECOVERY_POST_BRIDGE_SECURITY_INVALID");
    const publicRelations=await client.query(`
      select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname like 'comun_relata_collective_entity%' order by c.relname`);
    if(publicRelations.rows.length) throw new Error("COMUN_49_2_RECOVERY_PUBLIC_PROJECTION_PRESENT");
    const grants=await client.query(`
      select case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end grantee,
        x.privilege_type privilege
      from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x
      where n.nspname='public' order by 1,2`);
    const exposedCreate=grants.rows.some(r=>["PUBLIC","anon","authenticated"].includes(r.grantee)&&r.privilege==="CREATE");
    const postgresUsage=grants.rows.some(r=>r.grantee==="postgres"&&r.privilege==="USAGE");
    if(exposedCreate||!postgresUsage) throw new Error("COMUN_49_2_RECOVERY_SCHEMA_GRANT_INVALID");
    return {transactionReadOnly:"on",bridgeCount:4,publicCollectiveRelations:[],postgresPublicUsage:true,exposedPublicCreate:false};
  } finally { await client.query("ROLLBACK").catch(()=>{}); await client.end(); }
}

try{
  if(mode==="inspect"||mode==="preflight"){
    const state=await classify();
    if(mode==="preflight" && !["PARTIAL_R1_RECOVERY","POST_PENDING_LEDGER_RECOVERY","POST_RECOVERY"].includes(state.classification.state))
      throw new Error(`COMUN_49_2_RECOVERY_PREFLIGHT_INVALID:${state.classification.state}`);
    persist({scope:"COMUN_49_2_PRIVATE_SCHEMA_RECOVERY",mode,sha:expectedSha,...state});
    console.log(`COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_${mode.toUpperCase()}:${state.classification.state}`);
  } else if(mode==="recover"){
    const initial=await classify();
    const result=await resumePrivateSchemaRecovery({
      readState:async()=>(await classify()).classification.state,
      applyR2:async()=>adapter.applyMigration(manifest.migrations[1]),
      recordLedger:async()=>adapter.recordLedger(manifest),
    });
    const final=await classify();
    if(final.classification.state!=="POST_RECOVERY") throw new Error("COMUN_49_2_RECOVERY_POST_STATE_INVALID");
    const structural=await verifyPost();
    persist({scope:"COMUN_49_2_PRIVATE_SCHEMA_RECOVERY",mode,sha:expectedSha,initial:initial.classification.state,actions:result.actions,final:final.classification.state,capture:final.capture,structural,r1Reapplied:false,r3Opened:false});
    console.log(`COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_GREEN:${result.actions.join(",")||"REPLAY"}`);
  } else if(mode==="postflight"){
    const final=await classify();
    if(final.classification.state!=="POST_RECOVERY") throw new Error(`COMUN_49_2_RECOVERY_POSTFLIGHT_INVALID:${final.classification.state}`);
    const structural=await verifyPost();
    persist({scope:"COMUN_49_2_PRIVATE_SCHEMA_RECOVERY",mode,sha:expectedSha,state:final.classification.state,capture:final.capture,structural});
    console.log("COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_POSTFLIGHT_GREEN");
  } else throw new Error("COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_MODE_INVALID");
}catch(error){
  const marker=error instanceof Error&&/^[A-Z0-9_:.-]+$/.test(error.message)?error.message:"COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_FAILED";
  try{persist({scope:"COMUN_49_2_PRIVATE_SCHEMA_RECOVERY",mode,status:"BLOCKED",marker});}catch{}
  console.error(marker); process.exitCode=1;
}
