import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const classifications = new Set([
  "PRODUCTION_DATABASE_URL_KEY_MISSING",
  "PRODUCTION_DATABASE_URL_WRONG_TARGET",
  "RUNTIME_DATABASE_CONNECTION_FAILED",
  "RUNTIME_LEDGER_ROW_MISSING",
  "RUNTIME_LEDGER_MISMATCH",
  "FLAG_DEPLOYMENT_BINDING_NOT_CONFIRMED",
  "INSUFFICIENT_EVIDENCE",
]);

const inventoryKeys = [
  "flagKeyPresent",
  "flagTargetsProduction",
  "databaseUrlKeyPresent",
  "databaseUrlTargetsProduction",
  "publicSupabaseUrlPresent",
  "serviceRoleKeyPresent",
];
const diagnosticKeys = [
  "formatVersion",
  "flag",
  "databaseUrl",
  "database",
  "ledger",
  "operationalState",
];

function hasExactKeys(value, keys) {
  return (
    value &&
    typeof value === "object" &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...keys].sort())
  );
}

export function classifySidewalkOperationalGate({ inventory, diagnostic }) {
  if (
    !hasExactKeys(inventory, inventoryKeys) ||
    !inventoryKeys.every((key) => typeof inventory[key] === "boolean") ||
    !hasExactKeys(diagnostic, diagnosticKeys) ||
    diagnostic.formatVersion !== 1
  ) {
    return "INSUFFICIENT_EVIDENCE";
  }
  if (!inventory.databaseUrlKeyPresent) {
    return "PRODUCTION_DATABASE_URL_KEY_MISSING";
  }
  if (!inventory.databaseUrlTargetsProduction) {
    return "PRODUCTION_DATABASE_URL_WRONG_TARGET";
  }
  if (diagnostic.database === "unreachable") {
    return "RUNTIME_DATABASE_CONNECTION_FAILED";
  }
  if (diagnostic.ledger === "missing") {
    return "RUNTIME_LEDGER_ROW_MISSING";
  }
  if (diagnostic.ledger === "mismatch") {
    return "RUNTIME_LEDGER_MISMATCH";
  }
  if (
    diagnostic.database === "reachable" &&
    diagnostic.ledger === "exact" &&
    diagnostic.operationalState === "FLAG_DISABLED"
  ) {
    return "FLAG_DEPLOYMENT_BINDING_NOT_CONFIRMED";
  }
  return "INSUFFICIENT_EVIDENCE";
}

export function assertOperationalGateClassification(value) {
  if (!classifications.has(value)) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_GATE_CLASSIFICATION_INVALID");
  }
  return value;
}

function optionValue(argv, option) {
  return argv
    .find((value) => value.startsWith(`${option}=`))
    ?.slice(option.length + 1);
}

export async function persistOperationalGateClassification(output, value) {
  const classification = assertOperationalGateClassification(value);
  const target = path.resolve(output);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(
    target,
    `${JSON.stringify({ classification }, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const inventoryPath = optionValue(argv, "--inventory");
  const diagnosticPath = optionValue(argv, "--diagnostic");
  const output = optionValue(argv, "--output");
  if (!inventoryPath || !diagnosticPath || !output) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_GATE_ARGUMENTS_INVALID");
  }
  const [inventory, diagnostic] = await Promise.all(
    [inventoryPath, diagnosticPath].map(async (file) =>
      JSON.parse(await readFile(file, "utf8")),
    ),
  );
  await persistOperationalGateClassification(
    output,
    classifySidewalkOperationalGate({ inventory, diagnostic }),
  );
  console.log("COMUN_SIDEWALK_OPERATIONAL_GATE_CLASSIFIED");
}

if (process.argv[1]?.endsWith("classify-sidewalk-operational-gate.mjs")) {
  await main();
}
