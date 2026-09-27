import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { classifyR5Release } from "./state-machine.mjs";
import { promoteR5Release } from "./promotion-runner.mjs";
import { requireR5WriteAuthorization } from "./postgres-adapter.mjs";

const manifest=JSON.parse(readFileSync("supabase/release-bundles/20260927-comun-49-2-r5-public-projection-gate.json","utf8"));
const baseline=JSON.parse(readFileSync("reports/current/comun-49-2-r5-production-pre.json","utf8"));
const base=["a","b"];
const b={...baseline,migrationHistoryCount:2,migrationHistorySha256:createHash("sha256").update(JSON.stringify(base)).digest("hex")};
const pre={
  postgresVersion:manifest.postgresVersion,blockingFindings:0,migrations:base,
  runnerFingerprint:manifest.expectedPreFingerprint,canonicalFingerprint:manifest.expectedPreCanonicalFingerprint,
  r12Ledger:"PRESENT_ACCEPTED",r3Ledger:"PRESENT_ACCEPTED",r4Ledger:"PRESENT_ACCEPTED",hardeningLedger:"PRESENT_ACCEPTED",
  r5Ledger:"ABSENT",r5Present:false,decisionTablePresent:false,projectionTablePresent:false,
  bridgeCount:0,helperCount:0,triggerCount:0,decisionRows:null,projectionRows:null
};
const post={...pre,migrations:[...base,"20260926110454"],r5Present:true,
  runnerFingerprint:manifest.expectedPostFingerprint,canonicalFingerprint:manifest.expectedPostCanonicalFingerprint,
  decisionTablePresent:true,projectionTablePresent:true,bridgeCount:3,helperCount:6,triggerCount:4,
  decisionRows:0,projectionRows:0
};

test("state machine has PRE, POST_PENDING_LEDGER and terminal POST",()=>{
  assert.deepEqual(classifyR5Release(pre,manifest,b),{state:"PRE",action:"APPLY_R5"});
  assert.deepEqual(classifyR5Release(post,manifest,b),{state:"POST_PENDING_LEDGER",action:"VERIFY_AND_RECORD_LEDGER"});
  assert.deepEqual(classifyR5Release({...post,r5Ledger:"PRESENT_ACCEPTED"},manifest,b),{state:"POST",action:"ALREADY_APPLIED"});
});
test("ledger or prior-release drift blocks",()=>{
  for(const capture of [
    {...pre,r12Ledger:"PRESENT_MISMATCH"},
    {...post,r4Ledger:"ABSENT"},
    {...post,r5Ledger:"PRESENT_MISMATCH"},
    {...post,decisionRows:1},
    {...post,projectionRows:1}
  ]) assert.equal(classifyR5Release(capture,manifest,b).state,"DIVERGED");
});
test("runner applies migration then ledger and replay writes nothing",async()=>{
  let capture={...pre};const calls=[];
  const first=await promoteR5Release({
    manifest,baseline:b,capture:async()=>capture,
    applyMigration:async()=>{calls.push("R5");capture={...post};},
    verifyPost:async()=>calls.push("VERIFY"),
    recordLedger:async()=>{calls.push("LEDGER");capture={...post,r5Ledger:"PRESENT_ACCEPTED"};}
  });
  assert.deepEqual(first,{state:"POST",actions:["R5","LEDGER"]});
  assert.deepEqual(calls,["R5","VERIFY","LEDGER"]);
  const replay=await promoteR5Release({
    manifest,baseline:b,capture:async()=>capture,
    applyMigration:async()=>{throw Error("write");},
    verifyPost:async()=>{throw Error("verify");},
    recordLedger:async()=>{throw Error("write");}
  });
  assert.deepEqual(replay,{state:"POST",actions:[]});
});
test("Production write requires exact R5 authorization and main context",()=>{
  const oldSha=process.env.GITHUB_SHA,oldRef=process.env.GITHUB_REF;
  process.env.GITHUB_SHA="a".repeat(40);process.env.GITHUB_REF="refs/heads/main";
  try{
    assert.throws(()=>requireR5WriteAuthorization({authorization:"COMUN_49_2_R4_PRODUCTION_SCHEMA_WRITE",expectedSha:"a".repeat(40),disposable:false}),/WRITE_AUTHORIZATION/);
    assert.doesNotThrow(()=>requireR5WriteAuthorization({authorization:"COMUN_49_2_R5_PRODUCTION_SCHEMA_WRITE",expectedSha:"a".repeat(40),disposable:false}));
  }finally{
    if(oldSha===undefined)delete process.env.GITHUB_SHA;else process.env.GITHUB_SHA=oldSha;
    if(oldRef===undefined)delete process.env.GITHUB_REF;else process.env.GITHUB_REF=oldRef;
  }
  assert.doesNotThrow(()=>requireR5WriteAuthorization({disposable:true}));
});
test("promotion workflow is owner issue-only and does not invoke business RPCs",()=>{
  const workflow=readFileSync(".github/workflows/comun-49-2-r5-schema-promotion.yml","utf8");
  assert.match(workflow,/types: \[labeled\]/);
  assert.match(workflow,/AUTHOR_ASSOCIATION.*OWNER|test "\$AUTHOR_ASSOCIATION" = OWNER/s);
  assert.match(workflow,/COMUN_49_2_R5_PRODUCTION_SCHEMA_WRITE/);
  assert.match(workflow,/git ls-remote origin refs\/heads\/main/);
  assert.match(workflow,/--mode=preflight/);
  assert.match(workflow,/--mode=postflight/);
  assert.doesNotMatch(workflow,/workflow_dispatch|pull_request|projection_decide\(|projection_review_queue\(/);
});
