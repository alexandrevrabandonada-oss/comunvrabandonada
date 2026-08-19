import test from "node:test";
import assert from "node:assert/strict";

import {
  changedFilesFromDiff,
  classifyBuildImpact,
} from "./vercel-build-impact.mjs";

const preview = (files) =>
  classifyBuildImpact({ files, vercelEnv: "preview", commitRef: "feature/test" });

test("docs-only preview is ignored", () => {
  assert.deepEqual(preview(["docs/x.md"]), {
    decision: "IGNORE",
    reason: "no-runtime-allowlist",
  });
});

test("reports-only preview is ignored", () => {
  assert.equal(preview(["reports/x.md"]).decision, "IGNORE");
});

test("test-only preview is ignored", () => {
  assert.equal(preview(["tests/foo.test.ts"]).decision, "IGNORE");
  assert.equal(preview(["test/foo.test.ts"]).decision, "IGNORE");
  assert.equal(preview(["e2e/foo.spec.tsx"]).decision, "IGNORE");
});

test("workflow-only preview is ignored", () => {
  assert.equal(preview([".github/workflows/foo.yml"]).decision, "IGNORE");
});

test("approved operational scripts are ignored", () => {
  assert.equal(preview(["scripts/solo/foo.mjs"]).decision, "IGNORE");
  assert.equal(preview(["scripts/audit/foo.mjs"]).decision, "IGNORE");
  assert.equal(preview(["scripts/diagnostics/foo.mjs"]).decision, "IGNORE");
});

test("runtime and release files require build", () => {
  for (const file of [
    "app/page.tsx",
    "lib/foo.ts",
    "public/a.png",
    "supabase/migrations/foo.sql",
    "vercel.json",
    "package.json",
  ]) {
    assert.equal(preview([file]).decision, "BUILD", file);
  }
});

test("mixed no-runtime and runtime changes require build", () => {
  assert.equal(preview(["reports/a.md", "app/page.tsx"]).decision, "BUILD");
  assert.equal(preview(["test/foo.test.ts", "lib/foo.ts"]).decision, "BUILD");
  assert.equal(
    preview([".github/workflows/foo.yml", "package.json"]).decision,
    "BUILD",
  );
});

test("unknown files require build", () => {
  assert.deepEqual(preview(["unknown/path.xyz"]), {
    decision: "BUILD",
    reason: "unknown-file-class",
  });
});

test("diff failure requires build", () => {
  assert.deepEqual(
    classifyBuildImpact({
      files: [],
      diffAvailable: false,
      vercelEnv: "preview",
      commitRef: "feature/test",
    }),
    { decision: "BUILD", reason: "diff-unavailable" },
  );
});

test("missing or unsupported Vercel environment requires build", () => {
  assert.equal(
    classifyBuildImpact({
      files: ["docs/x.md"],
      vercelEnv: "",
      commitRef: "feature/test",
    }).reason,
    "environment-inconsistent",
  );
  assert.equal(
    classifyBuildImpact({
      files: ["docs/x.md"],
      vercelEnv: "development",
      commitRef: "feature/test",
    }).decision,
    "BUILD",
  );
  assert.equal(
    classifyBuildImpact({
      files: ["docs/x.md"],
      vercelEnv: "preview",
      commitRef: "",
    }).reason,
    "environment-inconsistent",
  );
});

test("production always requires build", () => {
  assert.equal(
    classifyBuildImpact({
      files: ["docs/x.md"],
      vercelEnv: "production",
      commitRef: "feature/test",
    }).decision,
    "BUILD",
  );
  assert.equal(
    classifyBuildImpact({
      files: ["docs/x.md"],
      vercelEnv: "preview",
      commitRef: "main",
    }).decision,
    "BUILD",
  );
});

test("the ignore command itself always requires build", () => {
  assert.equal(preview(["scripts/ci/vercel-ignore-build.mjs"]).decision, "BUILD");
  assert.equal(preview(["scripts/ci/vercel-build-impact.mjs"]).decision, "BUILD");
});

test("git diff falls back closed on invalid revisions", () => {
  const result = changedFilesFromDiff({
    base: "missing-base",
    head: "missing-head",
    spawn: () => ({ status: 128, stdout: "" }),
  });
  assert.deepEqual(result, { available: false, files: [] });
});
