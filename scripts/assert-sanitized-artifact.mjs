import { readFile } from "node:fs/promises";

const R4_FIELDS = new Set([
  "source",
  "projectMatchCount",
  "sharedMatchCount",
  "projectType",
  "projectTargets",
  "hasGitBranch",
  "customEnvironmentCount",
  "sharedLinkedToThisProject",
  "sharedProjectCount",
  "sharedTargets",
  "applyToAllCustomEnvironments",
  "resultCode",
  "reasons",
]);

const R5_FIELDS = new Set([
  "present",
  "type",
  "productionOnly",
  "provenance",
  "written",
  "generatedShape",
]);

const forbiddenKey = /^(?:value|token|password|secret|ciphertext|plaintext|privatekey|hash|createdby|updatedby|owner|environmentid|share?did|projectid|teamid)$/i;
const forbiddenValue = /-----BEGIN|secret[-_ ]?value|password|bearer\s+[a-z0-9._-]+|(?:^|[^a-z])(?:[a-z0-9_-]{43,})(?:$|[^a-z0-9_-])/i;

function fail(message) {
  throw new Error(`COMUN_48_6_B2_A2_R5_ARTIFACT_INVALID:${message}`);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label}_object`);
  return value;
}

function exactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key) || forbiddenKey.test(key)) fail(`${label}_field_${key}`);
  }
}

function string(value, label, allowed) {
  if (typeof value !== "string" || (allowed && !allowed.has(value)) || forbiddenValue.test(value)) {
    fail(`${label}_string`);
  }
}

function boolean(value, label) {
  if (typeof value !== "boolean") fail(`${label}_boolean`);
}

function count(value, label) {
  if (!Number.isInteger(value) || value < 0) fail(`${label}_count`);
}

function targetList(value, label) {
  if (!Array.isArray(value) || value.some((item) => !["production", "preview", "development"].includes(item))) {
    fail(`${label}_targets`);
  }
}

export function validateR4Artifact(value) {
  const root = object(value, "r4");
  if (new Set(Object.keys(root)).size !== 3 || !root.locationKey || !root.spatialKey || root.productionWrites !== 0) {
    fail("r4_root");
  }
  for (const [label, entry] of [["location", root.locationKey], ["spatial", root.spatialKey]]) {
    const item = object(entry, label);
    exactKeys(item, R4_FIELDS, label);
    string(item.source, `${label}_source`, new Set(["project", "shared", "project_and_shared", "absent"]));
    count(item.projectMatchCount, `${label}_project_matches`);
    count(item.sharedMatchCount, `${label}_shared_matches`);
    string(item.projectType, `${label}_type`, new Set(["absent", "sensitive", "encrypted", "plain", "other"]));
    targetList(item.projectTargets, `${label}_project`);
    boolean(item.hasGitBranch, `${label}_branch`);
    count(item.customEnvironmentCount, `${label}_custom`);
    boolean(item.sharedLinkedToThisProject, `${label}_linked`);
    count(item.sharedProjectCount, `${label}_shared_projects`);
    targetList(item.sharedTargets, `${label}_shared`);
    if (!(typeof item.applyToAllCustomEnvironments === "boolean" || item.applyToAllCustomEnvironments === "unknown")) fail(`${label}_custom_scope`);
    string(item.resultCode, `${label}_result`);
    if (!Array.isArray(item.reasons) || item.reasons.some((reason) => typeof reason !== "string" || forbiddenValue.test(reason))) fail(`${label}_reasons`);
  }
  return true;
}

export function validateR5Artifact(value) {
  const root = object(value, "r5");
  const expected = new Set(["locationKey", "spatialKey", "secretReadback", "productionEnvWrites", "productionSchemaWrites", "productionBusinessWrites", "artifactSanitizerActuallyExecuted"]);
  if (new Set(Object.keys(root)).size !== expected.size || Object.keys(root).some((key) => !expected.has(key))) fail("r5_root");
  for (const [label, entry] of [["location", root.locationKey], ["spatial", root.spatialKey]]) {
    const item = object(entry, label);
    exactKeys(item, R5_FIELDS, label);
    boolean(item.present, `${label}_present`);
    string(item.type, `${label}_type`, new Set(["sensitive"]));
    boolean(item.productionOnly, `${label}_production`);
    string(item.provenance, `${label}_provenance`, new Set(["p3b_runtime_validated", "r5_independent_random_32_bytes"]));
    boolean(item.written, `${label}_written`);
    if (label === "spatial" && item.generatedShape !== "32_byte_base64url") fail("spatial_shape");
    if (label === "location" && item.generatedShape !== undefined) fail("location_shape");
  }
  boolean(root.secretReadback, "secret_readback");
  count(root.productionEnvWrites, "env_writes");
  count(root.productionSchemaWrites, "schema_writes");
  count(root.productionBusinessWrites, "business_writes");
  boolean(root.artifactSanitizerActuallyExecuted, "sanitizer");
  return true;
}

export async function assertSanitizedArtifact(filePath, profile = "auto") {
  const value = JSON.parse(await readFile(filePath, "utf8"));
  if (profile === "r4" || (profile === "auto" && value.productionWrites !== undefined)) return validateR4Artifact(value);
  if (profile === "r5" || profile === "auto") return validateR5Artifact(value);
  fail("unknown_profile");
}

if (process.argv[1]?.endsWith("assert-sanitized-artifact.mjs")) {
  const filePath = process.argv[2];
  const profile = process.argv[3] ?? "auto";
  if (!filePath) fail("missing_file");
  await assertSanitizedArtifact(filePath, profile);
  console.log("sanitized-artifact=valid");
}
