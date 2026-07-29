import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  canonicalVercelOperationalEnvironment,
  classifyVercelOperationalEnvironmentAccess,
  createOperationalEnvironmentAccessEvidence,
  createVercelOperationalEnvironmentUrls,
  fetchVercelOperationalEnvironmentMetadata,
  fixedReadOnlyVercelRequest,
  projectVercelOperationalEnvironmentMetadata,
} from "./fetch-vercel-operational-env-metadata.mjs";

const environment = {
  VERCEL_TOKEN: "test-only-not-persisted",
  VERCEL_ORG_ID: canonicalVercelOperationalEnvironment.teamId,
  VERCEL_PROJECT_ID: canonicalVercelOperationalEnvironment.projectId,
};

const metadata = {
  envs: [
    { key: "COMUN_SIDEWALK_OPERATIONAL_V2", target: ["production"] },
    {
      key: "COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL",
      target: ["preview"],
    },
    { key: "NEXT_PUBLIC_SUPABASE_URL", target: ["production"] },
    { key: "SUPABASE_SERVICE_ROLE_KEY", target: ["production"] },
    { key: "UNRELATED", target: ["production"], value: "never-persisted" },
  ],
};

function greenRequester() {
  return async (url) =>
    url.includes("/v9/projects/")
      ? { status: 200, transportFailed: false, payload: { ignored: true } }
      : { status: 200, transportFailed: false, payload: metadata };
}

async function temporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), "comun-vercel-env-metadata-"));
}

test("fixed Vercel endpoints use v9 handshake, v10 metadata, decrypt=false, and GET-only requester", () => {
  const urls = createVercelOperationalEnvironmentUrls({
    teamId: canonicalVercelOperationalEnvironment.teamId,
    projectId: canonicalVercelOperationalEnvironment.projectId,
  });
  assert.match(urls.project, /^https:\/\/api\.vercel\.com\/v9\/projects\/prj_/);
  assert.match(
    urls.environment,
    /^https:\/\/api\.vercel\.com\/v10\/projects\/prj_/,
  );
  assert.match(urls.environment, /decrypt=false$/);
  assert.doesNotMatch(
    urls.environment,
    /decrypt=true|\/v9\/projects\/[^/]+\/env/,
  );
  assert.equal(fixedReadOnlyVercelRequest.method, "GET");
  assert.equal(fixedReadOnlyVercelRequest.redirects, "prohibited");
  assert.ok(fixedReadOnlyVercelRequest.connectTimeoutMs > 0);
  assert.ok(
    fixedReadOnlyVercelRequest.totalTimeoutMs >
      fixedReadOnlyVercelRequest.connectTimeoutMs,
  );
});

test("sanitized projection discards values and retains only allowlisted keys and targets", () => {
  const projection = projectVercelOperationalEnvironmentMetadata({
    ...metadata,
    envs: [
      ...metadata.envs,
      {
        key: "COMUN_SIDEWALK_OPERATIONAL_V2",
        target: ["production"],
        value: "never-persisted",
        id: "never-persisted",
      },
    ],
  });
  assert.deepEqual(Object.keys(projection.envs[0]).sort(), ["key", "target"]);
  assert.equal(JSON.stringify(projection).includes("never-persisted"), false);
  assert.equal(
    projection.envs.some((row) => row.key === "UNRELATED"),
    false,
  );
});

test("decrypted responses fail closed before projection", () => {
  assert.throws(
    () =>
      projectVercelOperationalEnvironmentMetadata({
        decrypted: true,
        envs: [],
      }),
    /DECRYPTED_RESPONSE_REJECTED/,
  );
});

