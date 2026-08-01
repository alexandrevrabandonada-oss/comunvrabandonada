import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const audit = JSON.parse(
  await readFile("reports/current/comun-civic-graph-audit.json", "utf8"),
);
const consistency = JSON.parse(
  await readFile("reports/current/comun-civic-graph-consistency.json", "utf8"),
);
const payload = {
  schema: "comun.civic-graph.evidence.v1",
  collectedAt: new Date().toISOString(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  routes: audit.totals.firstWaveRoutes,
  relationTypes: audit.totals.sourceRelations,
  findingsBySeverity: Object.fromEntries(
    ["critical", "high", "warning", "info"].map((severity) => [
      severity,
      audit.findings.filter((item) => item.severity === severity).length +
        consistency.findings.filter((item) => item.severity === severity)
          .length,
    ]),
  ),
  consistencyStatus: consistency.status,
  aggregateCountTypes: consistency.counts.length,
  containsPrivateData: false,
  containsIds: false,
  containsSessions: false,
  humanRehearsal: "pending",
  launchPublicly: "not_triggered",
};
await mkdir("reports/current", { recursive: true });
await writeFile(
  "reports/current/comun-civic-graph-evidence.json",
  `${JSON.stringify(payload, null, 2)}\n`,
);
console.log(
  JSON.stringify({
    ok: true,
    output: "reports/current/comun-civic-graph-evidence.json",
  }),
);
