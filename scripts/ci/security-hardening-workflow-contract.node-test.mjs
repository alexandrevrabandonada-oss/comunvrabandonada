import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("new SECURITY DEFINER gate also enforces explicit privileges", () => {
  const workflow = readFileSync(".github/workflows/comun-ci.yml", "utf8");
  const gate = workflow
    .split("  security-definer-migrations:")[1]
    ?.split("\n  p4-sidewalk-relata-e2e:")[0];
  assert.ok(gate);
  assert.match(
    gate,
    /validate-security-definer-migrations\.mjs --base=origin\/main[\s\S]*npm run db:privileges:lint/,
  );
});

for (const lane of ["b1", "b2"]) {
  test(`P6C-${lane.toUpperCase()} retains metadata checks and ownership-scoped dry-run`, () => {
    const workflow = readFileSync(
      `.github/workflows/comun-p6c-${lane}-preflight.yml`,
      "utf8",
    );
    assert.match(
      workflow,
      /PR_BASE_SHA: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/,
    );
    assert.match(
      workflow,
      new RegExp(`--lane p6c-${lane} --base "\\$PR_BASE_SHA" --dry-run`),
    );
    assert.match(
      workflow,
      new RegExp(
        `Inspect P6C-${lane.toUpperCase()} schema metadata without business-row reads`,
      ),
    );
    assert.match(workflow, /scripts\/ci\/classify-migration-lane\.mjs/);
  });
}
