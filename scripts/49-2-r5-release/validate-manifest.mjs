import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const MANIFEST_PATH="supabase/release-bundles/20260927-comun-49-2-r5-public-projection-gate.json";
export const BASELINE_PATH="reports/current/comun-49-2-r5-production-pre.json";
export const DERIVED_PATH="reports/current/comun-49-2-r5-release-disposable-derived.json";
const MIGRATION_PATH="supabase/migrations/20260926110454_comun_relata_collective_entity_public_projection_gate.sql";
const sha256=(value)=>createHash("sha256").update(value).digest("hex");

export function validateR5Manifest({manifest,baseline,derived,baselineBytes,derivedBytes,migrationBytes}){
  const migration=manifest?.migrations?.[0];
  const setHash=sha256(JSON.stringify([[MIGRATION_PATH,migration?.sha256]]));
  const migrationText=migrationBytes.toString("utf8");
  if(
    manifest?.release!=="20260927-comun-49-2-r5-public-projection-gate" ||
    manifest?.sourceMainSha!=="ef5048ffe270b8b76c8d13e305339b2cc693117d" ||
    manifest.migrations?.length!==1 || migration?.order!==1 ||
    migration?.version!=="20260926110454" || migration?.path!==MIGRATION_PATH ||
    sha256(migrationBytes)!==migration.sha256 ||
    migration.sha256!=="4882f10a27a6a38263465498b2b15ce7d127c8c8bee58f2929dbe068834dc409" ||
    manifest.migrationSetSha256!==setHash ||
    manifest.productionPreCaptureRun!==baseline.captureRunId ||
    manifest.productionPreCaptureSha256!==sha256(baselineBytes) ||
    manifest.productionPreCaptureRawSha256!==baseline.captureJsonSha256 ||
    manifest.productionPreCaptureArtifactDigest!==baseline.captureArtifactDigest ||
    manifest.disposableProofRun!==derived.disposableProofRun ||
    manifest.disposableProofDerivedSha256!==sha256(derivedBytes) ||
    manifest.disposableProofArtifactDigest!==derived.disposableProofArtifactDigest ||
    manifest.postgresVersion!==baseline.postgresVersion ||
    manifest.expectedPreFingerprint!==baseline.runnerFingerprint ||
    manifest.expectedPreCanonicalFingerprint!==baseline.canonicalFingerprint ||
    manifest.expectedPostFingerprint!==derived.expectedPostFingerprint ||
    manifest.expectedPostCanonicalFingerprint!==derived.expectedPostCanonicalFingerprint ||
    manifest.expectedBlockingFindings!==0 || manifest.destructiveSql!==false ||
    manifest.requiresPromotion!==true ||
    manifest.releaseLedger?.relation!=="public.comun_schema_releases" ||
    manifest.releaseLedger?.migrationPath!==`bundle:${MANIFEST_PATH}` ||
    manifest.releaseLedger?.migrationSha256!==setHash ||
    manifest.releaseLedger?.status!=="applied" ||
    baseline.scope!=="COMUN_49_2_R5_PRODUCTION_PRE_PINNED" ||
    baseline.sourceMainSha!==manifest.sourceMainSha || baseline.blockingFindings!==0 ||
    baseline.r1Present!==true || baseline.r2Present!==true || baseline.r3Present!==true ||
    baseline.r4Present!==true || baseline.r5Present!==false ||
    baseline.r12Ledger!=="PRESENT_ACCEPTED" || baseline.r3Ledger!=="PRESENT_ACCEPTED" ||
    baseline.r4Ledger!=="PRESENT_ACCEPTED" || baseline.hardeningLedger!=="PRESENT_ACCEPTED" ||
    baseline.r5Ledger!=="ABSENT" || baseline.r5DecisionTablePresent!==false ||
    baseline.r5ProjectionTablePresent!==false || baseline.r5BridgeCount!==0 ||
    baseline.r5TriggerCount!==0 || baseline.migrationHistoryCount!==112 ||
    baseline.migrationHistorySha256!=="df043121c8be2e5a70fe064dc00ca019f11a06d4e4dbd7a49c79f2970121ffbf" ||
    derived.scope!=="COMUN_49_2_R5_RELEASE_DERIVED" ||
    derived.migrationSha256!==migration.sha256 || derived.migrationSetSha256!==setHash ||
    derived.expectedPreFingerprint!==baseline.runnerFingerprint ||
    derived.expectedPreCanonicalFingerprint!==baseline.canonicalFingerprint ||
    derived.postgresVersion!==baseline.postgresVersion || derived.blockingFindings!==0 ||
    derived.decisionRows!==0 || derived.projectionRows!==0 ||
    derived.bridgeCount!==3 || derived.helperCount!==6 || derived.triggerCount!==4 ||
    /future_map_eligibility|COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED|public_latitude|public_longitude|pmtiles/i.test(migrationText)
  ) throw new Error("COMUN_49_2_R5_RELEASE_MANIFEST_INVALID");
  return {manifest,baseline,derived};
}
export function loadValidatedR5Manifest(){
  const manifestBytes=readFileSync(MANIFEST_PATH);
  const baselineBytes=readFileSync(BASELINE_PATH);
  const derivedBytes=readFileSync(DERIVED_PATH);
  const manifest=JSON.parse(manifestBytes),baseline=JSON.parse(baselineBytes),derived=JSON.parse(derivedBytes);
  const migrationBytes=readFileSync(manifest.migrations?.[0]?.path??"");
  return validateR5Manifest({manifest,baseline,derived,baselineBytes,derivedBytes,migrationBytes});
}
if(process.argv[1]?.endsWith("validate-manifest.mjs")){
  loadValidatedR5Manifest();
  console.log("COMUN_49_2_R5_RELEASE_MANIFEST_VALID");
}
