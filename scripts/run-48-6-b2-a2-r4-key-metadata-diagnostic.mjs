import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const canonicalVercelBinding = Object.freeze({
  projectId: "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X",
  teamId: "team_LBVwyK8FQMO7tA3hzVXXeumF",
});

export const diagnosticKeys = Object.freeze([
  "COMUN_RELATA_LOCATION_ENCRYPTION_KEY",
  "COMUN_RELATA_SPATIAL_HMAC_KEY",
]);

const allowedTargets = new Set(["production", "preview", "development"]);

function rowsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.envs)) return payload.envs;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizedTargets(value) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [...new Set(values.filter((target) => allowedTargets.has(target)))].sort(
    (a, b) => ["production", "preview", "development"].indexOf(a) - ["production", "preview", "development"].indexOf(b),
  );
}

function projectTargetClass(rows) {
  const targets = [...new Set(rows.flatMap((row) => normalizedTargets(row.target)))];
  return targets.length === 0 ? [] : targets;
}

function hasAnyDecryptedTrue(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasAnyDecryptedTrue);
  return Object.entries(value).some(([key, nested]) =>
    key.toLowerCase() === "decrypted" ? nested === true : hasAnyDecryptedTrue(nested),
  );
}

function projectRowsForKey(payload, key) {
  return rowsFromPayload(payload).filter((row) => row && row.key === key);
}

function sharedProjectIds(row) {
  const values = [];
  const add = (value) => {
    if (typeof value === "string" && value) values.push(value);
  };
  const addMany = (value) => {
    if (Array.isArray(value)) value.forEach((item) => {
      if (typeof item === "string") add(item);
      else if (item && typeof item === "object") add(item.id ?? item.projectId);
    });
    else add(value);
  };
  addMany(row.projectId);
  addMany(row.projectIds);
  addMany(row.projects);
  addMany(row.linkedProjectIds);
  return [...new Set(values)];
}

function sharedRowsForKey(payload, key) {
  return rowsFromPayload(payload).filter((row) => row && row.key === key);
}

function sharedScope(rows, projectId) {
  const projectIds = new Set();
  let linked = false;
  let explicitTrue = false;
  let explicitFalse = false;
  for (const row of rows) {
    for (const id of sharedProjectIds(row)) {
      projectIds.add(id);
      if (id === projectId) linked = true;
    }
    if (row.applyToAllCustomEnvironments === true || row.applyToAllCustomEnvironments === "true") explicitTrue = true;
    if (row.applyToAllCustomEnvironments === false || row.applyToAllCustomEnvironments === "false") explicitFalse = true;
  }
  return {
    sharedLinkedToThisProject: linked,
    sharedProjectCount: projectIds.size,
    sharedTargets: [...new Set(rows.flatMap((row) => normalizedTargets(row.target)))],
    applyToAllCustomEnvironments: explicitTrue
      ? true
      : explicitFalse
        ? false
        : "unknown",
  };
}

function typeOfProject(rows) {
  if (!rows.length) return "absent";
  const type = rows[0]?.type;
  return type === "encrypted" || type === "sensitive" || type === "plain"
    ? type
    : "other";
}

function primaryResultCode({ projectRows, sharedRows, reasons }) {
  if (projectRows.length > 1) return "KEY_PROJECT_DUPLICATE";
  if (!projectRows.length && !sharedRows.length) return "KEY_ABSENT";
  if (!projectRows.length && sharedRows.length > 0) {
    return reasons.includes("shared_multi_project")
      ? "KEY_SHARED_MULTI_PROJECT"
      : "KEY_SHARED_ONLY";
  }
  if (sharedRows.length) return "KEY_PROJECT_AND_SHARED";
  if (reasons.includes("wrong_type")) return "KEY_PROJECT_WRONG_TYPE";
  if (reasons.includes("wrong_target")) return "KEY_PROJECT_WRONG_TARGET";
  if (reasons.includes("branch_scoped")) return "KEY_PROJECT_BRANCH_SCOPED";
  if (reasons.includes("custom_environment_scoped")) return "KEY_PROJECT_CUSTOM_ENV_SCOPED";
  return projectRows[0]?.type === "sensitive" ? "KEY_PROJECT_CANONICAL_SENSITIVE" : "KEY_PROJECT_CANONICAL";
}

