import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SENSITIVE_KEY =
  /(?:authorization|cookie|credential|dsn|pass(?:word)?|secret|token|database[_-]?url|service[_-]?role)/i;
const SENSITIVE_VALUE =
  /(?:\b(?:gh[pous]_|github_pat_|eyJ[a-zA-Z0-9_-]{10,})\S*|\b(?:postgres(?:ql)?):\/\/\S+|\b(?:password|token|secret)\s*[=:]\s*\S+)/gi;
const PRODUCT_REQUIRED_RUNS = ["MICRO", "CHECKPOINT", "RELEASE/FULL"];
const PROCESS_REQUIRED_RUNS = ["PROCESS"];
const DEFAULT_SMOKE_ROUTES = ["/comun", "/comun/acoes"];

function isKnown(value) {
  return (
    value !== undefined && value !== null && value !== "" && value !== "unknown"
  );
}

function isoDurationMs(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const value = Date.parse(completedAt) - Date.parse(startedAt);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function status(value, justification) {
  return { status: value, justification };
}

export function sanitizeProcessData(value, key = "") {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string")
    return value.replace(SENSITIVE_VALUE, "[REDACTED]");
  if (Array.isArray(value))
    return value.map((item) => sanitizeProcessData(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeProcessData(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

export function countRepeatedRuns(runs = []) {
  return runs.reduce(
    (total, run) =>
      total + Math.max(0, Number(run.runAttempt ?? run.run_attempt ?? 1) - 1),
    0,
  );
}

export function limitImprovements(improvements = []) {
  const seen = new Set();
  return improvements
    .filter((improvement) => improvement?.action)
    .filter((improvement) => {
      if (seen.has(improvement.action)) return false;
      seen.add(improvement.action);
      return true;
    })
    .slice(0, 3);
}

export function resolveSmokeRoutes(configuredRoutes) {
  const routes = String(configuredRoutes ?? "")
    .split(",")
    .map((route) => route.trim())
    .filter((route) => route.startsWith("/"));
  return routes.length ? [...new Set(routes)] : DEFAULT_SMOKE_ROUTES;
}

export function requiredRunsForCheckpoint(checkpointType) {
  return checkpointType === "process"
    ? PROCESS_REQUIRED_RUNS
    : PRODUCT_REQUIRED_RUNS;
}

export function selectPreferredRun(runs = []) {
  return runs.find((run) => run.conclusion === "success") ?? runs[0] ?? null;
}

export function decideComumFlow(scores) {
  const values = Object.values(scores);
  if (values.some((score) => score.status === "red")) return "COMUN_FLOW_RED";
  const yellow = values.filter((score) => score.status === "yellow").length;
  return yellow <= 2 ? "COMUN_FLOW_GREEN" : "COMUN_FLOW_GREEN_WITH_ADJUSTMENT";
}

function selectedRun(runs, label) {
  return runs.find((run) => run.label === label) ?? null;
}

function runSucceeded(run) {
  return run?.conclusion === "success";
}

function knownDuration(runs) {
  const values = runs
    .map((run) => run.durationMs)
    .filter((value) => Number.isFinite(value));
  return {
    totalMs: values.reduce((total, value) => total + value, 0),
    known: values.length,
    unknown: runs.length - values.length,
  };
}

function humanSummary(interventions) {
  if (!Array.isArray(interventions))
    return { state: "unknown", count: null, types: [] };
  const allowed = new Set([
    "migration_authorization",
    "flag_activation",
    "product_decision",
    "user_visual_request",
    "credential_provision",
    "irreversible_approval",
  ]);
  const types = interventions
    .map((intervention) =>
      typeof intervention === "string" ? intervention : intervention?.type,
    )
    .filter((type) => allowed.has(type));
  return { state: "known", count: types.length, types: [...new Set(types)] };
}

function buildImprovements({ metrics, retroactive }) {
  const improvements = [];
  if (
    retroactive ||
    metrics.duration.unknown > 0 ||
    metrics.human.state === "unknown"
  ) {
    improvements.push({
      action:
        "Persistir duração, reexecuções, smoke e intervenções humanas no artefato de cada checkpoint.",
      evidence:
        "A retrospectiva não deve depender de reconstrução posterior de métricas.",
    });
  }
  if (metrics.repeatedRuns > 0) {
    improvements.push({
      action:
        "Quando um gate falhar antes da suíte, reexecutar somente o job falho e registrar a causa no COMUN RETRO.",
      evidence: `${metrics.repeatedRuns} reexecução(ões) observada(s).`,
    });
  }
  if (metrics.candidateShas.length > 1) {
    improvements.push({
      action:
        "Executar a verificação de interface responsável pelo retrabalho no CHECKPOINT antes de solicitar RELEASE/FULL.",
      evidence: `${metrics.candidateShas.length} SHAs candidatos foram observados.`,
    });
  }
  if (metrics.toolbar.unresolved === "unknown") {
    improvements.push({
      action:
        "Registrar a contagem do Vercel Toolbar no artefato do CHECKPOINT para evitar consulta manual posterior.",
      evidence: "Feedback do Preview não pôde ser consolidado automaticamente.",
    });
  }
  return limitImprovements(improvements);
}

export function evaluateComumCheckpoint(input) {
  const runs = (input.runs ?? []).map((run) => ({
    ...run,
    durationMs:
      run.durationMs ??
      isoDurationMs(
        run.startedAt ?? run.run_started_at,
        run.completedAt ?? run.updated_at,
      ),
  }));
  const pr = input.pr ?? {};
  const candidateSha = input.candidateSha;
  const mergeSha = input.mergeSha;
  const checkpointType =
    input.checkpointType === "process" ? "process" : "product";
  const duration = knownDuration(runs);
  const human = humanSummary(input.humanInterventions);
  const metrics = {
    checkpointType,
    pr: pr.number ?? "unknown",
    branch: pr.branch ?? "unknown",
    base: pr.base ?? "unknown",
    commits: isKnown(pr.commits) ? pr.commits : "unknown",
    changedFiles: isKnown(pr.changedFiles) ? pr.changedFiles : "unknown",
    candidateShas: [
      ...new Set((input.candidateShas ?? [candidateSha]).filter(Boolean)),
    ],
    runs: runs.length,
    runsByWorkflow: runs.map((run) => ({
      label: run.label ?? "unknown",
      id: run.id ?? "unknown",
      conclusion: run.conclusion ?? "unknown",
      runAttempt: run.runAttempt ?? run.run_attempt ?? "unknown",
      durationMs: Number.isFinite(run.durationMs) ? run.durationMs : "unknown",
      failedJobs: run.failedJobs ?? "unknown",
      artifacts: run.artifacts ?? "unknown",
    })),
    repeatedRuns: countRepeatedRuns(runs),
    failedJobs: Number(input.failedJobs ?? 0),
    artifacts: Number(input.artifacts ?? 0),
    deployments: Number(input.deployments?.length ?? 0),
    duration,
    toolbar: input.toolbar ?? { unresolved: "unknown" },
    human,
    smoke: input.smoke ?? { status: "unknown", errors: [] },
  };

  const requiredMissing = requiredRunsForCheckpoint(checkpointType).filter(
    (label) => !runSucceeded(selectedRun(runs, label)),
  );
  const blockers = [];
  if (!mergeSha || !pr.mergeSha) blockers.push("merge_not_found");
  if (mergeSha && pr.mergeSha && mergeSha !== pr.mergeSha)
    blockers.push("merge_sha_mismatch");
  if (candidateSha && pr.headSha && candidateSha !== pr.headSha)
    blockers.push("candidate_sha_mismatch");
  if (input.mainIntegrated === false) blockers.push("main_not_integrated");
  if (isKnown(input.remoteWrites) && input.remoteWrites !== "none")
    blockers.push("remote_write_detected");
  if (metrics.smoke.status === "failed")
    blockers.push("production_smoke_failed");
  if (
    input.deployments?.some(
      (deployment) =>
        deployment.environment === "Production" &&
        deployment.state === "failure",
    )
  ) {
    blockers.push("production_deployment_failed");
  }

  const scores = {
    objective_alignment: status(
      pr.merged === true ? "green" : "yellow",
      pr.merged === true
        ? "A PR foi mesclada para a base declarada."
        : "O estado final da PR não está confirmado.",
    ),
    scope_control: status(
      isKnown(pr.changedFiles) && pr.changedFiles <= 30 ? "green" : "yellow",
      isKnown(pr.changedFiles)
        ? `${pr.changedFiles} arquivo(s) alterado(s) na PR.`
        : "Quantidade de arquivos não disponível.",
    ),
    branch_discipline: status(
      input.branchMixed
        ? "red"
        : pr.base === "main" && pr.branch && input.remoteBranchDeleted === true
          ? "green"
          : "yellow",
      input.branchMixed
        ? "Há mistura de branches no checkpoint."
        : pr.base === "main" && pr.branch && input.remoteBranchDeleted === true
          ? "Base main, branch identificada, descartada e sem mistura registrada."
          : "A base, a branch ou seu descarte ainda não têm evidência completa.",
    ),
    integration_quality: status(
      blockers.length || requiredMissing.length ? "red" : "green",
      blockers.length
        ? `Bloqueios: ${blockers.join(", ")}.`
        : requiredMissing.length
          ? `Gates ausentes ou não verdes: ${requiredMissing.join(", ")}.`
          : "Gates, merge, deployment e smoke são compatíveis.",
    ),
    automation_level: status(
      input.retroactive || metrics.duration.unknown > 0 ? "yellow" : "green",
      input.retroactive
        ? "Avaliação retroativa: métricas não foram emitidas pelo fechamento original."
        : metrics.duration.unknown > 0
          ? "Há duração de run ausente."
          : "Métricas foram coletadas automaticamente.",
    ),
    human_dependency: status(
      human.state === "unknown"
        ? "yellow"
        : human.count === 0
          ? "green"
          : "yellow",
      human.state === "unknown"
        ? "Intervenções humanas não foram registradas de forma estruturada."
        : human.count === 0
          ? "Nenhuma intervenção humana qualificada foi necessária."
          : `${human.count} intervenção(ões) humana(s) qualificada(s) registrada(s).`,
    ),
    rework_cost: status(
      metrics.candidateShas.length > 1 || metrics.repeatedRuns > 0
        ? "yellow"
        : "green",
      metrics.candidateShas.length > 1 || metrics.repeatedRuns > 0
        ? `${metrics.candidateShas.length} SHA(s) candidato(s) e ${metrics.repeatedRuns} reexecução(ões).`
        : "Um único SHA candidato sem reexecução.",
    ),
    gate_efficiency: status(
      metrics.failedJobs > 0 || metrics.repeatedRuns > 0 ? "yellow" : "green",
      metrics.failedJobs > 0 || metrics.repeatedRuns > 0
        ? `${metrics.failedJobs} job(s) falho(s) e ${metrics.repeatedRuns} reexecução(ões) registrados.`
        : "Gates concluídos sem repetição.",
    ),
    operational_safety: status(
      input.remoteWrites === "none" && metrics.smoke.status === "passed"
        ? "green"
        : input.remoteWrites === "unknown" || metrics.smoke.status === "unknown"
          ? "yellow"
          : "red",
      input.remoteWrites === "none" && metrics.smoke.status === "passed"
        ? "Sem escrita remota e smoke verde."
        : input.remoteWrites === "unknown" || metrics.smoke.status === "unknown"
          ? "Confirmação de escrita remota ou smoke está ausente."
          : "Há risco operacional confirmado.",
    ),
    evidence_quality: status(
      input.retroactive ||
        metrics.duration.unknown > 0 ||
        metrics.toolbar.unresolved === "unknown"
        ? "yellow"
        : "green",
      input.retroactive
        ? "A retrospectiva foi reconstruída após o checkpoint."
        : metrics.duration.unknown > 0 ||
            metrics.toolbar.unresolved === "unknown"
          ? "Há métricas ou feedback de Preview ausentes."
          : "Runs, artefatos, deployments e feedback estão consolidados.",
    ),
  };
  if (blockers.length) {
    for (const name of [
      "objective_alignment",
      "integration_quality",
      "operational_safety",
      "evidence_quality",
    ]) {
      if (scores[name].status !== "red")
        scores[name] = status(
          "red",
          `Bloqueio crítico: ${blockers.join(", ")}.`,
        );
    }
  }
  const decision = decideComumFlow(scores);
  const improvements = buildImprovements({
    metrics,
    retroactive: Boolean(input.retroactive),
  });
  return sanitizeProcessData({
    protocol: "COMUN RETRO",
    checkpointType,
    checkpointId:
      input.checkpointId ??
      `pr-${pr.number ?? "unknown"}-${String(candidateSha ?? "unknown").slice(0, 7)}`,
    productDecision: input.productDecision ?? "unknown",
    processDecision: decision,
    retroactive: Boolean(input.retroactive),
    integrity: {
      candidateSha: candidateSha ?? "unknown",
      mergeSha: mergeSha ?? "unknown",
      prHeadSha: pr.headSha ?? "unknown",
      prMergeSha: pr.mergeSha ?? "unknown",
      mainIntegrated: input.mainIntegrated ?? "unknown",
      remoteWrites: input.remoteWrites ?? "unknown",
      blockers,
    },
    metrics,
    scores,
    improvements,
  });
}

export function renderComumRetroMarkdown(review) {
  const duration = review.metrics.duration.known
    ? formatDuration(review.metrics.duration.totalMs)
    : "unknown";
  const scoreRows = Object.entries(review.scores)
    .map(
      ([name, score]) =>
        `| ${name} | ${score.status} | ${score.justification} |`,
    )
    .join("\n");
  const improvements = review.improvements.length
    ? review.improvements
        .map(
          (improvement) =>
            `- ${improvement.action} Evidência: ${improvement.evidence}`,
        )
        .join("\n")
    : "- Nenhuma melhoria adicional necessária neste checkpoint.";
  return `# COMUN RETRO — ${review.checkpointId}\n\n## Decisão\n\n- produto: \`${review.productDecision}\`\n- processo: \`${review.processDecision}\`\n- duração consolidada: ${duration}\n\n## Métricas sanitizadas\n\n- PR: #${review.metrics.pr ?? "unknown"}\n- branch/base: \`${review.metrics.branch}\` → \`${review.metrics.base}\`\n- commits: ${review.metrics.commits}\n- arquivos: ${review.metrics.changedFiles}\n- SHAs candidatos: ${review.metrics.candidateShas.length}\n- runs/reexecuções: ${review.metrics.runs}/${review.metrics.repeatedRuns}\n- jobs falhos: ${review.metrics.failedJobs}\n- artefatos: ${review.metrics.artifacts}\n- deployments: ${review.metrics.deployments}\n- intervenções humanas: ${review.metrics.human.state === "known" ? review.metrics.human.count : "unknown"}\n- smoke: ${review.metrics.smoke.status}\n\n## Rubrica\n\n| Dimensão | Estado | Evidência |\n| --- | --- | --- |\n${scoreRows}\n\n## Melhorias para o próximo checkpoint\n\n${improvements}\n`;
}

export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "unknown";
  const seconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

function parseArgs(argv) {
  const options = { smokeRoutes: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;
    const [rawKey, inline] = current.slice(2).split("=", 2);
    if (rawKey === "retroactive") {
      options.retroactive = true;
      continue;
    }
    const value = inline ?? argv[index + 1];
    if (inline === undefined) index += 1;
    if (rawKey === "smoke-route") options.smokeRoutes.push(value);
    else
      options[
        rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      ] = value;
  }
  return options;
}

async function requestGitHub(repository, token, pathname, fetchImpl) {
  if (!repository || !token) return null;
  const response = await fetchImpl(
    `https://api.github.com/repos/${repository}${pathname}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
      },
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) return { unknown: true, status: response.status };
  return response.json();
}

async function collectRemoteCheckpoint(options, fetchImpl = fetch) {
  const repository = options.repository ?? process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const mergeSha = options.mergeSha;
  let pr = options.pr
    ? await requestGitHub(repository, token, `/pulls/${options.pr}`, fetchImpl)
    : null;
  if (!pr && mergeSha) {
    const associated = await requestGitHub(
      repository,
      token,
      `/commits/${mergeSha}/pulls`,
      fetchImpl,
    );
    const merged = Array.isArray(associated)
      ? associated.find((item) => item.merged_at)
      : null;
    if (merged)
      pr = await requestGitHub(
        repository,
        token,
        `/pulls/${merged.number}`,
        fetchImpl,
      );
  }
  const requestedPrNumber = Number(options.pr);
  const prNumber =
    pr?.number ??
    (Number.isFinite(requestedPrNumber) ? requestedPrNumber : undefined);
  const commits = prNumber
    ? await requestGitHub(
        repository,
        token,
        `/pulls/${prNumber}/commits?per_page=100`,
        fetchImpl,
      )
    : null;
  const comments = prNumber
    ? await requestGitHub(
        repository,
        token,
        `/issues/${prNumber}/comments?per_page=100`,
        fetchImpl,
      )
    : null;
  const runsResponse = await requestGitHub(
    repository,
    token,
    "/actions/runs?per_page=100",
    fetchImpl,
  );
  const allRuns = runsResponse?.workflow_runs ?? [];
  const candidateSha = options.candidateSha ?? pr?.head?.sha;
  const checkpointType =
    options.checkpointType ??
    (pr?.labels?.some((label) => label.name === "comun:process")
      ? "process"
      : "product");
  const requested = new Map(
    checkpointType === "process"
      ? [["PROCESS", options.processRun]]
      : [
          ["MICRO", options.microRun],
          ["CHECKPOINT", options.checkpointRun],
          ["RELEASE/FULL", options.fullRun],
        ],
  );
  const selected = [];
  const jobCache = new Map();
  const jobMatcher = {
    MICRO: /\bMICRO\b/i,
    CHECKPOINT: /\bCHECKPOINT\b/i,
    "RELEASE/FULL": /\b(?:RELEASE|FULL)\b/i,
    PROCESS: /\bPROCESS\b/i,
  };
  async function jobsForRun(run) {
    if (!jobCache.has(run.id)) {
      jobCache.set(
        run.id,
        await requestGitHub(
          repository,
          token,
          `/actions/runs/${run.id}/jobs?per_page=100`,
          fetchImpl,
        ),
      );
    }
    return jobCache.get(run.id);
  }
  for (const [label, id] of requested) {
    let run = id
      ? await requestGitHub(repository, token, `/actions/runs/${id}`, fetchImpl)
      : null;
    if (!run) {
      const candidates = allRuns.filter(
        (item) => item.head_sha === candidateSha,
      );
      const matchingRuns = [];
      for (const candidate of candidates) {
        const jobs = await jobsForRun(candidate);
        if (
          (jobs?.jobs ?? []).some((job) =>
            jobMatcher[label].test(job.name ?? ""),
          )
        ) {
          matchingRuns.push(candidate);
        }
      }
      run = selectPreferredRun(matchingRuns);
    }
    if (!run) {
      selected.push({ label, conclusion: "unknown", runAttempt: 0 });
      continue;
    }
    const jobs = await jobsForRun(run);
    const artifacts = await requestGitHub(
      repository,
      token,
      `/actions/runs/${run.id}/artifacts?per_page=100`,
      fetchImpl,
    );
    selected.push({
      label,
      id: run.id,
      conclusion: run.conclusion ?? "unknown",
      runAttempt: run.run_attempt ?? 1,
      startedAt: run.run_started_at,
      completedAt: run.updated_at,
      failedJobs: (jobs?.jobs ?? []).filter(
        (job) => job.conclusion === "failure",
      ).length,
      artifacts: (artifacts?.artifacts ?? []).length,
    });
  }
  const discoveredDeployments = candidateSha
    ? await requestGitHub(
        repository,
        token,
        `/deployments?sha=${candidateSha}&per_page=100`,
        fetchImpl,
      )
    : null;
  const deploymentIds = [
    ...new Set(
      [
        options.previewDeployment,
        options.productionDeployment,
        ...(Array.isArray(discoveredDeployments)
          ? discoveredDeployments.map((deployment) => deployment.id)
          : []),
      ].filter(Boolean),
    ),
  ];
  const deployments = [];
  for (const id of deploymentIds) {
    const deployment = await requestGitHub(
      repository,
      token,
      `/deployments/${id}`,
      fetchImpl,
    );
    const statuses = await requestGitHub(
      repository,
      token,
      `/deployments/${id}/statuses?per_page=1`,
      fetchImpl,
    );
    if (deployment)
      deployments.push({
        id: deployment.id,
        environment: deployment.environment,
        sha: deployment.sha,
        state: statuses?.[0]?.state ?? "unknown",
        url: statuses?.[0]?.environment_url,
      });
  }
  const branch = pr?.head?.ref;
  const remoteBranch = branch
    ? await requestGitHub(
        repository,
        token,
        `/git/ref/heads/${encodeURIComponent(branch)}`,
        fetchImpl,
      )
    : null;
  const main = await requestGitHub(
    repository,
    token,
    "/branches/main",
    fetchImpl,
  );
  const candidateShas = [
    ...new Set(
      [
        ...(Array.isArray(commits) ? commits.map((commit) => commit.sha) : []),
        ...allRuns
          .filter((run) =>
            run.pull_requests?.some((item) => item.number === prNumber),
          )
          .map((run) => run.head_sha),
        candidateSha,
      ].filter(Boolean),
    ),
  ];
  const toolbarComments = Array.isArray(comments)
    ? comments.filter((comment) => comment.user?.login === "vercel[bot]")
    : null;
  const unresolved =
    toolbarComments === null
      ? "unknown"
      : toolbarComments.reduce(
          (total, comment) =>
            total + (/0 unresolved/i.test(comment.body ?? "") ? 0 : 1),
          0,
        );
  return {
    checkpointType,
    candidateSha,
    mergeSha,
    pr: {
      number: prNumber,
      branch,
      base: pr?.base?.ref,
      commits:
        pr?.commits ?? (Array.isArray(commits) ? commits.length : "unknown"),
      changedFiles: pr?.changed_files,
      headSha: pr?.head?.sha,
      mergeSha: pr?.merge_commit_sha,
      merged: Boolean(pr?.merged_at),
    },
    candidateShas,
    runs: selected,
    failedJobs: selected.reduce(
      (total, run) => total + (run.failedJobs ?? 0),
      0,
    ),
    artifacts: selected.reduce((total, run) => total + (run.artifacts ?? 0), 0),
    deployments,
    toolbar: { unresolved },
    remoteBranchDeleted: branch ? remoteBranch === null : "unknown",
    mainIntegrated: main?.commit?.sha === mergeSha ? true : "unknown",
  };
}

function smokeFromOptions(options) {
  if (options.smokeStatus) {
    return { status: options.smokeStatus, routes: options.smokeRoutes };
  }
  return { status: "unknown", routes: options.smokeRoutes };
}

function writeArtifacts(outputDir, review) {
  mkdirSync(outputDir, { recursive: true });
  const metrics = sanitizeProcessData(review.metrics);
  writeFileSync(
    path.join(outputDir, "evaluation.json"),
    `${JSON.stringify(review, null, 2)}\n`,
  );
  writeFileSync(
    path.join(outputDir, "evaluation.md"),
    renderComumRetroMarkdown(review),
  );
  writeFileSync(
    path.join(outputDir, "metrics.json"),
    `${JSON.stringify(metrics, null, 2)}\n`,
  );
}

function writeGithubOutput(target, review) {
  if (!target) return;
  const duration = review.metrics.duration.known
    ? formatDuration(review.metrics.duration.totalMs)
    : "unknown";
  const values = {
    checkpoint_id: review.checkpointId,
    product_decision: review.productDecision,
    process_decision: review.processDecision,
    duration,
    runs: `${review.metrics.runs} runs; ${review.metrics.repeatedRuns} reexecuções`,
    human_interventions:
      review.metrics.human.state === "known"
        ? String(review.metrics.human.count)
        : "unknown",
    improvements: review.improvements
      .map((improvement) => improvement.action)
      .join(" "),
    remote_writes: review.integrity.remoteWrites ?? "unknown",
  };
  appendFileSync(
    target,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${String(value).replace(/[\r\n]/g, " ")}`)
      .join("\n")}\n`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const remote = await collectRemoteCheckpoint(options);
  const review = evaluateComumCheckpoint({
    ...remote,
    checkpointType: options.checkpointType ?? remote.checkpointType,
    checkpointId: options.checkpointId,
    productDecision: options.productDecision,
    smoke: smokeFromOptions(options),
    remoteWrites: options.remoteWrites ?? "unknown",
    retroactive: options.retroactive,
    humanInterventions: options.interventionsFile
      ? JSON.parse(readFileSync(options.interventionsFile, "utf8"))
      : undefined,
  });
  const outputDir =
    options.outputDir ??
    path.join(".ci-artifacts", `comun-process-review-${review.checkpointId}`);
  writeArtifacts(outputDir, review);
  writeGithubOutput(options.githubOutput, review);
  console.log(`COMUN_RETRO:${review.processDecision}:${review.checkpointId}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
