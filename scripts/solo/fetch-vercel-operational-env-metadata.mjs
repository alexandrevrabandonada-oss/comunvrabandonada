import { mkdir, writeFile } from "node:fs/promises";
import https from "node:https";
import path from "node:path";

import {
  assertSanitizedOperationalEnvironmentInventory,
  createOperationalEnvironmentInventory,
  operationalEnvironmentKeys,
  persistOperationalEnvironmentInventory,
} from "./sidewalk-operational-env-inventory.mjs";

export const canonicalVercelOperationalEnvironment = Object.freeze({
  teamId: "team_LBVwyK8FQMO7tA3hzVXXeumF",
  projectId: "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X",
});

export const operationalEnvironmentAccessClassifications = Object.freeze([
  "PROJECT_ACCESS_FAILED",
  "ENV_METADATA_UNAUTHORIZED",
  "ENV_METADATA_FORBIDDEN",
  "ENV_METADATA_NOT_FOUND",
  "ENV_METADATA_RATE_LIMITED",
  "ENV_METADATA_API_UNAVAILABLE",
  "ENV_METADATA_TRANSPORT_FAILED",
  "ENV_METADATA_RESPONSE_INVALID",
  "ENV_METADATA_GREEN",
]);

const allowedStatusCodes = new Set([200, 401, 403, 404, 429, 500]);
const artifactDirectory = process.env
  .COMUN_SIDEWALK_OPERATIONAL_ENV_ARTIFACT_DIRECTORY
  ? path.resolve(process.env.COMUN_SIDEWALK_OPERATIONAL_ENV_ARTIFACT_DIRECTORY)
  : path.resolve(".ci-artifacts/sidewalk-operational-env");
export const fixedReadOnlyVercelRequest = Object.freeze({
  method: "GET",
  connectTimeoutMs: 3_000,
  totalTimeoutMs: 8_000,
  redirects: "prohibited",
});

function normalizedStatus(status) {
  return allowedStatusCodes.has(status) ? status : 500;
}

function assertAccessEvidence(evidence) {
  const allowedMetadataAccess = new Set([
    "green",
    "unauthorized",
    "forbidden",
    "not_found",
    "rate_limited",
    "api_unavailable",
    "transport_failed",
    "invalid_response",
  ]);
  const expectedKeys = [
    "formatVersion",
    "projectAccess",
    "environmentMetadataAccess",
    "projectHttpStatus",
    "environmentHttpStatus",
    "endpointVersion",
    "decryptRequested",
    "rawResponsePersisted",
    "valuesPersisted",
  ];
  if (
    !evidence ||
    typeof evidence !== "object" ||
    JSON.stringify(Object.keys(evidence).sort()) !==
      JSON.stringify([...expectedKeys].sort()) ||
    evidence.formatVersion !== 1 ||
    !["green", "failed"].includes(evidence.projectAccess) ||
    !allowedMetadataAccess.has(evidence.environmentMetadataAccess) ||
    !allowedStatusCodes.has(evidence.projectHttpStatus) ||
    !allowedStatusCodes.has(evidence.environmentHttpStatus) ||
    evidence.endpointVersion !== "v10" ||
    evidence.decryptRequested !== false ||
    evidence.rawResponsePersisted !== false ||
    evidence.valuesPersisted !== false
  ) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_ACCESS_INVALID");
  }
  return evidence;
}

function assertSanitizationReport(report) {
  if (
    !report ||
    report.status !== "sanitized" ||
    report.rawResponsePersisted !== false ||
    report.valuesPersisted !== false ||
    report.forbiddenOccurrences !== 0
  ) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_SANITIZATION_INVALID");
  }
  return report;
}

export function validateCanonicalVercelOperationalEnvironment(environment) {
  if (
    !environment?.VERCEL_TOKEN ||
    environment.VERCEL_ORG_ID !==
      canonicalVercelOperationalEnvironment.teamId ||
    environment.VERCEL_PROJECT_ID !==
      canonicalVercelOperationalEnvironment.projectId
  ) {
    throw new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_CONFIGURATION_INVALID");
  }
  return {
    token: environment.VERCEL_TOKEN,
    teamId: canonicalVercelOperationalEnvironment.teamId,
    projectId: canonicalVercelOperationalEnvironment.projectId,
  };
}

