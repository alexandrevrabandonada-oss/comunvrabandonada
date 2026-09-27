import { writeFileSync } from "node:fs";
import pg from "pg";
import { loadValidatedR5Manifest } from "./validate-manifest.mjs";
import { createR5PostgresAdapter,requireR5DisposableUrl } from "./postgres-adapter.mjs";
import { promoteR5Release } from "./promotion-runner.mjs";

for(const name of ["SUPABASE_DB_URL","SUPABASE_ACCESS_TOKEN","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_URL"])
  if(Object.hasOwn(process.env,name))throw new Error("COMUN_R5_DISPOSABLE_PRODUCTION_SECRET_PRESENT");

const url=requireR5DisposableUrl(process.env.COMUN_DISPOSABLE_DB_URL??"");
const adminUrl=requireR5DisposableUrl(process.env.COMUN_DISPOSABLE_ADMIN_DB_URL??"");
if(new URL(url).pathname!==new URL(adminUrl).pathname)
  throw new Error("COMUN_R5_DISPOSABLE_DATABASE_MISMATCH");

const {manifest,baseline}=loadValidatedR5Manifest();
const adapter=createR5PostgresAdapter({url,manifest,disposable:true});
const adminQuery=async(sql)=>{
  const db=new pg.Client({connectionString:adminUrl});await db.connect();
  try{await db.query(sql);}finally{await db.end();}
};
const applyMigration=async(migration)=>{
  await adminQuery(`grant usage, create on schema private to postgres;
    grant create on schema public to postgres;
    grant references on auth.users to postgres;
    grant insert on supabase_migrations.schema_migrations to postgres;`);
  try{await adapter.applyMigration(migration);}
  finally{
    await adminQuery(`revoke usage, create on schema private from postgres;
      revoke create on schema public from postgres;
      revoke references on auth.users from postgres;
      revoke insert on supabase_migrations.schema_migrations from postgres;`);
  }
};

const first=await promoteR5Release({manifest,baseline,...adapter,applyMigration});
if(first.state!=="POST"||first.actions.join(",")!=="R5,LEDGER")
  throw new Error("COMUN_R5_DISPOSABLE_FORWARD_ONLY_INCOMPLETE");
const replay=await promoteR5Release({manifest,baseline,...adapter,applyMigration});
if(replay.state!=="POST"||replay.actions.length!==0)
  throw new Error("COMUN_R5_DISPOSABLE_REPLAY_INVALID");

const output=process.argv.find((arg)=>arg.startsWith("--output="))?.slice(9);
if(!output)throw new Error("COMUN_R5_DISPOSABLE_OUTPUT_MISSING");
writeFileSync(output,JSON.stringify({
  status:"COMUN_49_2_R5_FORWARD_ONLY_REHEARSAL_GREEN",
  firstActions:first.actions,replayActions:replay.actions,finalState:replay.state,
  migrationSha256:manifest.migrations[0].sha256
},null,2)+"\n");
console.log("COMUN_49_2_R5_FORWARD_ONLY_REHEARSAL_GREEN");
