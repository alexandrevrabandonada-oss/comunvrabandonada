import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadValidatedR4Manifest } from "./validate-manifest.mjs";
import { createR4PostgresAdapter } from "./postgres-adapter.mjs";
import { classifyR4Release } from "./state-machine.mjs";
import { promoteR4Release } from "./promotion-runner.mjs";

const arg=(name)=>process.argv.find((item)=>item.startsWith(`--${name}=`))?.slice(name.length+3);
const mode=arg("mode");
const expectedSha=arg("expected-sha")??process.env.COMUN_R4_EXPECTED_MAIN_SHA;
const output=arg("output")??".ci-artifacts/comun-49-2-r4-promotion/result.json";
if (
  !["inspect","preflight","promote","postflight"].includes(mode) ||
  !/^[a-f0-9]{40}$/.test(expectedSha??"") ||
  process.env.GITHUB_SHA!==expectedSha ||
  process.env.GITHUB_REF!=="refs/heads/main"
) throw new Error("COMUN_R4_PRODUCTION_MAIN_CONTEXT_INVALID");
if(!process.env.SUPABASE_DB_URL) throw new Error("COMUN_R4_PRODUCTION_DB_URL_MISSING");

const {manifest,baseline}=loadValidatedR4Manifest();
const adapter=createR4PostgresAdapter({
  url:process.env.SUPABASE_DB_URL,
  manifest,
  expectedSha,
  authorization:process.env.COMUN_R4_SCHEMA_WRITE_AUTHORIZATION
});
const persist=(document)=>{mkdirSync(dirname(output),{recursive:true});writeFileSync(output,`${JSON.stringify(document,null,2)}\n`);};
const inspect=async()=>{
  const capture=await adapter.capture();
  return {mode,expectedSha,capture,classification:classifyR4Release(capture,manifest,baseline)};
};

try {
  if(mode==="inspect"||mode==="preflight"){
    const result=await inspect(); persist(result);
    if(result.classification.state==="DIVERGED") throw new Error("COMUN_R4_PRODUCTION_DIVERGED");
    if(mode==="preflight"&&result.classification.state==="POST_PENDING_LEDGER") await adapter.verifyPost();
    console.log(`COMUN_R4_${mode.toUpperCase()}_${result.classification.state}`);
  } else if(mode==="promote"){
    const result=await promoteR4Release({manifest,baseline,...adapter});
    persist({mode,expectedSha,result});
    if(result.state!=="POST") throw new Error("COMUN_R4_PROMOTION_INCOMPLETE");
    console.log(`COMUN_R4_PROMOTION_POST:${result.actions.join(",")||"REPLAY"}`);
  } else {
    const result=await inspect(); persist(result);
    if(result.classification.state!=="POST") throw new Error("COMUN_R4_POSTFLIGHT_NOT_POST");
    await adapter.verifyPost();
    console.log("COMUN_49_2_R4_PRIVATE_SCHEMA_PRODUCTION_GREEN");
  }
} catch(error) {
  if(mode!=="inspect"){try{const failure=await inspect();persist({...failure,failure:error.message});}catch{}}
  throw error;
}
