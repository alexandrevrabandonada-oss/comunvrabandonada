import { mkdir, writeFile } from "node:fs/promises";
import {
  coreJourneys,
  intermediateRoutes,
  journeyMetrics,
} from "./catalog.mjs";

const write = process.argv.includes("--write-report");
const metrics = journeyMetrics();
const result = {
  generatedAt: new Date().toISOString(),
  scope: "TIJOLO 47.9A3",
  classification: "technical_audit_not_human_rehearsal",
  journeys: coreJourneys,
  intermediateRoutes,
  metrics,
};

if (write) {
  await mkdir("reports/current", { recursive: true });
  await writeFile(
    "reports/current/comun-core-journeys-audit.json",
    `${JSON.stringify(result, null, 2)}\n`,
  );
  const rows = coreJourneys
    .map(
      (item) =>
        `| ${item.id}. ${item.intention} | ${item.entry} | ${item.screens.join(" → ")} | ${item.action} | ${item.auth} | ${item.confirmation} | ${item.tracking} | ${item.return} | ${item.intermediate} | ${item.duplicates} | ${item.deadEnd} | ${item.privacy} | ${item.decision} | ${item.steps.before} → ${item.steps.after} |`,
    )
    .join("\n");
  const routes = intermediateRoutes
    .map(
      (item) => `| ${item.route} | ${item.classification} | ${item.decision} |`,
    )
    .join("\n");
  await writeFile(
    "reports/current/comun-core-journeys-audit.md",
    `# Auditoria técnica de jornadas — Tijolo 47.9A3\n\nNão contém resultados humanos nem dados pessoais.\n\n| Fluxo / intenção inicial | Rota de entrada | Telas percorridas | Ação principal | Autenticação | Confirmação | Acompanhamento | Retorno | Telas intermediárias | Duplicações | Beco sem saída | Estado privado/público | Decisão | Passos antes → depois |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n${rows}\n\n## Rotas intermediárias\n\n| Rota | Classificação | Decisão |\n|---|---|---|\n${routes}\n\n## Métricas técnicas\n\n\`\`\`json\n${JSON.stringify(metrics, null, 2)}\n\`\`\`\n`,
  );
}

console.log(
  JSON.stringify({ ok: true, journeys: coreJourneys.length, metrics }),
);
