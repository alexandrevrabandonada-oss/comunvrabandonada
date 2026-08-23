import crypto from "node:crypto";
import fs from "node:fs";

const KEYS = [
  "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED",
  "COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED",
];

const fingerprint = (value) =>
  typeof value === "string" && value.length > 0
    ? `sha256:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`
    : null;

const rows = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.envs) ? value.envs : Array.isArray(value?.data) ? value.data : [];

const readEnvironment = (path) => {
  const values = new Map();
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values.set(match[1], match[2].replace(/^"|"$/g, "").replaceAll('\\"', '"'));
  }
  return values;
};

const state = (value) => (value === "enabled" ? "ON" : value === "disabled" ? "OFF" : value ? "UNKNOWN" : "ABSENT");

function auditKey(key, projectRows, sharedRows, env) {
  const matches = projectRows.filter((row) => row?.key === key);
  const production = matches.filter((row) => Array.isArray(row?.target) && row.target.includes("production"));
  if (production.length !== 1) throw new Error(`${key}_PRODUCTION_KEY_NOT_UNIQUE`);
  if (sharedRows.some((row) => row?.key === key)) throw new Error(`${key}_SHARED_ENV_CONFLICT`);
  const row = production[0];
  if (row.gitBranch != null) throw new Error(`${key}_PRODUCTION_BRANCH_OVERRIDE`);
  if (Array.isArray(row.customEnvironmentIds) && row.customEnvironmentIds.length > 0) {
    throw new Error(`${key}_PRODUCTION_CUSTOM_ENV_OVERRIDE`);
  }
  if (row.type !== "encrypted") throw new Error(`${key}_PRODUCTION_TYPE_NOT_ENCRYPTED`);
  const valueState = state(env.get(key));
  if (valueState !== "ON") throw new Error(`${key}_EXPECTED_ON_GOT_${valueState}`);
  return {
    key,
    id: fingerprint(row.id),
    type: row.type,
    target: row.target,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null,
    valueState,
    sharedMatches: 0,
    gitBranchOverride: false,
    customEnvironmentOverride: false,
  };
}

export function auditA5A1R1Flags({ project, shared, env, output }) {
  const projectRows = rows(project);
  const sharedRows = rows(shared);
  const result = {
    formatVersion: 1,
    phase: "a5-a1-r1-read-only",
    a3: auditKey(KEYS[0], projectRows, sharedRows, env),
    a4: auditKey(KEYS[1], projectRows, sharedRows, env),
    valuesPersisted: false,
    secretsPersisted: false,
  };
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

if (process.argv[1]?.endsWith("a5-a1-r1-flag-contract.mjs")) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
  const result = auditA5A1R1Flags({
    project: JSON.parse(fs.readFileSync(args.get("--project-json"), "utf8")),
    shared: JSON.parse(fs.readFileSync(args.get("--shared-json"), "utf8")),
    env: readEnvironment(args.get("--env-file")),
    output: args.get("--output"),
  });
  console.log(`COMUN_48_5_A5_A1_R1_FLAG_AUDIT_GREEN a3=${result.a3.valueState} a4=${result.a4.valueState}`);
}
