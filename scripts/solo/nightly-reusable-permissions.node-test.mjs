import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// The workflow only uses flat GitHub permission maps. Parse those maps by
// indentation so key order and YAML formatting do not define the contract.
function permissionMap(lines, start, end, indent) {
  const declaration = lines.findIndex(
    (line, index) =>
      index >= start &&
      index < end &&
      line === `${" ".repeat(indent)}permissions:`,
  );
  if (declaration < 0) return null;
  const entries = [];
  for (let index = declaration + 1; index < end; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const match = line.match(
      new RegExp(`^ {${indent + 2}}([a-z-]+): (read|write)$`),
    );
    if (!match) break;
    entries.push([match[1], match[2]]);
  }
  assert.equal(new Set(entries.map(([name]) => name)).size, entries.length);
  return Object.fromEntries(entries);
}

function workflowContracts(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const jobsAt = lines.findIndex((line) => line === "jobs:");
  assert.ok(jobsAt >= 0, `${path}: jobs`);
  const workflow = permissionMap(lines, 0, jobsAt, 0);
  const jobStarts = lines.flatMap((line, index) =>
    index > jobsAt && /^  [a-z][a-z0-9-]+:$/.test(line) ? [index] : [],
  );
  const jobs = Object.fromEntries(
    jobStarts.map((start, index) => {
      const end = jobStarts[index + 1] ?? lines.length;
      const name = lines[start].trim().slice(0, -1);
      const condition = lines
        .slice(start + 1, end)
        .find((line) => line.startsWith("    if: "))
        ?.slice(8);
      return [
        name,
        { permissions: permissionMap(lines, start, end, 4), condition },
      ];
    }),
  );
  return { workflow, jobs };
}

const nightly = workflowContracts(".github/workflows/comun-nightly.yml");
const reusable = workflowContracts(".github/workflows/comun-ci.yml");

test("Nightly reusable caller grants exactly the permissions requested by COMUN CI", () => {
  assert.deepEqual(nightly.workflow, { contents: "read" });
  assert.deepEqual(nightly.jobs["full-local"].permissions, reusable.workflow);
  const rank = { read: 1, write: 2 };
  for (const [name, level] of Object.entries(reusable.workflow)) {
    assert.ok(
      rank[nightly.jobs["full-local"].permissions[name]] >= rank[level],
      `${name}: caller must cover reusable request`,
    );
  }
});

test("capture and preflight tokens are scoped per job", () => {
  assert.deepEqual(nightly.jobs["baseline-capture"].permissions, {
    contents: "read",
  });
  assert.deepEqual(nightly.jobs["release-preflight"].permissions, {
    contents: "read",
  });
  assert.deepEqual(nightly.jobs["preview-preflight"].permissions, {
    contents: "read",
    "pull-requests": "read",
  });
  assert.deepEqual(nightly.jobs["production-health"].permissions, {
    contents: "read",
    issues: "write",
  });
  assert.deepEqual(nightly.jobs["sidewalk-cleanup-dry-run"].permissions, {
    contents: "read",
  });
  assert.equal(
    Object.values(nightly.jobs["baseline-capture"].permissions).includes(
      "write",
    ),
    false,
  );
});

test("capture dispatch excludes other Nightly jobs and archive worker stays scheduled", () => {
  assert.match(
    nightly.jobs["baseline-capture"].condition,
    /inputs\.capture_baseline/,
  );
  for (const name of [
    "full-local",
    "production-health",
    "sidewalk-cleanup-dry-run",
  ]) {
    assert.match(
      nightly.jobs[name].condition,
      /!inputs\.capture_baseline/,
      name,
    );
  }
  assert.match(
    nightly.jobs["archive-worker"].condition,
    /github\.event\.schedule/,
  );
  assert.doesNotMatch(
    nightly.jobs["archive-worker"].condition,
    /workflow_dispatch/,
  );
});