function sanitizeKey(key, projectPayload, sharedPayload, projectId) {
  if (hasAnyDecryptedTrue(projectPayload) || hasAnyDecryptedTrue(sharedPayload)) {
    throw new Error("COMUN_48_6_B2_A2_R4_DECRYPTED_METADATA_REJECTED");
  }
  const projectRows = projectRowsForKey(projectPayload, key);
  const sharedRows = sharedRowsForKey(sharedPayload, key);
  const projectTargets = projectTargetClass(projectRows);
  const shared = sharedScope(sharedRows, projectId);
  const reasons = [];
  if (projectRows.length > 1) reasons.push("project_duplicate");
  if (projectRows.length && projectRows.some((row) => row.type !== "sensitive")) {
    reasons.push("wrong_type");
  }
  if (projectRows.length && projectRows.some((row) =>
    JSON.stringify(normalizedTargets(row.target)) !== JSON.stringify(["production"]))) {
    reasons.push("wrong_target");
  }
  if (projectRows.some((row) => typeof row.gitBranch === "string" && row.gitBranch.length > 0)) {
    reasons.push("branch_scoped");
  }
  if (projectRows.some((row) => Array.isArray(row.customEnvironmentIds) && row.customEnvironmentIds.length > 0)) {
    reasons.push("custom_environment_scoped");
  }
  if (sharedRows.length && shared.sharedProjectCount > 1) reasons.push("shared_multi_project");
  if (sharedRows.length && !shared.sharedLinkedToThisProject) reasons.push("shared_not_linked_to_project");
  const source = projectRows.length && sharedRows.length
    ? "project_and_shared"
    : projectRows.length
      ? "project"
      : sharedRows.length
        ? "shared"
        : "absent";
  return {
    source,
    projectMatchCount: projectRows.length,
    sharedMatchCount: sharedRows.length,
    projectType: typeOfProject(projectRows),
    projectTargets,
    hasGitBranch: projectRows.some((row) => typeof row.gitBranch === "string" && row.gitBranch.length > 0),
    customEnvironmentCount: projectRows.reduce(
      (total, row) => total + (Array.isArray(row.customEnvironmentIds) ? row.customEnvironmentIds.length : 0),
      0,
    ),
    sharedLinkedToThisProject: shared.sharedLinkedToThisProject,
    sharedProjectCount: shared.sharedProjectCount,
    sharedTargets: shared.sharedTargets,
    applyToAllCustomEnvironments: shared.applyToAllCustomEnvironments,
    resultCode: primaryResultCode({ projectRows, sharedRows, reasons }),
    reasons,
  };
}

export function createSanitizedKeyMetadataDiagnostic({
  projectPayload,
  sharedLocationPayload,
  sharedSpatialPayload,
  projectId = canonicalVercelBinding.projectId,
} = {}) {
  const diagnostic = {
    locationKey: sanitizeKey(
      diagnosticKeys[0],
      projectPayload,
      sharedLocationPayload,
      projectId,
    ),
    spatialKey: sanitizeKey(
      diagnosticKeys[1],
      projectPayload,
      sharedSpatialPayload,
      projectId,
    ),
    productionWrites: 0,
  };
  return diagnostic;
}

export async function writeSanitizedDiagnostic({
  projectPath,
  sharedLocationPath,
  sharedSpatialPath,
  outputPath,
} = {}) {
  const [projectRaw, locationRaw, spatialRaw] = await Promise.all([
    readFile(projectPath, "utf8"),
    readFile(sharedLocationPath, "utf8"),
    readFile(sharedSpatialPath, "utf8"),
  ]);
  const diagnostic = createSanitizedKeyMetadataDiagnostic({
    projectPayload: JSON.parse(projectRaw),
    sharedLocationPayload: JSON.parse(locationRaw),
    sharedSpatialPayload: JSON.parse(spatialRaw),
  });
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(diagnostic, null, 2)}\n`, "utf8");
  return diagnostic;
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1]) throw new Error(`missing ${name}`);
  return args[index + 1];
}

if (process.argv[1]?.endsWith("run-48-6-b2-a2-r4-key-metadata-diagnostic.mjs")) {
  const args = process.argv.slice(2);
  const diagnostic = await writeSanitizedDiagnostic({
    projectPath: argumentValue(args, "--project"),
    sharedLocationPath: argumentValue(args, "--shared-location"),
    sharedSpatialPath: argumentValue(args, "--shared-spatial"),
    outputPath: argumentValue(args, "--output"),
  });
  console.log(JSON.stringify({
    result: "COMUN_48_6_B2_A2_R4_KEY_METADATA_DIAGNOSED",
    productionWrites: diagnostic.productionWrites,
  }));
}
