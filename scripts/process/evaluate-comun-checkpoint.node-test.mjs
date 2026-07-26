import assert from "node:assert/strict";
import test from "node:test";
import {
  countRepeatedRuns,
  evaluateComumCheckpoint,
  limitImprovements,
  resolveSmokeRoutes,
  sanitizeProcessData,
} from "./evaluate-comun-checkpoint.mjs";

function validInput(overrides = {}) {
  return {
    checkpointId: "t44-3",
    candidateSha: "a".repeat(40),
    mergeSha: "b".repeat(40),
    pr: {
      number: 40,
      branch: "codex/tijolo-44-3-acao-memoria",
      base: "main",
      commits: 3,
      changedFiles: 12,
      headSha: "a".repeat(40),
      mergeSha: "b".repeat(40),
      merged: true,
    },
    candidateShas: ["a".repeat(40)],
    runs: ["MICRO", "CHECKPOINT", "RELEASE/FULL"].map((label) => ({
      label,
      conclusion: "success",
      runAttempt: 1,
      durationMs: 1_000,
    })),
    deployments: [{ environment: "Production", state: "success" }],
    failedJobs: 0,
    artifacts: 1,
    toolbar: { unresolved: 0 },
    humanInterventions: [],
    smoke: { status: "passed", errors: [] },
    remoteWrites: "none",
    remoteBranchDeleted: true,
    mainIntegrated: true,
    ...overrides,
  };
}

test("emite COMUN_FLOW_GREEN com evidência completa", () => {
  const review = evaluateComumCheckpoint(validInput());
  assert.equal(review.processDecision, "COMUN_FLOW_GREEN");
  assert.equal(review.scores.integration_quality.status, "green");
});

test("retrospectiva incompleta emite GREEN_WITH_ADJUSTMENT", () => {
  const review = evaluateComumCheckpoint(
    validInput({ retroactive: true, humanInterventions: undefined }),
  );
  assert.equal(review.processDecision, "COMUN_FLOW_GREEN_WITH_ADJUSTMENT");
  assert.equal(review.scores.evidence_quality.status, "yellow");
});

test("smoke vermelho emite COMUN_FLOW_RED", () => {
  const review = evaluateComumCheckpoint(
    validInput({ smoke: { status: "failed", errors: ["500"] } }),
  );
  assert.equal(review.processDecision, "COMUN_FLOW_RED");
  assert.match(review.integrity.blockers.join(","), /production_smoke_failed/);
});

test("limita melhorias a três ações concretas", () => {
  assert.equal(
    limitImprovements([
      { action: "a" },
      { action: "b" },
      { action: "c" },
      { action: "d" },
    ]).length,
    3,
  );
});

test("remove dados sensíveis de métricas", () => {
  const value = sanitizeProcessData({
    token: "ghp_secret",
    url: "https://safe.example",
    dsn: "postgres://user:pass@host/db",
  });
  assert.equal(value.token, "[REDACTED]");
  assert.equal(value.dsn, "[REDACTED]");
  assert.equal(value.url, "https://safe.example");
});

test("contabiliza runs repetidos", () => {
  assert.equal(countRepeatedRuns([{ runAttempt: 1 }, { runAttempt: 3 }]), 2);
});

test("preserva evidência sanitizada por workflow", () => {
  const review = evaluateComumCheckpoint(validInput());
  assert.deepEqual(
    review.metrics.runsByWorkflow.map((run) => run.label),
    ["MICRO", "CHECKPOINT", "RELEASE/FULL"],
  );
});

test("aceita rotas de smoke informadas e mantém fallback seguro", () => {
  assert.deepEqual(
    resolveSmokeRoutes("/comun/acoes,/comun/minha-participacao"),
    ["/comun/acoes", "/comun/minha-participacao"],
  );
  assert.deepEqual(resolveSmokeRoutes(""), ["/comun", "/comun/acoes"]);
});

test("SHA incompatível bloqueia", () => {
  const review = evaluateComumCheckpoint(
    validInput({ candidateSha: "c".repeat(40) }),
  );
  assert.equal(review.processDecision, "COMUN_FLOW_RED");
  assert.match(review.integrity.blockers.join(","), /candidate_sha_mismatch/);
});

test("merge ausente bloqueia", () => {
  const review = evaluateComumCheckpoint(validInput({ mergeSha: undefined }));
  assert.equal(review.processDecision, "COMUN_FLOW_RED");
  assert.match(review.integrity.blockers.join(","), /merge_not_found/);
});

test("métrica ausente fica unknown e não recebe sucesso inventado", () => {
  const review = evaluateComumCheckpoint(
    validInput({
      runs: validInput().runs.map((run) => ({ ...run, durationMs: undefined })),
      toolbar: { unresolved: "unknown" },
      humanInterventions: undefined,
    }),
  );
  assert.equal(review.metrics.duration.known, 0);
  assert.equal(review.scores.evidence_quality.status, "yellow");
  assert.notEqual(review.processDecision, "COMUN_FLOW_GREEN");
});

test("escrita remota desconhecida reduz a evidência sem inventar bloqueio", () => {
  const review = evaluateComumCheckpoint(
    validInput({ remoteWrites: "unknown" }),
  );
  assert.equal(review.scores.operational_safety.status, "yellow");
  assert.notEqual(review.processDecision, "COMUN_FLOW_RED");
});
