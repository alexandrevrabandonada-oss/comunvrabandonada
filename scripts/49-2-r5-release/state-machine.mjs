import { createHash } from "node:crypto";
const R5="20260926110454";
const DIVERGED=Object.freeze({state:"DIVERGED",action:"BLOCK"});
const sha256=(value)=>createHash("sha256").update(value).digest("hex");
const historyHash=(list)=>sha256(JSON.stringify(list));

export function classifyR5Release(capture,manifest,baseline){
  if(!capture||!manifest||!baseline||!Array.isArray(capture.migrations)||
    capture.postgresVersion!==manifest.postgresVersion||
    capture.blockingFindings!==0||
    baseline.sourceMainSha!==manifest.sourceMainSha||
    capture.r12Ledger!=="PRESENT_ACCEPTED"||
    capture.r3Ledger!=="PRESENT_ACCEPTED"||
    capture.r4Ledger!=="PRESENT_ACCEPTED"||
    capture.hardeningLedger!=="PRESENT_ACCEPTED")
    return DIVERGED;

  const baseHistory=capture.migrations.filter((version)=>version!==R5);
  if(baseHistory.length!==baseline.migrationHistoryCount||
    historyHash(baseHistory)!==baseline.migrationHistorySha256||
    capture.migrations.filter((version)=>version===R5).length>1)
    return DIVERGED;

  const pre=
    capture.migrations.length===baseline.migrationHistoryCount&&
    capture.r5Present===false&&
    capture.runnerFingerprint===manifest.expectedPreFingerprint&&
    capture.canonicalFingerprint===manifest.expectedPreCanonicalFingerprint&&
    capture.r5Ledger==="ABSENT"&&
    capture.decisionTablePresent===false&&
    capture.projectionTablePresent===false&&
    capture.bridgeCount===0&&capture.helperCount===0&&capture.triggerCount===0;
  if(pre) return {state:"PRE",action:"APPLY_R5"};

  const postSchema=
    capture.migrations.length===baseline.migrationHistoryCount+1&&
    capture.migrations.at(-1)===R5&&
    capture.r5Present===true&&
    capture.runnerFingerprint===manifest.expectedPostFingerprint&&
    capture.canonicalFingerprint===manifest.expectedPostCanonicalFingerprint&&
    capture.decisionTablePresent===true&&
    capture.projectionTablePresent===true&&
    capture.bridgeCount===3&&capture.helperCount===6&&capture.triggerCount===4&&
    capture.decisionRows===0&&capture.projectionRows===0;
  if(!postSchema) return DIVERGED;

  if(capture.r5Ledger==="ABSENT")
    return {state:"POST_PENDING_LEDGER",action:"VERIFY_AND_RECORD_LEDGER"};
  if(capture.r5Ledger==="PRESENT_ACCEPTED")
    return {state:"POST",action:"ALREADY_APPLIED"};
  return DIVERGED;
}
