import { createHash } from "node:crypto";
const R5="20260926110454";
const DIVERGED=Object.freeze({state:"DIVERGED",action:"BLOCK"});
const sha256=(value)=>createHash("sha256").update(value).digest("hex");
const historyHash=(list)=>sha256(JSON.stringify(list));
export function classifyR5Release(capture,manifest,baseline){
  if(!capture||!manifest||!baseline||!Array.isArray(capture.migrations)||
    capture.postgresVersion!==manifest.postgresVersion||capture.blockingFindings!==0||
    baseline.sourceMainSha!==manifest.sourceMainSha) return DIVERGED;
  const baseHistory=capture.migrations.filter((v)=>v!==R5);
  if(baseHistory.length!==baseline.migrationHistoryCount||
    historyHash(baseHistory)!==baseline.migrationHistorySha256||
    capture.migrations.filter((v)=>v===R5).length>1) return DIVERGED;
  const pre=capture.migrations.length===baseline.migrationHistoryCount&&!capture.r5Present&&
    capture.runnerFingerprint===manifest.expectedPreFingerprint&&
    capture.canonicalFingerprint===manifest.expectedPreCanonicalFingerprint&&
    !capture.decisionTablePresent&&!capture.projectionTablePresent&&
    capture.bridgeCount===0&&capture.helperCount===0&&capture.triggerCount===0;
  if(pre) return {state:"PRE",action:"APPLY_R5"};
  const post=capture.migrations.length===baseline.migrationHistoryCount+1&&capture.migrations.at(-1)===R5&&
    capture.r5Present&&capture.runnerFingerprint===manifest.expectedPostFingerprint&&
    capture.canonicalFingerprint===manifest.expectedPostCanonicalFingerprint&&
    capture.decisionTablePresent&&capture.projectionTablePresent&&
    capture.bridgeCount===3&&capture.helperCount===6&&capture.triggerCount===4&&
    capture.decisionRows===0&&capture.projectionRows===0;
  if(post) return {state:"POST_PENDING_LEDGER",action:"VERIFY_AND_RECORD_LEDGER"};
  return DIVERGED;
}
