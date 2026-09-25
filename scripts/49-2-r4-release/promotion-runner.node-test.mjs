import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { promoteR4Release } from "./promotion-runner.mjs";

const manifest=JSON.parse(readFileSync(
  "supabase/release-bundles/20260925-comun-49-2-r4-private-legitimacy-eligibility.json","utf8"));
const baseline=JSON.parse(readFileSync(
  "reports/current/comun-49-2-r4-production-pre.json","utf8"));
const post={
  ...baseline,
  migrations:[...baseline.migrations,"20260925014131"],
  runnerFingerprint:manifest.expectedPostFingerprint,
  canonicalFingerprint:manifest.expectedPostCanonicalFingerprint,
  r4Present:true,r4ReviewTablePresent:true,r4BridgeCount:3,r4ReviewTriggerCount:1,
};

test("PRE applies R4 then ledger",async()=>{
  let capture={...baseline}; const calls=[];
  const result=await promoteR4Release({
    manifest,baseline,capture:async()=>capture,
    applyMigration:async(migration)=>{calls.push(migration.version);capture={...post};},
    verifyPost:async()=>calls.push("VERIFY"),
    recordLedger:async()=>{calls.push("LEDGER");capture={...post,r4LedgerState:"PRESENT_ACCEPTED"};}
  });
  assert.deepEqual(result,{state:"POST",actions:["R4","LEDGER"]});
  assert.deepEqual(calls,["20260925014131","VERIFY","LEDGER"]);
});
test("POST_PENDING_LEDGER never replays migration",async()=>{
  let capture={...post}; const calls=[];
  await promoteR4Release({
    manifest,baseline,capture:async()=>capture,
    applyMigration:async()=>{throw Error("unexpected replay");},
    verifyPost:async()=>calls.push("VERIFY"),
    recordLedger:async()=>{calls.push("LEDGER");capture={...post,r4LedgerState:"PRESENT_ACCEPTED"};}
  });
  assert.deepEqual(calls,["VERIFY","LEDGER"]);
});
test("POST replay writes nothing",async()=>{
  const result=await promoteR4Release({
    manifest,baseline,capture:async()=>({...post,r4LedgerState:"PRESENT_ACCEPTED"}),
    applyMigration:async()=>{throw Error("unexpected write");},
    verifyPost:async()=>{throw Error("unexpected verify");},
    recordLedger:async()=>{throw Error("unexpected write");}
  });
  assert.deepEqual(result,{state:"POST",actions:[]});
});
test("DIVERGED blocks",async()=>{
  await assert.rejects(promoteR4Release({
    manifest,baseline,capture:async()=>({...post,canonicalFingerprint:"0".repeat(64)}),
    applyMigration:async()=>{},verifyPost:async()=>{},recordLedger:async()=>{}
  }),/COMUN_49_2_R4_RELEASE_DIVERGED/);
});
