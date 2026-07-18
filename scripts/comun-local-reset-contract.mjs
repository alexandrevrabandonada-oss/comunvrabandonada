const LOG_LIMIT = 2000;

export function truncateResetLog(value) {
  const text = String(value ?? "");
  return text.length <= LOG_LIMIT ? text : `…[truncado ${text.length - LOG_LIMIT} caracteres]\n${text.slice(-LOG_LIMIT)}`;
}

export function assertCompleteMigrations(applied, expected) {
  if (!Number.isInteger(applied) || applied !== expected) {
    throw new Error(`migrations incompletas: ${applied}/${expected}`);
  }
}

export function shouldRestartKong({ recoveryError, authHealth, alreadyRestarted }) {
  return !alreadyRestarted && authHealth === "healthy" && String(recoveryError).includes("auth http=502");
}

export function classifyReset({ exitCode, migrations, expectedMigrations, recovered }) {
  assertCompleteMigrations(migrations, expectedMigrations);
  if (!recovered) throw new Error("readiness não recuperou após reset");
  return exitCode === 0 ? "C" : "B";
}

export function buildResetEvidence({ runId, round, commit, startedAt, finishedAt, records, failure }) {
  return {
    runId,
    round,
    commit,
    startedAt,
    finishedAt,
    ok: !failure,
    records,
    ...(failure ? { failure } : {}),
  };
}
