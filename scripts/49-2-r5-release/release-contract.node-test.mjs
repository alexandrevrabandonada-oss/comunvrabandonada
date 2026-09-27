import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadValidatedR5Manifest,validateR5Manifest,MANIFEST_PATH,BASELINE_PATH,DERIVED_PATH } from "./validate-manifest.mjs";
import { classifyR5Release } from "./state-machine.mjs";
const manifestBytes=readFileSync(MANIFEST_PATH),baselineBytes=readFileSync(BASELINE_PATH),derivedBytes=readFileSync(DERIVED_PATH);
const manifest=JSON.parse(manifestBytes),baseline=JSON.parse(baselineBytes),derived=JSON.parse(derivedBytes);
const migrationBytes=readFileSync(manifest.migrations[0].path);
const validate=(o={})=>validateR5Manifest({manifest,baseline,derived,baselineBytes,derivedBytes,migrationBytes,...o});
test("immutable release evidence validates and tampering fails",()=>{
 assert.equal(loadValidatedR5Manifest().manifest.release,manifest.release);
 assert.throws(()=>validate({migrationBytes:Buffer.from("changed")}),/MANIFEST_INVALID/);
 assert.throws(()=>validate({baselineBytes:Buffer.from("changed")}),/MANIFEST_INVALID/);
 assert.throws(()=>validate({derivedBytes:Buffer.from("changed")}),/MANIFEST_INVALID/);
});
test("release cannot open map and requires separate promotion",()=>{
 assert.equal(manifest.requiresPromotion,true);
 assert.equal(manifest.destructiveSql,false);
 assert.doesNotMatch(migrationBytes.toString("utf8"),/future_map_eligibility|COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED|public_latitude|public_longitude|pmtiles/i);
});
test("state machine recognizes exact PRE and exact POST_PENDING_LEDGER only",()=>{
 const base=["a","b"];
 const b={...baseline,migrationHistoryCount:2,migrationHistorySha256:createHash("sha256").update(JSON.stringify(base)).digest("hex")};
 const pre={postgresVersion:"17.6",blockingFindings:0,migrations:base,r5Present:false,
  runnerFingerprint:manifest.expectedPreFingerprint,canonicalFingerprint:manifest.expectedPreCanonicalFingerprint,
  r12Ledger:"PRESENT_ACCEPTED",r3Ledger:"PRESENT_ACCEPTED",r4Ledger:"PRESENT_ACCEPTED",
  hardeningLedger:"PRESENT_ACCEPTED",r5Ledger:"ABSENT",
  decisionTablePresent:false,projectionTablePresent:false,bridgeCount:0,helperCount:0,triggerCount:0};
 assert.deepEqual(classifyR5Release(pre,manifest,b),{state:"PRE",action:"APPLY_R5"});
 const post={...pre,migrations:[...base,"20260926110454"],r5Present:true,
  runnerFingerprint:manifest.expectedPostFingerprint,canonicalFingerprint:manifest.expectedPostCanonicalFingerprint,
  decisionTablePresent:true,projectionTablePresent:true,bridgeCount:3,helperCount:6,triggerCount:4,decisionRows:0,projectionRows:0};
 assert.deepEqual(classifyR5Release(post,manifest,b),{state:"POST_PENDING_LEDGER",action:"VERIFY_AND_RECORD_LEDGER"});
 assert.equal(classifyR5Release({...post,projectionRows:1},manifest,b).state,"DIVERGED");
});
