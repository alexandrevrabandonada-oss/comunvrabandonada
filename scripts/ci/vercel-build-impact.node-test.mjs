import test from "node:test";
import assert from "node:assert/strict";

import {
  changedFilesFromDiff,
  classifyBuildImpact,
  commitMessageFromGit,
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

test("codex runtime without checkpoint is ignored", () => {
  assert.deepEqual(
    classifyBuildImpact({
      files: ["app/page.tsx"],
      vercelEnv: "preview",
      commitRef: "codex/cost-02",
      commitMessageAvailable: true,
      commitMessage: "fix: accumulate coherent changes",
    }),
    { decision: "IGNORE", reason: "codex-runtime-awaiting-preview-checkpoint" },
  );
});

test("codex runtime checkpoint requires a Preview build", () => {
  assert.deepEqual(
    classifyBuildImpact({
      files: ["app/page.tsx"],
      vercelEnv: "preview",
      commitRef: "codex/cost-02",
      commitMessageAvailable: true,
      commitMessage: "feat: checkpoint [comun-preview]",
    }),
    { decision: "BUILD", reason: "codex-preview-checkpoint" },
  );
});

test("production and main remain BUILD regardless of checkpoint", () => {
  assert.equal(
    classifyBuildImpact({
      files: ["app/page.tsx"],
      vercelEnv: "production",
      commitRef: "codex/cost-02",
      commitMessage: "[comun-preview]",
    }).decision,
    "BUILD",
  );
  assert.equal(
    classifyBuildImpact({
      files: ["app/page.tsx"],
      vercelEnv: "preview",
      commitRef: "main",
      commitMessage: "[comun-preview]",
    }).decision,
    "BUILD",
  );
});

test("codex migrations, dependencies, CI scripts, config and unknown stay BUILD", () => {
  for (const file of [
    "supabase/migrations/20260819_cost02.sql",
    "package-lock.json",
    "scripts/ci/verify-codex-preview-checkpoint.mjs",
    "vercel.json",
    "unknown/file.bin",
  ]) {
    assert.equal(
      classifyBuildImpact({
        files: [file],
        vercelEnv: "preview",
        commitRef: "codex/cost-02",
        commitMessage: "fix: no checkpoint",
      }).decision,
      "BUILD",
      file,
    );
  }
});

test("codex safe docs and tests remain IGNORE", () => {
  assert.equal(
    classifyBuildImpact({
      files: ["docs/cost-02.md"],
      vercelEnv: "preview",
      commitRef: "codex/cost-02",
    }).decision,
    "IGNORE",
  );
  assert.equal(
    classifyBuildImpact({
      files: ["tests/cost-02.test.ts"],
      vercelEnv: "preview",
      commitRef: "codex/cost-02",
    }).decision,
    "IGNORE",
  );
});

test("runtime with unavailable commit message fails closed", () => {
  assert.deepEqual(
    classifyBuildImpact({
      files: ["app/page.tsx"],
      vercelEnv: "preview",
      commitRef: "codex/cost-02",
      commitMessageAvailable: false,
    }),
    { decision: "BUILD", reason: "commit-message-unavailable" },
  );
});

test("commit message lookup fails closed and preserves the message", () => {
  assert.deepEqual(
    commitMessageFromGit({
      head: "bad-sha",
      spawn: () => ({ status: 128, stdout: "" }),
    }),
    { available: false, message: "" },
  );
  assert.deepEqual(
    commitMessageFromGit({
      head: "good-sha",
      spawn: () => ({ status: 0, stdout: "feat: checkpoint [comun-preview]\n" }),
    }),
    { available: true, message: "feat: checkpoint [comun-preview]\n" },
  );
});