export function createVercelOperationalEnvironmentUrls({ teamId, projectId }) {
  const teamIdParameter = encodeURIComponent(teamId);
  const projectIdParameter = encodeURIComponent(projectId);
  return {
    project: `https://api.vercel.com/v9/projects/${projectIdParameter}?teamId=${teamIdParameter}`,
    environment: `https://api.vercel.com/v10/projects/${projectIdParameter}/env?teamId=${teamIdParameter}&decrypt=false`,
  };
}

function requestJson(url, token) {
  return new Promise((resolve) => {
    const totalTimer = setTimeout(() => {
      request.destroy(
        new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_TOTAL_TIMEOUT"),
      );
    }, fixedReadOnlyVercelRequest.totalTimeoutMs);
    const request = https.request(
      url,
      {
        method: fixedReadOnlyVercelRequest.method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        timeout: fixedReadOnlyVercelRequest.connectTimeoutMs,
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          clearTimeout(totalTimer);
          const status = normalizedStatus(response.statusCode ?? 500);
          if (status !== 200)
            return resolve({ status, transportFailed: false });
          try {
            return resolve({
              status,
              transportFailed: false,
              payload: JSON.parse(Buffer.concat(chunks).toString("utf8")),
            });
          } catch {
            return resolve({
              status,
              transportFailed: false,
              invalidResponse: true,
            });
          }
        });
      },
    );
    request.setTimeout(fixedReadOnlyVercelRequest.connectTimeoutMs, () => {
      request.destroy(
        new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_CONNECT_TIMEOUT"),
      );
    });
    request.once("error", () => {
      clearTimeout(totalTimer);
      resolve({ status: 500, transportFailed: true });
    });
    request.end();
  });
}

function containsDecryptedTrue(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsDecryptedTrue);
  return Object.entries(value).some(([key, nested]) =>
    key.toLowerCase() === "decrypted"
      ? nested === true
      : containsDecryptedTrue(nested),
  );
}

export function projectVercelOperationalEnvironmentMetadata(payload) {
  if (containsDecryptedTrue(payload)) {
    throw new Error(
      "COMUN_SIDEWALK_OPERATIONAL_ENV_DECRYPTED_RESPONSE_REJECTED",
    );
  }
  const rows = Array.isArray(payload?.envs)
    ? payload.envs
    : Array.isArray(payload)
      ? payload
      : null;
  if (!rows) throw new Error("COMUN_SIDEWALK_OPERATIONAL_ENV_METADATA_INVALID");
  return {
    envs: rows
      .filter((row) => row && typeof row.key === "string")
      .filter((row) => operationalEnvironmentKeys.includes(row.key))
      .map((row) => ({
        key: row.key,
        target: Array.isArray(row.target)
          ? row.target.filter((target) => typeof target === "string")
          : typeof row.target === "string"
            ? [row.target]
            : [],
      })),
  };
}

export function classifyVercelOperationalEnvironmentAccess({
  project,
  environment,
}) {
  if (project.transportFailed || project.status !== 200) {
    return "PROJECT_ACCESS_FAILED";
  }
  if (environment.transportFailed) return "ENV_METADATA_TRANSPORT_FAILED";
  if (environment.status === 401) return "ENV_METADATA_UNAUTHORIZED";
  if (environment.status === 403) return "ENV_METADATA_FORBIDDEN";
  if (environment.status === 404) return "ENV_METADATA_NOT_FOUND";
  if (environment.status === 429) return "ENV_METADATA_RATE_LIMITED";
  if (environment.status >= 500) return "ENV_METADATA_API_UNAVAILABLE";
  if (environment.status !== 200 || environment.invalidResponse) {
    return "ENV_METADATA_RESPONSE_INVALID";
  }
  try {
    const projection = projectVercelOperationalEnvironmentMetadata(
      environment.payload,
    );
    assertSanitizedOperationalEnvironmentInventory(
      createOperationalEnvironmentInventory(projection),
    );
    return "ENV_METADATA_GREEN";
  } catch {
    return "ENV_METADATA_RESPONSE_INVALID";
  }
}

