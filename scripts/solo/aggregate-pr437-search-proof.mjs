import { readFile, writeFile } from "node:fs/promises";
import {
  classifyVersionEquivalence,
  loadReleaseContract,
  PINNED_IMAGE,
  requireDisposableCapture,
  requireProductionCapture,
  sha256,
} from "./pr437-search-proof-contract.mjs";
import { validateLocalProof } from "./prove-search-sync-local-temp-table.mjs";

export function aggregateProof({
  production,
  disposableBefore,
  disposableAfter,
  proof,
  fixture,
  captureSha256,
  runSha,
  runId,
}) {
  const historical = fixture.productionHistoricalLint;
  const first = proof?.rawFindingContract?.[0];
  if (
    proof?.status !== "GREEN" ||
    proof.productionCaptureSha256 !== captureSha256 ||
    proof.runSha !== runSha ||
    proof.runId !== runId ||
    proof.imageDigest !== PINNED_IMAGE ||
    proof.productionDefinitionSha256 !==
      production.searchFunction.definitionSha256 ||
    proof.disposableDefinitionSha256 !==
      production.searchFunction.definitionSha256 ||
    proof.runnerFingerprint !== production.runnerFingerprint ||
    proof.canonicalFingerprint !== production.canonicalFingerprint ||
    proof.releaseLedgerState !== "PRESENT_ACCEPTED" ||
    proof.migrationSha256 !== production.releaseIdentity.migrationSha256 ||
    proof.manifestSha256 !== production.releaseIdentity.manifestSha256 ||
    JSON.stringify(proof.rawFindingContract) !==
      JSON.stringify(fixture.expectedRawFindings) ||
    proof.rawFindingCount !== 3 ||
    proof.tempTableColumnCount !== 13 ||
    proof.checkerErrors !== 0 ||
    proof.negativeFixtureDetected !== true ||
    proof.countsRestored !== true ||
    proof.tempTableRemoved !== true ||
    proof.negativeFixtureRemoved !== true
  )
    throw new Error("COMUN_SEARCH_LINT_PROOF_ARTIFACT_INCOMPLETE");
  validateLocalProof(proof);
  requireDisposableCapture(disposableBefore, production, fixture);
  requireDisposableCapture(disposableAfter, production, fixture);
  if (
    disposableBefore.runnerFingerprint !== disposableAfter.runnerFingerprint ||
    disposableBefore.canonicalFingerprint !==
      disposableAfter.canonicalFingerprint
  )
    throw new Error("COMUN_SEARCH_LINT_DISPOSABLE_ROLLBACK_DRIFT");
  const versionEquivalence = classifyVersionEquivalence(
    production.plpgsqlCheckCatalog.available.defaultVersion,
    proof.plpgsqlCheckVersion,
  );
  if (
    versionEquivalence === "MISMATCH" ||
    versionEquivalence !== proof.versionEquivalence
  )
    throw new Error("COMUN_SEARCH_LINT_EXTENSION_VERSION_MISMATCH");
  const historicalMatch =
    historical?.runId === "35891520337" &&
    historical.function === "public.comun_sync_public_search_projection" &&
    historical.sqlState === "42P01" &&
    historical.message ===
      'relation "comun_search_candidates" does not exist' &&
    historical.line === first?.line &&
    historical.querySha256 === first?.querySha256;
  if (!historicalMatch)
    throw new Error("COMUN_SEARCH_LINT_PATCH_EQUIVALENCE_UNPROVEN");
  return {
    scope: "COMUN_PR437_SEARCH_SYNC_REMOTE_DISPOSABLE_PROOF",
    status: "GREEN",
    marker: "SEARCH_SYNC_RUNTIME_CONTRACT_PROVED",
    versionEquivalence,
    equivalenceBasis:
      versionEquivalence === "EXACT"
        ? "EXACT_CATALOG_VERSION"
        : "SAME_SUPABASE_POSTGRES_17_6_LINEAGE_PLUS_MATCHED_PRODUCTION_2_7_RAW_FINDING_AND_DISPOSABLE_CAUSAL_NEGATIVE_CONTROLS",
    productionPostgresVersion: production.postgresVersion,
    disposablePostgresVersion: disposableBefore.postgresVersion,
    productionAvailableVersions: production.plpgsqlCheckCatalog.versions.map(
      (row) => row.version,
    ),
    disposablePlpgsqlCheckVersion: proof.plpgsqlCheckVersion,
    productionDefinitionSha256: production.searchFunction.definitionSha256,
    disposableDefinitionSha256: proof.disposableDefinitionSha256,
    runnerFingerprint: production.runnerFingerprint,
    canonicalFingerprint: production.canonicalFingerprint,
    releaseLedgerState: production.releaseLedgerState,
    canonicalBlockingFindings: production.blockingFindings,
    migrationSha256: proof.migrationSha256,
    manifestSha256: proof.manifestSha256,
    rawFindingCount: proof.rawFindingCount,
    rawFindingContract: proof.rawFindingContract,
    tempTableColumnCount: proof.tempTableColumnCount,
    postRuntimeCheckerErrors: proof.checkerErrors,
    negativeControlDetected: proof.negativeFixtureDetected,
    rollbackRestored:
      proof.countsRestored &&
      proof.tempTableRemoved &&
      proof.negativeFixtureRemoved,
    imageDigest: proof.imageDigest,
    imageTag: proof.imageTag,
    historicalProductionLintRun: historical.runId,
    productionCaptureSha256: captureSha256,
    runSha,
    runId,
    productionWorkflowDdlDmlSteps: 0,
  };
}

if (process.argv[1]?.endsWith("aggregate-pr437-search-proof.mjs")) {
  const arg = (key) =>
    process.argv
      .find((value) => value.startsWith(`--${key}=`))
      ?.slice(key.length + 3);
  const output = arg("output");
  try {
    const captureBytes = await readFile(arg("production-capture"));
    if (sha256(captureBytes) !== arg("capture-sha256"))
      throw new Error("COMUN_SEARCH_LINT_PRODUCTION_ARTIFACT_HASH_MISMATCH");
    const { reference, release, manifestSha256 } = await loadReleaseContract();
    const production = requireProductionCapture(
      JSON.parse(captureBytes),
      reference,
      release,
      manifestSha256,
    );
    const [disposableBefore, disposableAfter, proof, fixture] =
      await Promise.all([
        readFile(arg("disposable-before"), "utf8").then(JSON.parse),
        readFile(arg("disposable-after"), "utf8").then(JSON.parse),
        readFile(arg("proof"), "utf8").then(JSON.parse),
        readFile(
          "tests/fixtures/pr437-post/fixture-manifest.json",
          "utf8",
        ).then(JSON.parse),
      ]);
    const artifact = aggregateProof({
      production,
      disposableBefore,
      disposableAfter,
      proof,
      fixture,
      captureSha256: arg("capture-sha256"),
      runSha: arg("run-sha"),
      runId: arg("run-id"),
    });
    await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(artifact.marker);
  } catch (error) {
    const marker = /^[A-Z0-9_]+$/.test(error.message)
      ? error.message
      : "COMUN_SEARCH_LINT_AGGREGATION_FAILED";
    if (output)
      await writeFile(
        output,
        `${JSON.stringify({ scope: "COMUN_PR437_SEARCH_SYNC_REMOTE_DISPOSABLE_PROOF", status: "BLOCKED", marker }, null, 2)}\n`,
      );
    console.error(marker);
    process.exitCode = 1;
  }
}
