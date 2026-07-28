import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const operationalEnvironmentKeys = [
  "COMUN_SIDEWALK_OPERATIONAL_V2",
  "COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const sensitiveValueFields = new Set([
  "value",
  "encryptedvalue",
  "decryptedvalue",
  "plaintext",
]);
const sensitivePatterns = [
  /postgres(?:ql)?:\/\//i,
  /\b(?:password|token|authorization|cookie|service[_ -]?role\s*(?:key|token|=|:))\b/i,
  /\beyJ[a-zA-Z0-9_-]{10,}/,
  /(?:dsn|connection string|private_notes|object_key|exact_latitude|exact_longitude)/i,
];

function optionValue(argv, option) {
  return argv
    .find((value) => value.startsWith(`${option}=`))
    ?.slice(option.length + 1);
}

function containsSensitiveValueField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsSensitiveValueField);
  return Object.entries(value).some(([key, nested]) => {
    if (sensitiveValueFields.has(key.toLowerCase())) return true;
    return containsSensitiveValueField(nested);
  });
}

function targetsProduction(target) {
  const values = Array.isArray(target) ? target : [target];
  return values.some((value) => String(value).toLowerCase() === "production");
}

function rowsFromMetadata(payload) {
  const rows = Array.isArray(payload?.envs)
    ? payload.envs
    : Array.isArray(payload)
      ? payload
      : null;
  if (!rows || rows.some((row) => !row || typeof row.key !== "string")) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_METADATA_INVALID");
  }
  return rows;
}

function inventoryField(rows, key) {
  const matching = rows.filter((row) => row.key === key);
  return {
    present: matching.length > 0,
    targetsProduction: matching.some((row) => targetsProduction(row.target)),
  };
}

export function createOperationalEnvironmentInventory(payload) {
  if (containsSensitiveValueField(payload)) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_VALUE_CAPTURED");
  }
  const rows = rowsFromMetadata(payload);
  const flag = inventoryField(rows, "COMUN_SIDEWALK_OPERATIONAL_V2");
  const databaseUrl = inventoryField(
    rows,
    "COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL",
  );
  const publicSupabaseUrl = inventoryField(rows, "NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = inventoryField(rows, "SUPABASE_SERVICE_ROLE_KEY");
  return {
    flagKeyPresent: flag.present,
    flagTargetsProduction: flag.targetsProduction,
    databaseUrlKeyPresent: databaseUrl.present,
    databaseUrlTargetsProduction: databaseUrl.targetsProduction,
    publicSupabaseUrlPresent: publicSupabaseUrl.present,
    serviceRoleKeyPresent: serviceRoleKey.present,
  };
}

export function assertSanitizedOperationalEnvironmentInventory(inventory) {
  const keys = [
    "flagKeyPresent",
    "flagTargetsProduction",
    "databaseUrlKeyPresent",
    "databaseUrlTargetsProduction",
    "publicSupabaseUrlPresent",
    "serviceRoleKeyPresent",
  ];
  if (
    !inventory ||
    typeof inventory !== "object" ||
    JSON.stringify(Object.keys(inventory).sort()) !==
      JSON.stringify([...keys].sort()) ||
    keys.some((key) => typeof inventory[key] !== "boolean")
  ) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_INVENTORY_INVALID");
  }
  const serialized = JSON.stringify(inventory);
  if (sensitivePatterns.some((pattern) => pattern.test(serialized))) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_INVENTORY_SENSITIVE");
  }
  return inventory;
}

export async function persistOperationalEnvironmentInventory(
  output,
  inventory,
) {
  const target = path.resolve(output);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
}

async function main() {
  const input = optionValue(process.argv.slice(2), "--input");
  const output = optionValue(process.argv.slice(2), "--output");
  if (!input || !output) {
    throw new Error(
      "COMUN_SIDEWALK_OPERATIONAL_ENV_INVENTORY_ARGUMENTS_INVALID",
    );
  }
  const raw = await readFile(input, "utf8");
  const payload = JSON.parse(raw);
  const inventory = assertSanitizedOperationalEnvironmentInventory(
    createOperationalEnvironmentInventory(payload),
  );
  await persistOperationalEnvironmentInventory(output, inventory);
  console.log("COMUN_SIDEWALK_OPERATIONAL_ENV_INVENTORY_READ_ONLY_GREEN");
}

if (process.argv[1]?.endsWith("sidewalk-operational-env-inventory.mjs")) {
  await main();
}
