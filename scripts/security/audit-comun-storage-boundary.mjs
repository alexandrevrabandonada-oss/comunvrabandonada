import { readFile } from "node:fs/promises";
import {
  sanitizedError,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const required = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_BUCKET_ORIGINALS",
  "R2_BUCKET_PUBLIC",
  "R2_PUBLIC_BASE_URL",
];
const optional = ["MEDIA_STORAGE_PROVIDER", "R2_ACCOUNT_ID"];

try {
  const file = process.env.COMUN_SECURITY_VERCEL_ENV_FILE;
  if (!file)
    throw new Error("COMUN_STORAGE_BOUNDARY_ENVIRONMENT_FILE_MISSING");
  const names = new Set();
  for (const raw of (await readFile(file, "utf8")).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const name = line.slice(0, index).trim();
    if ([...required, ...optional].includes(name)) names.add(name);
  }
  const inventory = [...required, ...optional].map((name) => ({
    name,
    status: names.has(name) ? "present" : "missing",
  }));
  const missing = required.filter((name) => !names.has(name));
  await writeEvidence("25-storage-boundary.json", {
    result: missing.length
      ? "COMUN_STORAGE_BOUNDARY_BLOCKED"
      : "COMUN_STORAGE_BOUNDARY_GREEN",
    inventory,
    valuesExposed: false,
    fragmentsExposed: false,
    lengthsExposed: false,
    hashesExposed: false,
  });
  if (missing.length)
    throw new Error("COMUN_STORAGE_RESTORE_BLOCKED_PROVIDER_CREDENTIALS");
  console.log("COMUN_STORAGE_BOUNDARY_GREEN");
} catch (error) {
  await writeFailureEvidence("storage_boundary", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
}