test("access classifications are exact across project, HTTP, transport, and invalid-response paths", () => {
  const project = { status: 200, transportFailed: false };
  const cases = [
    [{ status: 401 }, "ENV_METADATA_UNAUTHORIZED"],
    [{ status: 403 }, "ENV_METADATA_FORBIDDEN"],
    [{ status: 404 }, "ENV_METADATA_NOT_FOUND"],
    [{ status: 429 }, "ENV_METADATA_RATE_LIMITED"],
    [{ status: 503 }, "ENV_METADATA_API_UNAVAILABLE"],
    [{ status: 500, transportFailed: true }, "ENV_METADATA_TRANSPORT_FAILED"],
    [{ status: 200, invalidResponse: true }, "ENV_METADATA_RESPONSE_INVALID"],
    [{ status: 200, payload: metadata }, "ENV_METADATA_GREEN"],
  ];
  for (const [environmentResponse, expected] of cases) {
    assert.equal(
      classifyVercelOperationalEnvironmentAccess({
        project,
        environment: environmentResponse,
      }),
      expected,
    );
  }
  assert.equal(
    classifyVercelOperationalEnvironmentAccess({
      project: { status: 403, transportFailed: false },
      environment: { status: 200, payload: metadata },
    }),
    "PROJECT_ACCESS_FAILED",
  );
});

test("access evidence normalizes nonstandard server errors without persisting raw response data", () => {
  assert.deepEqual(
    createOperationalEnvironmentAccessEvidence({
      project: { status: 200 },
      environment: { status: 503 },
      classification: "ENV_METADATA_API_UNAVAILABLE",
    }),
    {
      formatVersion: 1,
      projectAccess: "green",
      environmentMetadataAccess: "api_unavailable",
      projectHttpStatus: 200,
      environmentHttpStatus: 500,
      endpointVersion: "v10",
      decryptRequested: false,
      rawResponsePersisted: false,
      valuesPersisted: false,
    },
  );
});

test("green handshake persists sanitized access, inventory, and report without the response body", async () => {
  const outputDirectory = await temporaryDirectory();
  const result = await fetchVercelOperationalEnvironmentMetadata({
    environment,
    requester: greenRequester(),
    outputDirectory,
  });
  assert.equal(result.classification, "ENV_METADATA_GREEN");
  assert.deepEqual(await readdir(outputDirectory), [
    "access.json",
    "classification.json",
    "inventory.json",
    "sanitization-report.json",
  ]);
  const persisted = await Promise.all(
    [
      "access.json",
      "classification.json",
      "inventory.json",
      "sanitization-report.json",
    ].map((file) => readFile(path.join(outputDirectory, file), "utf8")),
  );
  assert.equal(persisted.join("\n").includes("test-only-not-persisted"), false);
  assert.equal(persisted.join("\n").includes("never-persisted"), false);
  assert.equal(result.inventory.databaseUrlKeyPresent, true);
  assert.equal(result.inventory.databaseUrlTargetsProduction, false);
});

test("failed environment access still persists access evidence but no inventory", async () => {
  const outputDirectory = await temporaryDirectory();
  const result = await fetchVercelOperationalEnvironmentMetadata({
    environment,
    requester: async (url) =>
      url.includes("/v9/projects/")
        ? { status: 200, transportFailed: false }
        : { status: 403, transportFailed: false },
    outputDirectory,
  });
  assert.equal(result.classification, "ENV_METADATA_FORBIDDEN");
  assert.deepEqual(await readdir(outputDirectory), [
    "access.json",
    "classification.json",
    "sanitization-report.json",
  ]);
  assert.equal(
    (
      await readFile(path.join(outputDirectory, "access.json"), "utf8")
    ).includes("403"),
    true,
  );
});

test("configuration and transport failures still persist access evidence without inventory", async () => {
  const outputDirectory = await temporaryDirectory();
  const result = await fetchVercelOperationalEnvironmentMetadata({
    environment: { ...environment, VERCEL_ORG_ID: "wrong" },
    requester: async () => {
      throw new Error("must not call network for invalid configuration");
    },
    outputDirectory,
  });
  assert.equal(result.classification, "PROJECT_ACCESS_FAILED");
  assert.deepEqual(await readdir(outputDirectory), [
    "access.json",
    "classification.json",
    "sanitization-report.json",
  ]);
});
