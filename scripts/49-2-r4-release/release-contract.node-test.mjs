import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  loadValidatedR4Manifest, validateR4Manifest,
  MANIFEST_PATH, BASELINE_PATH, DERIVED_PATH,
} from "./validate-manifest.mjs";
import { requireDisposableUrl, requireR4WriteAuthorization } from "./postgres-adapter.mjs";

const manifestBytes=readFileSync(MANIFEST_PATH);
const baselineBytes=readFileSync(BASELINE_PATH);
const derivedBytes=readFileSync(DERIVED_PATH);
const manifest=JSON.parse(manifestBytes);
const baseline=JSON.parse(baselineBytes);
const derived=JSON.parse(derivedBytes);
const migrationBytes=readFileSync(manifest.migrations[0].path);
const validate=(overrides={})=>validateR4Manifest({
  manifest,baseline,derived,baselineBytes,derivedBytes,migrationBytes,...overrides
});

test("manifest pins PRE, POST and migration bytes",()=>{
  assert.equal(loadValidatedR4Manifest().manifest.release,manifest.release);
});
test("manifest rejects changed immutable inputs",()=>{
  assert.throws(()=>validate({migrationBytes:Buffer.from("changed")}),/MANIFEST_INVALID/);
  assert.throws(()=>validate({baselineBytes:Buffer.from("changed")}),/MANIFEST_INVALID/);
  assert.throws(()=>validate({derivedBytes:Buffer.from("changed")}),/MANIFEST_INVALID/);
});
test("manifest rejects changed POST or ledger hash",()=>{
  assert.throws(()=>validate({manifest:{...manifest,expectedPostFingerprint:"0".repeat(64)}}),/MANIFEST_INVALID/);
  assert.throws(()=>validate({manifest:{...manifest,releaseLedger:{...manifest.releaseLedger,migrationSha256:"0".repeat(64)}}}),/MANIFEST_INVALID/);
});
test("disposable destination is local only",()=>{
  const url="postgresql://postgres:postgres@127.0.0.1:57532/comun_pr437_prodlike_post_123";
  assert.equal(requireDisposableUrl(url),url);
  assert.throws(()=>requireDisposableUrl("postgresql://postgres:postgres@db.supabase.co:5432/postgres"),/DISPOSABLE_DESTINATION/);
});
test("Production write needs R4-specific authorization",()=>{
  const oldSha=process.env.GITHUB_SHA,oldRef=process.env.GITHUB_REF;
  process.env.GITHUB_SHA="a".repeat(40); process.env.GITHUB_REF="refs/heads/main";
  try{
    assert.throws(()=>requireR4WriteAuthorization({
      authorization:"COMUN_49_2_R3_PRODUCTION_SCHEMA_WRITE",expectedSha:"a".repeat(40),disposable:false
    }),/WRITE_AUTHORIZATION/);
    assert.doesNotThrow(()=>requireR4WriteAuthorization({
      authorization:"COMUN_49_2_R4_PRODUCTION_SCHEMA_WRITE",expectedSha:"a".repeat(40),disposable:false
    }));
  } finally {
    if(oldSha===undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA=oldSha;
    if(oldRef===undefined) delete process.env.GITHUB_REF; else process.env.GITHUB_REF=oldRef;
  }
  assert.doesNotThrow(()=>requireR4WriteAuthorization({disposable:true}));
});
test("promotion workflow is issue-only and never calls business RPCs",()=>{
  const workflow=readFileSync(".github/workflows/comun-49-2-r4-private-schema-promotion.yml","utf8");
  assert.match(workflow,/types: \[labeled\]/);
  assert.match(workflow,/COMUN_49_2_R4_PRODUCTION_SCHEMA_WRITE/);
  assert.match(workflow,/git ls-remote origin refs\/heads\/main/);
  assert.match(workflow,/--mode=preflight/);
  assert.match(workflow,/--mode=postflight/);
  assert.doesNotMatch(workflow,/workflow_dispatch|pull_request|supabase db push|candidate_review\(|candidate_prepare\(/);
});
test("PRE capture is read-only",()=>{
  const workflow=readFileSync(".github/workflows/comun-49-2-r4-production-pre-capture.yml","utf8");
  const capture=readFileSync("scripts/49-2-r4-release/capture-production-pre.mjs","utf8");
  assert.match(workflow,/types: \[opened\]/);
  assert.match(workflow,/PGOPTIONS: -c default_transaction_read_only=on/);
  assert.match(capture,/BEGIN READ ONLY/);
  assert.match(capture,/ROLLBACK/);
  assert.doesNotMatch(workflow,/workflow_dispatch|CREATE EXTENSION|supabase db lint/);
});
