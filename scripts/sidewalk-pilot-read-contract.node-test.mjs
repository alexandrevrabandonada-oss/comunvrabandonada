import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assertCompletePilotRead } from "../lib/sidewalk-pilot-read-contract.ts";

test("only complete counts, including empty datasets, are accepted", () => {
  assertCompletePilotRead({ data: [], error: null, count: 0 });
  assertCompletePilotRead({ data: [{}], error: null, count: 1 });
  for (const count of [null, undefined, -1, 0.5, "1", 2, 0])
    assert.throws(
      () => assertCompletePilotRead({ data: [{}], error: null, count }),
      /SIDEWALK_PILOT_SAMPLE_INCOMPLETE/,
    );
  assert.throws(
    () =>
      assertCompletePilotRead({
        data: null,
        error: { message: "PRIVATE_PROVIDER_DETAIL" },
        count: null,
      }),
    (error) => error.message === "SIDEWALK_PILOT_READ_FAILED",
  );
});

const rows = {
  comun_sidewalk_uploads: [
    {
      member_user_id: "PRIVATE_TEST_MEMBER",
      status: "confirmed",
      created_at: "2026-08-01T00:00:00.000Z",
      record_id: "PRIVATE_TEST_RECORD",
    },
  ],
  comun_sidewalk_records: [
    {
      id: "PRIVATE_TEST_RECORD",
      status: "pending",
      visibility: "internal",
      created_at: "2026-08-01T00:00:00.000Z",
    },
  ],
  comun_sidewalk_record_photos: [],
  comun_sidewalk_priorities: [
    {
      id: "PRIVATE_TEST_PRIORITY",
      record_id: "PRIVATE_TEST_RECORD",
      status: "approved",
    },
  ],
  comun_sidewalk_record_links: [],
  comun_sidewalk_observations: [],
  comun_admin_alerts: [],
  comun_sidewalk_forwardings: [],
};

async function runReport(incompleteTable, omitCount = false, empty = false) {
  const outputDir = await mkdtemp(join(tmpdir(), "comun-pilot-read-test-"));
  const requests = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    const table = url.pathname.split("/").at(-1);
    requests.push({ table, prefer: request.headers.prefer, url });
    const data = empty ? [] : rows[table];
    if (!data) {
      response.writeHead(404);
      response.end();
      return;
    }
    const count = incompleteTable === table ? data.length + 1 : data.length;
    response.writeHead(200, {
      "content-type": "application/json",
      ...(omitCount && incompleteTable === table
        ? {}
        : {
            "content-range": `${data.length ? `0-${data.length - 1}` : "*"}/${count}`,
          }),
    });
    response.end(JSON.stringify(data));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", "scripts/report-comun-sidewalk-pilot.mjs"],
      {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
          SUPABASE_SERVICE_ROLE_KEY: "local-disposable-fixture-key",
          COMUN_ARTIFACT_DIR: outputDir,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let logs = "";
    child.stdout.on("data", (data) => (logs += data));
    child.stderr.on("data", (data) => (logs += data));
    const code = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    const files = await readdir(outputDir);
    const report = files.includes("comun-sidewalk-pilot.json")
      ? JSON.parse(
          await readFile(join(outputDir, "comun-sidewalk-pilot.json"), "utf8"),
        )
      : null;
    return { code, logs, files, report, requests };
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(outputDir, { recursive: true, force: true });
  }
}

test("real SDK report queries request exact counts and keep the envelope sanitized", async () => {
  const result = await runReport();
  assert.equal(result.code, 0, result.logs);
  assert.equal(result.requests.length, 8);
  assert.ok(
    result.requests.every((request) => request.prefer.includes("count=exact")),
  );
  assert.equal(result.report.metrics.authorized, 1);
  assert.equal(
    result.report.readContract.completeness,
    "exact_count_matches_returned_rows",
  );
  assert.doesNotMatch(JSON.stringify(result.report), /PRIVATE_TEST_/);
  const photosQuery = result.requests.find(
    (request) => request.table === "comun_sidewalk_record_photos",
  );
  assert.equal(
    photosQuery.url.searchParams.get("record_id"),
    "in.(PRIVATE_TEST_RECORD)",
  );
  for (const request of result.requests.filter((request) =>
    ["comun_sidewalk_uploads", "comun_sidewalk_records"].includes(
      request.table,
    ),
  )) {
    assert.deepEqual(request.url.searchParams.getAll("created_at"), [
      "gte.2026-07-30T03:00:00.000Z",
      "lt.2026-08-06T03:00:00.000Z",
    ]);
  }
});

for (const table of Object.keys(rows))
  test(`truncated ${table} never produces a report`, async () => {
    const result = await runReport(table);
    assert.notEqual(result.code, 0);
    assert.match(result.logs, /SIDEWALK_PILOT_SAMPLE_INCOMPLETE/);
    assert.deepEqual(result.files, []);
    assert.doesNotMatch(result.logs, /PRIVATE_TEST_/);
  });

test("missing API count also blocks report publication", async () => {
  const result = await runReport("comun_sidewalk_records", true);
  assert.notEqual(result.code, 0);
  assert.match(result.logs, /SIDEWALK_PILOT_SAMPLE_INCOMPLETE/);
  assert.deepEqual(result.files, []);
});

test("empty pilot skips linked queries and produces zero counts without promotion", async () => {
  const result = await runReport(undefined, false, true);
  assert.equal(result.code, 0, result.logs);
  assert.equal(result.requests.length, 3);
  assert.equal(result.report.metrics.records, 0);
  assert.equal(result.report.metrics.authorized, 0);
  assert.notEqual(result.report.closeout.status, "green_evidence_complete");
});
