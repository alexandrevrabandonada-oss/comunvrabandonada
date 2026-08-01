import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  firstWaveRoutes,
  relationalScenarios,
  sourceMatrix,
} from "./catalog.mjs";

const writeReport = process.argv.includes("--write-report");
const findings = [];

for (const item of firstWaveRoutes) {
  let source = "";
  try {
    source = await readFile(item.file, "utf8");
  } catch {
    findings.push(finding(item, "route_file_missing", "critical", "block"));
    continue;
  }
  for (const token of item.requiredTokens) {
    if (!source.includes(token))
      findings.push(
        finding(item, `missing_contract:${token}`, "high", "block"),
      );
  }
  if (source.includes("paper-panel") || source.includes("HubCard")) {
    findings.push(
      finding(
        item,
        "legacy_token_in_fallback_source",
        "info",
        "preserve_legacy_fallback; auditor validates the V2 branch separately",
      ),
    );
  }
  if (
    !source.includes("withComunAppV2") &&
    !source.includes("MiniAppExperienceShell")
  )
    findings.push(finding(item, "flag_may_be_lost_on_links", "high", "block"));
}

const routeFiles = await listRouteFiles("app/comun");
for (const file of routeFiles.filter((name) => name.includes("/admin/"))) {
  const source = await readFile(file, "utf8");
  if (/paper-panel|bg-white|uppercase/.test(source))
    findings.push({
      route: fileToRoute(file),
      family: "admin",
      finding: "legacy_visual_language_scheduled_for_47.9A5",
      severity: "info",
      decision: "record_only_do_not_fail_47.9A4",
    });
}

const blocking = findings.filter((item) =>
  ["critical", "high"].includes(item.severity),
);
const result = {
  schema: "comun.civic-graph.audit.v1",
  generatedAt: new Date().toISOString(),
  scope: "TIJOLO 47.9A4",
  classification: "technical_audit_not_human_rehearsal",
  totals: {
    appRouterPages: routeFiles.length,
    firstWaveRoutes: firstWaveRoutes.length,
    sourceRelations: sourceMatrix.length,
    relationalScenarios: relationalScenarios.length,
    findings: findings.length,
    blocking: blocking.length,
    adminDeferred: findings.filter((item) => item.family === "admin").length,
  },
  sourceMatrix,
  routes: firstWaveRoutes.map(({ requiredTokens, ...item }) => ({
    ...item,
    contractChecks: requiredTokens.length,
  })),
  findings,
  containsPrivateData: false,
  humanRehearsal: "pending",
};

if (writeReport) {
  await mkdir("reports/current", { recursive: true });
  await writeFile(
    "reports/current/comun-civic-graph-audit.json",
    `${JSON.stringify(result, null, 2)}\n`,
  );
  await writeFile(
    "reports/current/comun-civic-graph-audit.md",
    renderMarkdown(result),
  );
}

console.log(JSON.stringify({ ok: blocking.length === 0, ...result.totals }));
if (blocking.length) process.exitCode = 1;

function finding(item, name, severity, decision) {
  return {
    route: item.route,
    family: item.family,
    finding: name,
    severity,
    decision,
  };
}

async function listRouteFiles(root) {
  const output = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const target = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (/^page\.(tsx|ts|js)$/.test(entry.name))
        output.push(target.replaceAll("\\", "/"));
    }
  }
  await walk(root);
  return output.sort();
}

function fileToRoute(file) {
  return `/${file.replace(/^app\//, "").replace(/\/page\.(tsx|ts|js)$/, "")}`;
}

function renderMarkdown(result) {
  const sources = result.sourceMatrix
    .map(
      (item) =>
        `| ${item.origin} | ${item.destination} | ${item.key} | ${item.canonicalSource} | ${item.public} | ${item.available} | ${item.gap || "—"} |`,
    )
    .join("\n");
  const findingsRows = result.findings
    .map(
      (item) =>
        `| ${item.route} | ${item.family} | ${item.finding} | ${item.severity} | ${item.decision} |`,
    )
    .join("\n");
  return `# Auditoria do grafo cívico — Tijolo 47.9A4\n\nAuditoria técnica; não é ensaio humano. Não contém conteúdo, IDs ou sessões privadas.\n\n## Fontes canônicas\n\n| Origem | Destino | Chave | Fonte canônica | Pública | Disponível | Lacuna |\n|---|---|---|---|---|---|---|\n${sources}\n\n## Findings\n\n| Rota | Família | Finding | Severidade | Decisão de migração |\n|---|---|---|---|---|\n${findingsRows || "| — | — | nenhum finding | — | — |"}\n\n## Totais agregados\n\n\`\`\`json\n${JSON.stringify(result.totals, null, 2)}\n\`\`\`\n`;
}