export function createOperationalEnvironmentAccessEvidence({
  project,
  environment,
  classification,
}) {
  const evidence = {
    formatVersion: 1,
    projectAccess:
      project.status === 200 && !project.transportFailed ? "green" : "failed",
    environmentMetadataAccess:
      classification === "ENV_METADATA_GREEN"
        ? "green"
        : classification === "ENV_METADATA_UNAUTHORIZED"
          ? "unauthorized"
          : classification === "ENV_METADATA_FORBIDDEN"
            ? "forbidden"
            : classification === "ENV_METADATA_NOT_FOUND"
              ? "not_found"
              : classification === "ENV_METADATA_RATE_LIMITED"
                ? "rate_limited"
                : classification === "ENV_METADATA_TRANSPORT_FAILED"
                  ? "transport_failed"
                  : classification === "ENV_METADATA_RESPONSE_INVALID"
                    ? "invalid_response"
                    : "api_unavailable",
    projectHttpStatus: normalizedStatus(project.status ?? 500),
    environmentHttpStatus: normalizedStatus(environment.status ?? 500),
    endpointVersion: "v10",
    decryptRequested: false,
    rawResponsePersisted: false,
    valuesPersisted: false,
  };
  return assertAccessEvidence(evidence);
}

export async function persistVercelOperationalEnvironmentEvidence(
  directory,
  evidence,
  classification,
  inventory,
) {
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "access.json"),
    `${JSON.stringify(assertAccessEvidence(evidence), null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(directory, "classification.json"),
    `${JSON.stringify({ classification }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(directory, "sanitization-report.json"),
    `${JSON.stringify(
      assertSanitizationReport({
        status: "sanitized",
        rawResponsePersisted: false,
        valuesPersisted: false,
        forbiddenOccurrences: 0,
      }),
      null,
      2,
    )}\n`,
    "utf8",
  );
  if (inventory) {
    await persistOperationalEnvironmentInventory(
      path.join(directory, "inventory.json"),
      assertSanitizedOperationalEnvironmentInventory(inventory),
    );
  }
}

export async function fetchVercelOperationalEnvironmentMetadata({
  environment = process.env,
  requester = requestJson,
  outputDirectory = artifactDirectory,
} = {}) {
  let project = { status: 500, transportFailed: true };
  let metadata = { status: 500, transportFailed: true };
  try {
    const credentials =
      validateCanonicalVercelOperationalEnvironment(environment);
    const urls = createVercelOperationalEnvironmentUrls(credentials);
    try {
      project = await requester(urls.project, credentials.token);
    } catch {
      project = { status: 500, transportFailed: true };
    }
    if (project.status === 200 && !project.transportFailed) {
      try {
        metadata = await requester(urls.environment, credentials.token);
      } catch {
        metadata = { status: 500, transportFailed: true };
      }
    }
  } catch {
    // Configuration failures are intentionally reduced to sanitized evidence.
  }
  const classification = classifyVercelOperationalEnvironmentAccess({
    project,
    environment: metadata,
  });
  let inventory;
  if (classification === "ENV_METADATA_GREEN") {
    const projection = projectVercelOperationalEnvironmentMetadata(
      metadata.payload,
    );
    inventory = assertSanitizedOperationalEnvironmentInventory(
      createOperationalEnvironmentInventory(projection),
    );
  }
  const evidence = createOperationalEnvironmentAccessEvidence({
    project,
    environment: metadata,
    classification,
  });
  await persistVercelOperationalEnvironmentEvidence(
    outputDirectory,
    evidence,
    classification,
    inventory,
  );
  return { classification, evidence, inventory };
}

async function main() {
  const result = await fetchVercelOperationalEnvironmentMetadata();
  console.log(`COMUN_SIDEWALK_OPERATIONAL_ENV_ACCESS ${result.classification}`);
  if (result.classification !== "ENV_METADATA_GREEN") process.exitCode = 1;
}

if (process.argv[1]?.endsWith("fetch-vercel-operational-env-metadata.mjs")) {
  await main();
}
