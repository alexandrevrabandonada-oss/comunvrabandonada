import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

// Exercise the real dependency-free contracts without installing the app stack.
const moduleUrl = (source) =>
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`;
const competencyUrl = moduleUrl(readFileSync(new URL("../../lib/comun-competency-evidence.ts", import.meta.url), "utf8"));
const machineSource = readFileSync(new URL("../../lib/comun-factory-machine-authorization.ts", import.meta.url), "utf8");
const { evaluateComunFactoryMachineUse: evaluate } = await import(moduleUrl(
  machineSource.replaceAll('"./comun-competency-evidence"', JSON.stringify(competencyUrl)),
));

const now = new Date("2026-10-16T00:00:00.000Z");
const evidence = {
  id: "ev-fdm", userId: "user-a", competencyId: "fdm-basic",
  sourceKind: "learning_practice", sourceId: "practice-private", state: "validated",
  reviewedBy: "reviewer-b", reviewedAt: "2026-10-06T18:00:00Z",
  occurredAt: "2026-10-06T17:00:00Z",
};
const claim = {
  id: "claim-fdm", userId: "user-a", competencyId: "fdm-basic", label: "FDM",
  scope: "Simple approved material", state: "demonstrated", visibility: "private",
  allowMatching: false, evidenceIds: ["ev-fdm"], reviewedBy: "reviewer-b",
  demonstratedAt: "2026-10-06T18:00:00Z", reviewDueAt: null,
};
const authorization = {
  id: "auth-1", userId: "user-a", capability: "fdm_basic", level: "independent",
  grantedBy: "operator-c", grantedAt: "2026-10-06T19:00:00Z", expiresAt: null,
  revokedAt: null, safetyBriefingRef: "briefing-v1", competencyClaimIds: ["claim-fdm"],
};
const input = {
  userId: "user-a", capability: "fdm_basic", riskClass: "R1", authorization,
  claims: [claim], evidence: [evidence], qualifiedOversightPresent: false, now,
};

for (const reviewDueAt of ["2026-10-07T00:00:00Z", now.toISOString(), "invalid-date", ""]) {
  test(`review ${JSON.stringify(reviewDueAt)} blocks all authorization levels`, () => {
    for (const level of ["observer", "supervised", "independent", "maintainer"]) {
      assert.deepEqual(evaluate({ ...input, authorization: { ...authorization, level }, claims: [{ ...claim, reviewDueAt }] }), {
        allowed: false, mode: "blocked", reasons: ["competency_not_demonstrated"],
      });
    }
  });
}

test("future review preserves independent use without requiring matching consent", () => {
  assert.deepEqual(evaluate({ ...input, claims: [{ ...claim, reviewDueAt: "2026-10-16T00:00:00.001Z" }] }), {
    allowed: true, mode: "independent", reasons: [],
  });
});
test("null review deadline preserves existing modes", () => {
  for (const [level, mode] of [["observer", "observe"], ["supervised", "supervised"], ["independent", "independent"], ["maintainer", "independent"]]) {
    assert.deepEqual(evaluate({ ...input, authorization: { ...authorization, level } }), { allowed: true, mode, reasons: [] });
  }
});
test("one invalid linked review blocks an otherwise current set", () => {
  assert.deepEqual(evaluate({ ...input, authorization: { ...authorization, competencyClaimIds: [claim.id, "other"] }, claims: [claim, { ...claim, id: "other", reviewDueAt: "invalid" }] }), {
    allowed: false, mode: "blocked", reasons: ["competency_not_demonstrated"],
  });
});
test("invalid evaluation clock fails closed", () => {
  assert.deepEqual(evaluate({ ...input, now: new Date("invalid") }), { allowed: false, mode: "blocked", reasons: ["competency_not_demonstrated"] });
});
test("R3 oversight and supervised ceiling, R4 block remain mandatory", () => {
  assert.deepEqual(evaluate({ ...input, riskClass: "R3" }), { allowed: false, mode: "blocked", reasons: ["qualified_oversight_required"] });
  assert.deepEqual(evaluate({ ...input, riskClass: "R3", qualifiedOversightPresent: true }), { allowed: true, mode: "supervised", reasons: [] });
  assert.deepEqual(evaluate({ ...input, riskClass: "R4", qualifiedOversightPresent: true }), { allowed: false, mode: "blocked", reasons: ["critical_case_blocked"] });
});
test("revocation, authorization expiry, briefing, identity and evidence remain gates", () => {
  for (const [change, reason] of [
    [{ revokedAt: "2026-10-07T00:00:00Z" }, "authorization_revoked"],
    [{ expiresAt: now.toISOString() }, "authorization_expired"],
    [{ expiresAt: "invalid" }, "authorization_expired"],
    [{ safetyBriefingRef: "" }, "safety_briefing_missing"],
    [{ userId: "someone-else" }, "authorization_missing"],
  ]) {
    const result = evaluate({ ...input, authorization: { ...authorization, ...change } });
    assert.equal(result.allowed, false);
    assert.ok(result.reasons.includes(reason));
  }
  for (const change of [{ claims: [] }, { evidence: [] }, { claims: [{ ...claim, state: "review_due" }] }]) {
    assert.deepEqual(evaluate({ ...input, ...change }), { allowed: false, mode: "blocked", reasons: ["competency_not_demonstrated"] });
  }
});
