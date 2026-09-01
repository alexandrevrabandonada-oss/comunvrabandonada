import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./diagnose-comun-denuncias-map-readiness.mjs", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../app/comun/denuncias/mapa/page.tsx", import.meta.url),
  "utf8",
);

test("readiness diagnostic is aggregate, read-only and fail-closed", () => {
  assert.match(source, /begin read only/);
  assert.match(source, /rollback/);
  assert.match(source, /transactionReadOnly/);
  assert.match(source, /piiRead: false/);
  assert.match(source, /privateCoordinatesRead: false/);
  assert.doesNotMatch(source, /select\s+.*original_text/i);
  assert.doesNotMatch(source, /select\s+.*receipt/i);
  assert.doesNotMatch(source, /select\s+.*token_hash/i);
  assert.doesNotMatch(
    source,
    /\binsert\s+into\b|\bupdate\s+|\bdelete\s+from\b/i,
  );
});

test("readiness diagnostic covers canonical aggregate evidence", () => {
  for (const marker of [
    "realCollectives",
    "eligibleCollectives",
    "activeConsents",
    "activeConfirmations",
    "spatialCandidates",
    "projectionRows",
    "eligibleRows",
    "invalidClusterPolicyRows",
  ])
    assert.match(source, new RegExp(marker));
});

test("the public surface remains cloaked when feature or data readiness fails", () => {
  assert.match(
    page,
    /if \(!isComunDenunciasPublicMapEnabled\(\)\) notFound\(\)/,
  );
  assert.match(page, /if \(!readiness\.mapDataReady\) notFound\(\)/);
});
