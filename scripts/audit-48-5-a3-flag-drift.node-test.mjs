import assert from "node:assert/strict";
import test from "node:test";

import {
  A3_FLAG,
  classifyAudit,
  fingerprint,
  parsePulledValue,
  projectEnvRows,
} from "./audit-48-5-a3-flag-drift.mjs";

test("flag audit never returns or persists raw values", () => {
  assert.equal(parsePulledValue(`${A3_FLAG}=enabled\nSECRET=do-not-print`), "ON");
  assert.equal(parsePulledValue(`${A3_FLAG}=disabled`), "OFF");
  assert.equal(parsePulledValue("OTHER=value"), "ABSENT");
  assert.match(fingerprint("env_123"), /^sha256:[0-9a-f]{16}$/);
});

test("project metadata distinguishes production duplicates from preview branches", () => {
  const rows = projectEnvRows({ envs: [
    { key: A3_FLAG, target: ["production"], id: "env_a" },
    { key: A3_FLAG, target: ["preview"], gitBranch: "feature/a3", id: "env_b" },
  ] });
  const classification = classifyAudit({
    projectStatus: 200,
    envStatus: 200,
    sharedStatus: 200,
    projectRows: rows,
    sharedRows: [],
    productionValueState: "OFF",
  });
  assert.equal(classification.duplicateProduction, false);
  assert.equal(classification.sharedConflict, false);
  assert.equal(classification.status, "GREEN");
});

test("unknown metadata, duplicate production rows, and shared rows fail closed", () => {
  const base = { projectStatus: 200, envStatus: 200, sharedStatus: 200, productionValueState: "OFF" };
  assert.equal(classifyAudit({ ...base, projectRows: [{ key: A3_FLAG, target: ["production"] }, { key: A3_FLAG, target: ["production"] }], sharedRows: [] }).status, "BLOCKED_CONFLICT");
  assert.equal(classifyAudit({ ...base, projectRows: [{ key: A3_FLAG, target: ["production"] }], sharedRows: [{ key: A3_FLAG, target: ["production"] }] }).status, "BLOCKED_CONFLICT");
  assert.equal(classifyAudit({ ...base, projectRows: [], sharedRows: [], sharedStatus: 403 }).status, "INCONCLUSIVE");
  assert.equal(classifyAudit({ ...base, projectRows: [], sharedRows: [], productionValueState: "UNKNOWN" }).status, "INCONCLUSIVE");
});
