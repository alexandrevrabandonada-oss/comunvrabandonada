import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { query } from "../db/verify-canonical-baseline.mjs";
import { validateCaptureArtifact } from "./assert-sanitized-canonical-capture.mjs";

const workflow = readFileSync(".github/workflows/comun-nightly.yml", "utf8");

test("canonical Production capture is isolated and uploaded after sanitization", () => {
  const job = workflow
    .split("  baseline-capture:")[1]
    ?.split("\n  release-preflight:")[0];
  assert.ok(job);
  assert.match(
    job,
    /if: github\.event_name == 'workflow_dispatch' && inputs\.capture_baseline/,
  );

  assert.match(
    job,
    /run: node scripts\/db\/verify-canonical-baseline\.mjs --capture/,
  );
  assert.match(job, /capture-security-hardening-preflight\.mjs/);
  assert.match(job, /assert-sanitized-canonical-capture\.mjs/);
  assert.doesNotMatch(
    job,
    /project-security-hardening|apply-forward-only|cleanup-comun-sidewalk-uploads|health:production|verify-preview|SUPABASE_SERVICE_ROLE_KEY|VERCEL_TOKEN|supabase db push|migration repair/i,
  );
  assert.equal(
    (job.match(/secrets\.[A-Z0-9_]+/g) ?? []).join(","),
    "secrets.SUPABASE_DB_URL,secrets.SUPABASE_DB_URL",
  );

  const upload = job.split(
    "      - name: Upload canonical Production baseline",
  )[1];
  assert.ok(upload);
  assert.match(upload, /actions\/upload-artifact@v4/);
  assert.match(upload, /comun-remote-schema-detailed\.json/);
  assert.match(upload, /comun-remote-schema-baseline-candidate\.json/);
  assert.match(upload, /comun-security-hardening-preflight\.json/);
  assert.match(upload, /if-no-files-found: error/);
  assert.match(upload, /retention-days: 7/);

  const captureAt = job.indexOf(
    "Capture sanitized canonical Production baseline",
  );
  const uploadAt = job.indexOf("Upload canonical Production baseline");
  const preflightAt = job.indexOf("Capture sanitized security preflight");
  const sanitizeAt = job.indexOf("Validate capture size and sanitization");
  assert.ok(
    captureAt >= 0 &&
      captureAt < preflightAt &&
      preflightAt < sanitizeAt &&
      sanitizeAt < uploadAt,
  );
});

test("capture artifact gate rejects secret-shaped values and wrong scope", () => {
  const compact = {
    scope: "APP_CANONICAL_SECURITY_BASELINE",
    canonical: { relations: [] },
    security: { blockingFindings: [] },
  };
  assert.equal(
    validateCaptureArtifact(
      "comun-remote-schema-baseline-candidate.json",
      JSON.stringify(compact),
    ).scope,
    compact.scope,
  );
  assert.throws(
    () =>
      validateCaptureArtifact(
        "comun-remote-schema-baseline-candidate.json",
        JSON.stringify({ ...compact, dsn: "postgres://x:y@remote" }),
      ),
    /CANONICAL_CAPTURE_SECRET_SHAPED_VALUE/,
  );
  assert.throws(
    () =>
      validateCaptureArtifact(
        "comun-remote-schema-baseline-candidate.json",
        JSON.stringify({ ...compact, scope: "WRONG" }),
      ),
    /CANONICAL_CAPTURE_SCOPE_INVALID/,
  );
  assert.throws(
    () => validateCaptureArtifact("other.json", JSON.stringify(compact)),
    /CANONICAL_CAPTURE_FILE_NOT_ALLOWED/,
  );
});

test("baseline query reads catalog metadata without business rows or DDL/DML", () => {
  assert.match(query, /^\s*with app_relations as \(/i);
  assert.match(query, /from pg_proc|from pg_class/);
  assert.doesNotMatch(
    query,
    /\b(?:insert|update|delete|truncate|create|alter|drop)\s+(?:into|table|function|schema|from)\b/i,
  );
  assert.doesNotMatch(query, /\bfrom\s+public\./i);
});

test("capture dispatch excludes every other Nightly job", () => {
  for (const name of [
    "release-preflight",
    "preview-preflight",
    "full-local",
    "production-health",
    "sidewalk-cleanup-dry-run",
    "archive-worker",
  ]) {
    const section = workflow
      .split(`  ${name}:`)[1]
      ?.split(/\n  [a-z][a-z0-9-]+:/)[0];
    assert.ok(section, name);
    const condition = section.match(/^    if: (.+)$/m)?.[1];
    assert.ok(condition, `${name} must be conditional`);
    if (name === "archive-worker")
      assert.match(condition, /github\.event\.schedule/);
    else if (["release-preflight", "preview-preflight"].includes(name)) {
      assert.match(condition, /inputs\.(release_preflight|preview_preflight)/);
    } else {
      assert.match(condition, /!inputs\.capture_baseline/);
    }
  }
});
