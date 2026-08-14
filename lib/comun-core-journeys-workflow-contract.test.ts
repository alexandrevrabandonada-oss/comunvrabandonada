import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workflow = readFileSync(
  join(root, ".github/workflows/comun-core-journeys.yml"),
  "utf8",
);
const retry = readFileSync(
  join(root, "scripts/quality/run-with-chromium-crash-retry.sh"),
  "utf8",
);

describe("Core Journeys Chromium crash resilience", () => {
  it("wraps only the production browser suites", () => {
    expect(workflow).toContain(
      "bash scripts/quality/run-with-chromium-crash-retry.sh npm run journeys:e2e",
    );
    expect(workflow).toContain(
      "bash scripts/quality/run-with-chromium-crash-retry.sh npm run journeys:quality-regression",
    );
    expect(workflow.match(/run-with-chromium-crash-retry\.sh/g)).toHaveLength(2);
  });

  it("retries once only for a Chromium SIGSEGV", () => {
    expect(retry).toContain("first_exit_code=${PIPESTATUS[0]}");
    expect(retry).toContain("Received signal 11.*SEGV|SIGSEGV");
    expect(retry).toContain(
      "COMUN_CHROMIUM_TRANSIENT_RETRY reason=SIGSEGV attempt=1",
    );
    expect(retry.match(/^\"\$@\"/gm)).toHaveLength(2);
    expect(retry).not.toMatch(/for |while |attempt=2|sleep /);
  });

  it("preserves the original exit code for functional failures", () => {
    expect(retry).toContain('exit "$first_exit_code"');
    expect(retry).not.toMatch(/\|\|\s*true/);
    expect(retry.match(/exit 0/g)).toHaveLength(1);
  });
});
