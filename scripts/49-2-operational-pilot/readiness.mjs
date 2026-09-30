import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const countKeys = [
  "reviewerUsers", "publisherUsers", "activeEntities", "activeConsents",
  "pendingCandidates", "eligibleCandidates", "reviewRows", "decisionRows",
  "projectionRows", "activeProjectionRows",
];

export function assessOperationalPilot(snapshot, expectedSha) {
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? "") || snapshot.transactionReadOnly !== true)
    throw new Error("PILOT_READONLY_CAPTURE_REQUIRED");
  const counts = {};
  for (const key of countKeys) {
    if (!Number.isSafeInteger(snapshot[key]) || snapshot[key] < 0)
      throw new Error("PILOT_INVALID_AGGREGATE");
    counts[key] = snapshot[key];
  }
  if (counts.eligibleCandidates > counts.pendingCandidates ||
      counts.activeProjectionRows > counts.projectionRows)
    throw new Error("PILOT_INCONSISTENT_AGGREGATE");
  let nextGate;
  if (counts.decisionRows > 0 || counts.projectionRows > 0)
    nextGate = "PILOT_ALREADY_STARTED_REVIEW_REQUIRED";
  else if (counts.reviewerUsers < 2)
    nextGate = "TWO_INDEPENDENT_REVIEWER_ACCOUNTS_REQUIRED";
  else if (counts.publisherUsers < 1)
    nextGate = "NAMED_PUBLISHER_AUTHORIZATION_REQUIRED";
  else if (counts.activeEntities < 1)
    nextGate = "REPRESENTATIVE_ENTITY_DECLARATION_REQUIRED";
  else if (counts.activeConsents < 1)
    nextGate = "REPRESENTATIVE_EXPLICIT_CONSENT_REQUIRED";
  else if (counts.pendingCandidates < 1)
    nextGate = "REPRESENTATIVE_PRIVATE_CANDIDATE_REQUIRED";
  else if (counts.eligibleCandidates < 1)
    nextGate = "INDEPENDENT_R4_REVIEWS_REQUIRED";
  else nextGate = "EXPLICIT_R5_PUBLISHER_DECISION_REQUIRED";
  return {
    scope: "COMUN_49_2_OPERATIONAL_PILOT_READINESS",
    expectedSha,
    transactionReadOnly: true,
    counts,
    nextGate,
    publicationAuthorized: false,
    mapAuthorityGranted: false,
    writesPerformed: false,
    individualEligibilityEvaluated: false,
    privateContentExported: false,
  };
}

export const captureSql = `
begin read only;
with operational_profiles as (
  select distinct p.auth_user_id, p.role
  from public.comun_admin_profiles p
  join public.comun_admin_users u on u.user_id=p.auth_user_id
  where p.active and u.is_active and p.auth_user_id is not null
), pending as (
  select id from private.comun_relata_collective_entity_candidates
  where candidate_state='pending_legitimacy'
)
select json_build_object(
  'transactionReadOnly', current_setting('transaction_read_only')='on',
  'reviewerUsers', (select count(distinct auth_user_id)::int from operational_profiles
    where role in ('admin','editor','factual_reviewer')),
  'publisherUsers', (select count(distinct auth_user_id)::int from operational_profiles where role='publisher'),
  'activeEntities', (select count(*)::int from private.comun_relata_collective_entities where state='active'),
  'activeConsents', (select count(*)::int from private.comun_relata_collective_entity_consents where active),
  'pendingCandidates', (select count(*)::int from pending),
  'eligibleCandidates', (select count(*)::int from pending c
    cross join lateral private.comun_relata_candidate_legitimacy_snapshot(c.id) s
    where s.eligibility_state='eligible_for_projection_review'),
  'reviewRows', (select count(*)::int from private.comun_relata_collective_entity_candidate_reviews),
  'decisionRows', (select count(*)::int from private.comun_relata_collective_entity_projection_decisions),
  'projectionRows', (select count(*)::int from public.comun_relata_collective_entity_public_projections),
  'activeProjectionRows', (select count(*)::int from public.comun_relata_collective_entity_public_projections where projection_state='active')
);
rollback;
`;

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = process.argv[2];
  const expectedSha = process.env.PILOT_EXPECTED_SHA;
  if (!output || !process.env.SUPABASE_DB_URL) throw new Error("PILOT_CAPTURE_INPUT_REQUIRED");
  if (execFileSync("git", ["rev-parse", "HEAD"], {encoding:"utf8"}).trim() !== expectedSha)
    throw new Error("PILOT_CAPTURE_SHA_MISMATCH");
  let snapshot;
  try {
    snapshot = JSON.parse(execFileSync("psql", [process.env.SUPABASE_DB_URL, "-qXAt", "-v", "ON_ERROR_STOP=1"],
      {input:captureSql, encoding:"utf8", stdio:["pipe","pipe","pipe"]}));
  } catch { throw new Error("PILOT_READONLY_CAPTURE_FAILED"); }
  const result = assessOperationalPilot(snapshot, expectedSha);
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(result.nextGate);
}
