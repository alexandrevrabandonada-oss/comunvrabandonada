import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyR4Release } from "./state-machine.mjs";

const manifest = JSON.parse(readFileSync(
  "supabase/release-bundles/20260925-comun-49-2-r4-private-legitimacy-eligibility.json","utf8"));
const baseline = JSON.parse(readFileSync(
  "reports/current/comun-49-2-r4-production-pre.json","utf8"));
const pre={...baseline};
const post={
  ...pre,
  migrations:[...baseline.migrations,"20260925014131"],
  runnerFingerprint:manifest.expectedPostFingerprint,
  canonicalFingerprint:manifest.expectedPostCanonicalFingerprint,
  r4Present:true,
  r4ReviewTablePresent:true,
  r4BridgeCount:3,
  r4ReviewTriggerCount:1,
};

test("PRE exact applies only R4",()=>{
  assert.deepEqual(classifyR4Release(pre,manifest,baseline),{state:"PRE",action:"APPLY_R4"});
});
test("POST pending ledger records only ledger",()=>{
  assert.deepEqual(classifyR4Release(post,manifest,baseline),{state:"POST_PENDING_LEDGER",action:"VERIFY_AND_RECORD_LEDGER"});
});
test("POST accepted is write-free replay",()=>{
  assert.deepEqual(classifyR4Release({...post,r4LedgerState:"PRESENT_ACCEPTED"},manifest,baseline),{state:"POST",action:"ALREADY_APPLIED"});
});
for(const [name,value] of Object.entries({
  missingMigration:{...post,migrations:baseline.migrations},
  unknownMigration:{...post,migrations:[...post.migrations,"99999999999999"]},
  ledgerMismatch:{...post,r4LedgerState:"PRESENT_MISMATCH"},
  preWithLedger:{...pre,r4LedgerState:"PRESENT_ACCEPTED"},
  missingTable:{...post,r4ReviewTablePresent:false},
  missingBridge:{...post,r4BridgeCount:2},
  missingTrigger:{...post,r4ReviewTriggerCount:0},
  changedFingerprint:{...post,canonicalFingerprint:"0".repeat(64)},
  securityFinding:{...post,blockingFindings:1},
  publicRelation:{...post,publicCollectiveRelationCount:1},
  r12Drift:{...post,r12Ledger:"PRESENT_MISMATCH"},
  r3Drift:{...post,r3Ledger:"PRESENT_MISMATCH"},
  hardeningDrift:{...post,hardeningLedger:"PRESENT_MISMATCH"},
  missingR3Table:{...post,candidateTablePresent:false},
  missingR3Bridge:{...post,candidateBridgePresent:false},
  missingR3Trigger:{...post,r3TriggerCount:3},
})) test(`${name} blocks`,()=>{
  assert.deepEqual(classifyR4Release(value,manifest,baseline),{state:"DIVERGED",action:"BLOCK"});
});
