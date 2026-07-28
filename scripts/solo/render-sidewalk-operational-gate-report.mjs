import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertOperationalGateClassification,
  classifySidewalkOperationalGate,
} from "./classify-sidewalk-operational-gate.mjs";
import { assertSanitizedOperationalEnvironmentInventory } from "./sidewalk-operational-env-inventory.mjs";
import { validateOperationalDiagnosticPayload } from "./probe-protected-vercel-deployment.mjs";

const consumedRun = "30391920347";
const consumedAttempt = "sidewalk-activate-20260728-02";
const forbidden = [
  /postgres(?:ql)?:\/\//i,
  /\b(?:password|token|authorization|cookie|service[_ -]?role(?:[_ -]?(?:key|token))?)\s*(?:=|:)\s*\S+/i,
  /\beyJ[a-zA-Z0-9_-]{10,}/,
  /https?:\/\//i,
  /(?:dsn|connection string|private_notes|object_key|exact_latitude|exact_longitude)/i,
];

function optionValue(argv, option) {
  return argv
    .find((value) => value.startsWith(`${option}=`))
    ?.slice(option.length + 1);
}

function nextChange(classification) {
  if (
    classification === "PRODUCTION_DATABASE_URL_KEY_MISSING" ||
    classification === "PRODUCTION_DATABASE_URL_WRONG_TARGET"
  ) {
    return [
      "CONFIGURAR_COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL_EM_PRODUCTION",
      "MANTER_COMUN_SIDEWALK_OPERATIONAL_V2_DISABLED",
    ];
  }
  if (classification === "RUNTIME_DATABASE_CONNECTION_FAILED") {
    return [
      "REVISAR_CONECTIVIDADE_DA_DATABASE_URL_OPERACIONAL_EM_CHECKPOINT_SEPARADO",
      "MANTER_COMUN_SIDEWALK_OPERATIONAL_V2_DISABLED",
    ];
  }
  if (
    classification === "RUNTIME_LEDGER_ROW_MISSING" ||
    classification === "RUNTIME_LEDGER_MISMATCH"
  ) {
    return [
      "RECONCILIAR_O_LEDGER_OPERACIONAL_EM_CHECKPOINT_SEPARADO",
      "MANTER_COMUN_SIDEWALK_OPERATIONAL_V2_DISABLED",
    ];
  }
  return [
    "OBTER_EVIDENCIA_PROTEGIDA_DE_BINDING_DA_FLAG_ANTES_DE_NOVO_ATTEMPT",
    "MANTER_COMUN_SIDEWALK_OPERATIONAL_V2_DISABLED",
  ];
}

export function createOperationalGateReport({
  mainSha,
  inventory,
  diagnostic,
  classification = classifySidewalkOperationalGate({ inventory, diagnostic }),
}) {
  if (!/^[0-9a-f]{40}$/i.test(mainSha ?? "")) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_GATE_MAIN_SHA_INVALID");
  }
  assertSanitizedOperationalEnvironmentInventory(inventory);
  validateOperationalDiagnosticPayload(JSON.stringify(diagnostic));
  assertOperationalGateClassification(classification);
  return {
    formatVersion: 1,
    mainSha,
    consumedRun,
    consumedAttempt,
    classification,
    environment: inventory,
    dependencies: {
      database: diagnostic.database,
      ledger: diagnostic.ledger,
      operationalState: diagnostic.operationalState,
    },
    publicState: "paused",
    flag: "disabled",
    databaseWrites: "none",
    storageWrites: "none",
    attempt03: "not_created",
    requiredNextChange: nextChange(classification),
  };
}

export function assertSanitizedOperationalGateReport(report) {
  const serialized = JSON.stringify(report);
  if (forbidden.some((pattern) => pattern.test(serialized))) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_GATE_REPORT_SENSITIVE");
  }
  return report;
}

function markdown(report) {
  return [
    "# TIJOLO 45.3L — diagnóstico da cadeia de visibilidade operacional",
    "",
    `- main_sha: ${report.mainSha}`,
    `- consumed_run: ${report.consumedRun}`,
    `- consumed_attempt: ${report.consumedAttempt}`,
    `- classification: ${report.classification}`,
    `- flag: ${report.flag}`,
    `- public_state: ${report.publicState}`,
    `- database: ${report.dependencies.database}`,
    `- ledger: ${report.dependencies.ledger}`,
    `- operational_state: ${report.dependencies.operationalState}`,
    `- database_writes: none`,
    `- storage_writes: none`,
    `- attempt_03: not_created`,
    "",
    "## Próxima mudança, ainda sem autorização",
    "",
    ...report.requiredNextChange.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

export async function writeOperationalGateReport({ outputDirectory, report }) {
  assertSanitizedOperationalGateReport(report);
  const reportDirectory = path.resolve(outputDirectory, "reports", "current");
  await mkdir(reportDirectory, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(
        reportDirectory,
        "comun-tijolo-45-3l-operational-gate-diagnostic.md",
      ),
      markdown(report),
      "utf8",
    ),
    writeFile(
      path.join(
        reportDirectory,
        "comun-tijolo-45-3l-operational-gate-package.json",
      ),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    ),
  ]);
}

async function main() {
  const argv = process.argv.slice(2);
  const inventoryPath = optionValue(argv, "--inventory");
  const diagnosticPath = optionValue(argv, "--diagnostic");
  const outputDirectory = optionValue(argv, "--output-directory");
  const mainSha = optionValue(argv, "--main-sha");
  if (!inventoryPath || !diagnosticPath || !outputDirectory || !mainSha) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_GATE_REPORT_ARGUMENTS_INVALID");
  }
  const [inventory, diagnostic] = await Promise.all(
    [inventoryPath, diagnosticPath].map(async (file) =>
      JSON.parse(await readFile(file, "utf8")),
    ),
  );
  await writeOperationalGateReport({
    outputDirectory,
    report: createOperationalGateReport({ mainSha, inventory, diagnostic }),
  });
  console.log("COMUN_SIDEWALK_OPERATIONAL_GATE_REPORT_SANITIZED");
}

if (process.argv[1]?.endsWith("render-sidewalk-operational-gate-report.mjs")) {
  await main();
}
