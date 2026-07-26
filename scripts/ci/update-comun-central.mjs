const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const issueNumber = Number(process.env.COMUN_CENTRAL_ISSUE ?? "39");
const stage = process.env.COMUN_CENTRAL_STAGE;
const result = process.env.COMUN_CENTRAL_RESULT ?? "unknown";

if (!repository || !token || !stage || !Number.isInteger(issueNumber)) {
  throw new Error("COMUN_CENTRAL_CONFIGURATION_INVALID");
}

const api = `https://api.github.com/repos/${repository}/issues/${issueNumber}`;
const headers = {
  accept: "application/vnd.github+json",
  authorization: `Bearer ${token}`,
  "x-github-api-version": "2022-11-28",
};

const response = await fetch(api, { headers });
if (!response.ok)
  throw new Error(`COMUN_CENTRAL_READ_FAILED:${response.status}`);
const issue = await response.json();

const start = "<!-- comun-central:start -->";
const end = "<!-- comun-central:end -->";
const before = issue.body?.split(start)[0] ?? "";
const currentBlock = issue.body?.split(start)[1]?.split(end)[0] ?? "";
const after = issue.body?.split(end)[1] ?? "";
const state = new Map(
  currentBlock
    .split(/\r?\n/)
    .map((line) => line.match(/^- ([^:]+):\s*(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
);

const sha =
  process.env.COMUN_CENTRAL_SHA || process.env.GITHUB_SHA || "indisponível";
const branch = process.env.COMUN_CENTRAL_BRANCH;
const pr = process.env.COMUN_CENTRAL_PR;
const runUrl = process.env.COMUN_CENTRAL_RUN_URL;
const deploymentUrl = process.env.COMUN_CENTRAL_DEPLOYMENT_URL;
const checkpoint = process.env.COMUN_CENTRAL_CHECKPOINT;
const productDecision = process.env.COMUN_CENTRAL_PRODUCT_DECISION;
const processDecision = process.env.COMUN_CENTRAL_PROCESS_DECISION;
const duration = process.env.COMUN_CENTRAL_DURATION;
const runs = process.env.COMUN_CENTRAL_RUNS;
const interventions = process.env.COMUN_CENTRAL_HUMAN_INTERVENTIONS;
const improvements = process.env.COMUN_CENTRAL_IMPROVEMENTS;
const remoteWrites = process.env.COMUN_CENTRAL_REMOTE_WRITES;
const cause = process.env.COMUN_CENTRAL_CAUSE;

const branchIsSha = /^[a-f0-9]{40}$/i.test(branch ?? "");
if (branch && !branchIsSha && stage !== "merge" && stage !== "deploy")
  state.set("Branch ativa", `\`${branch}\``);
if (pr && stage !== "merge") state.set("PR ativa", `#${pr}`);
state.set("Último SHA observado", `\`${sha}\``);
if (runUrl) state.set("Última execução", `[abrir](${runUrl})`);

if (stage === "push") {
  state.set("MICRO", result);
  state.set("CHECKPOINT", "não disparado para o SHA atual");
  state.set("RELEASE/FULL", "não executado para o SHA atual");
  state.set("Etapa atual", "MICRO concluído; aguardando jornada navegável");
}
if (stage === "checkpoint") {
  state.set("CHECKPOINT", result);
  state.set("Etapa atual", "CHECKPOINT concluído; aguardando RELEASE/FULL");
}
if (stage === "release") {
  state.set("RELEASE/FULL", result);
  state.set("Etapa atual", "RELEASE/FULL concluído; candidato a merge");
}
if (stage === "merge") {
  state.set("Merge", result);
  state.set("PR ativa", pr ? `#${pr} — mesclada` : "mesclada");
  state.set("Branch ativa", "nenhuma — `main` integrada");
  state.set("Etapa atual", "merge concluído; aguardando deploy e smoke");
}
if (stage === "deploy") {
  state.set(
    "Deploy",
    deploymentUrl ? `${result} — [abrir](${deploymentUrl})` : result,
  );
  state.set("Etapa atual", "deploy concluído; aguardando smoke de produção");
}
if (stage === "retro") {
  state.set("Último checkpoint", checkpoint ?? "indisponível");
  state.set("Decisão de produto", productDecision ?? "unknown");
  state.set("Decisão de processo", processDecision ?? "unknown");
  state.set("Duração", duration ?? "unknown");
  state.set("Runs e reexecuções", runs ?? "unknown");
  state.set("Intervenções humanas", interventions ?? "unknown");
  state.set("Melhorias próximo ciclo", improvements ?? "nenhuma");
  state.set("Escritas remotas de banco", remoteWrites ?? "unknown");
  state.set("Branch ativa", "nenhuma — `main` integrada");
  state.set("PR ativa", "nenhuma — checkpoint integrado");
  state.set(
    "Etapa atual",
    "COMUN RETRO concluída; próximo checkpoint pode iniciar",
  );
}
if (stage === "process") {
  state.set(
    "Branch ativa",
    branch ? `\`${branch}\`` : "processo em preparação",
  );
  state.set(
    "PR ativa",
    pr ? `#${pr} — reparo de processo` : "reparo de processo",
  );
  state.set("Checkpoint bloqueado", checkpoint ?? "COMUN RETRO pós-deploy");
  state.set("Causa", cause ?? "indisponível");
  state.set(
    "Etapa atual",
    "reparo de processo em validação; nenhuma branch de produto ativa",
  );
}

state.set(
  "Produção",
  "feature flag `COMUN_COLLECTIVE_ACTIONS_V1` desabilitada",
);
state.set("Migration remota", "não aplicada");

const preferredOrder = [
  "Branch ativa",
  "PR ativa",
  "Etapa atual",
  "Último SHA observado",
  "MICRO",
  "CHECKPOINT",
  "RELEASE/FULL",
  "Merge",
  "Deploy",
  "Última execução",
  "Último checkpoint",
  "Decisão de produto",
  "Decisão de processo",
  "Duração",
  "Runs e reexecuções",
  "Intervenções humanas",
  "Melhorias próximo ciclo",
  "Escritas remotas de banco",
  "Checkpoint bloqueado",
  "Causa",
  "Produção",
  "Migration remota",
];
const keys = [
  ...preferredOrder.filter((key) => state.has(key)),
  ...[...state.keys()].filter((key) => !preferredOrder.includes(key)).sort(),
];
const block = keys.map((key) => `- ${key}: ${state.get(key)}`).join("\n");
const body = `${before.trimEnd()}\n\n${start}\n${block}\n${end}${after}`.trim();

const update = await fetch(api, {
  method: "PATCH",
  headers: { ...headers, "content-type": "application/json" },
  body: JSON.stringify({ body }),
});
if (!update.ok) throw new Error(`COMUN_CENTRAL_UPDATE_FAILED:${update.status}`);

console.log(`COMUN_CENTRAL_UPDATED:${stage}:${result}`);
