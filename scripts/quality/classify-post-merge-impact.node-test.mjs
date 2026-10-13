import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyRemoteQualityScope,
  run,
} from "./classify-post-merge-impact.mjs";

const context = {
  eventName: "push",
  ref: "refs/heads/main",
  sha: "a".repeat(40),
  before: "b".repeat(40),
  after: "a".repeat(40),
  diffAvailable: true,
};

for (const files of [
  ["tests/quality-performance/quality.spec.ts"],
  ["docs/comun-quality-guide.md", ".github/workflows/example.yml"],
  ["reports/current/review.md", "README.md"],
]) {
  test(`known non-runtime delta is explicitly not applicable: ${files[0]}`, () => {
    const result = classifyRemoteQualityScope({ ...context, files });
    assert.equal(result.runRemote, false);
    assert.equal(
      result.status,
      "COMUN_QUALITY_REMOTE_NOT_APPLICABLE_NO_RUNTIME",
    );
  });
}

for (const file of [
  "app/page.tsx",
  "lib/public-projection.ts",
  "supabase/migrations/example.sql",
  "package-lock.json",
  "vercel.json",
  "scripts/ci/vercel-build-impact.mjs",
  "scripts/quality/classify-post-merge-impact.mjs",
  "unknown-file",
]) {
  test(`requires exact deployment for mixed delta containing ${file}`, () => {
    assert.equal(
      classifyRemoteQualityScope({
        ...context,
        files: ["tests/quality-performance/quality.spec.ts", file],
      }).runRemote,
      true,
    );
  });
}

test("missing or empty diff requires remote checks", () => {
  assert.equal(classifyRemoteQualityScope(context).runRemote, true);
  assert.equal(
    classifyRemoteQualityScope({
      ...context,
      diffAvailable: false,
      files: ["README.md"],
    }).runRemote,
    true,
  );
});

test("operator full rehearsal always requires exact deployment", () => {
  assert.equal(
    classifyRemoteQualityScope({
      ...context,
      eventName: "workflow_dispatch",
      mode: "full",
      files: ["README.md"],
    }).runRemote,
    true,
  );
});

for (const invalid of [
  { ref: "refs/heads/other" },
  { sha: "--help" },
  { before: "--help" },
  { before: "0".repeat(40) },
  { after: "c".repeat(40) },
  { eventName: "pull_request" },
  { eventName: "workflow_dispatch", mode: "local" },
]) {
  test(`invalid context fails instead of reporting not applicable: ${JSON.stringify(invalid)}`, () => {
    assert.throws(
      () => classifyRemoteQualityScope({ ...context, ...invalid }),
      /COMUN_QUALITY_IMPACT_INVALID_CONTEXT/,
    );
  });
}

test("CLI reports required for unavailable git objects and writes boolean output", () => {
  const directory = mkdtempSync(join(tmpdir(), "comun-quality-impact-"));
  try {
    const eventPath = join(directory, "event.json");
    const outputPath = join(directory, "output.txt");
    writeFileSync(
      eventPath,
      JSON.stringify({ before: context.before, after: context.after }),
    );
    const result = run({
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_OUTPUT: outputPath,
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF: context.ref,
      GITHUB_SHA: context.sha,
    });
    assert.equal(result.runRemote, true);
    assert.equal(readFileSync(outputPath, "utf8"), "run_remote=true\n");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI classifies actual git deltas without transferring certification", () => {
  const directory = mkdtempSync(join(tmpdir(), "comun-quality-git-"));
  const original = process.cwd();
  const git = (...args) =>
    execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
  try {
    git("init", "--quiet");
    git("config", "user.email", "quality-test@example.invalid");
    git("config", "user.name", "Quality fixture");
    writeFileSync(join(directory, "README.md"), "base");
    git("add", ".");
    git("commit", "--quiet", "-m", "base");
    const before = git("rev-parse", "HEAD");
    writeFileSync(join(directory, "README.md"), "review");
    git("add", ".");
    git("commit", "--quiet", "-m", "review");
    const reviewSha = git("rev-parse", "HEAD");
    writeFileSync(join(directory, "unknown-runtime"), "runtime");
    git("add", ".");
    git("commit", "--quiet", "-m", "runtime");
    const runtimeSha = git("rev-parse", "HEAD");
    process.chdir(directory);
    for (const [sha, expected] of [
      [reviewSha, false],
      [runtimeSha, true],
    ]) {
      const eventPath = join(directory, "event.json");
      const outputPath = join(directory, "output.txt");
      writeFileSync(eventPath, JSON.stringify({ before, after: sha }));
      writeFileSync(outputPath, "");
      const result = run({
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_OUTPUT: outputPath,
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: context.ref,
        GITHUB_SHA: sha,
      });
      assert.equal(result.runRemote, expected);
      assert.equal(
        readFileSync(outputPath, "utf8"),
        `run_remote=${expected}\n`,
      );
    }
  } finally {
    process.chdir(original);
    rmSync(directory, { recursive: true, force: true });
  }
});
