import assert from "node:assert/strict";
import test from "node:test";
import { assessOperationalPilot, captureSql, countKeys } from "./readiness.mjs";
const sha = "a".repeat(40);
const empty = () => ({transactionReadOnly:true, ...Object.fromEntries(countKeys.map(k => [k, 0]))});
test("readiness cannot authorize publication or grant map authority", () => {
  const s = {...empty(), reviewerUsers:2};
  const cases = [
    ["NAMED_PUBLISHER_AUTHORIZATION_REQUIRED", {}],
    ["REPRESENTATIVE_ENTITY_DECLARATION_REQUIRED", {publisherUsers:1}],
    ["REPRESENTATIVE_EXPLICIT_CONSENT_REQUIRED", {activeEntities:1}],
    ["REPRESENTATIVE_PRIVATE_CANDIDATE_REQUIRED", {activeConsents:1}],
    ["INDEPENDENT_R4_REVIEWS_REQUIRED", {pendingCandidates:1}],
    ["EXPLICIT_R5_PUBLISHER_DECISION_REQUIRED", {eligibleCandidates:1}],
    ["PILOT_ALREADY_STARTED_REVIEW_REQUIRED", {decisionRows:1}],
  ];
  for (const [gate, increment] of cases) {
    Object.assign(s, increment);
    const r = assessOperationalPilot(s, sha);
    assert.equal(r.nextGate, gate);
    assert.equal(r.publicationAuthorized, false);
    assert.equal(r.mapAuthorityGranted, false);
    assert.equal(r.writesPerformed, false);
  }
  assert.equal(assessOperationalPilot(empty(),sha).nextGate, "TWO_INDEPENDENT_REVIEWER_ACCOUNTS_REQUIRED");
});
test("bad captures and inconsistent counts fail closed", () => {
  assert.throws(() => assessOperationalPilot({...empty(),transactionReadOnly:false},sha));
  assert.throws(() => assessOperationalPilot(empty(),"invalid"));
  for (const bad of [-1, 1.5, "0", null, undefined, Infinity])
    assert.throws(() => assessOperationalPilot({...empty(),publisherUsers:bad},sha));
  assert.throws(() => assessOperationalPilot({...empty(),eligibleCandidates:1},sha));
  assert.throws(() => assessOperationalPilot({...empty(),activeProjectionRows:1},sha));
});
test("artifact allowlist excludes identities and private content", () => {
  const r = assessOperationalPilot({...empty(),email:"private@example.invalid",rationale_private:"secret",candidateId:"secret",latitude:42},sha);
  assert.doesNotMatch(JSON.stringify(r), /private@example|secret|latitude/);
});
test("capture is aggregate-only in a read-only transaction", () => {
  assert.match(captureSql,/begin read only;/);
  assert.match(captureSql,/rollback;/);
  assert.match(captureSql,/count\(distinct auth_user_id\)/);
  assert.doesNotMatch(captureSql,/\b(insert|update|delete|alter|create|drop|truncate)\b/i);
  assert.doesNotMatch(captureSql,/server_projection_decide|set_config|future_map_eligibility|rationale_private|public_name/);
});
