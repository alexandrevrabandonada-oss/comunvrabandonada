import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import pg from "pg";

const output =
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
  ".ci-artifacts/r5-live-readiness.json";
const expectedMainSha = process.env.COMUN_R5_EXPECTED_MAIN_SHA;
const url = process.env.SUPABASE_DB_URL;

if (!url || !/^[a-f0-9]{40}$/.test(expectedMainSha ?? "")) {
  throw new Error("COMUN_R5_LIVE_READINESS_CONTEXT_INVALID");
}

const db = new pg.Client({ connectionString: url });
await db.connect();

function integer(value) {
  return Number(value ?? 0);
}

try {
  await db.query("BEGIN READ ONLY");
  const readOnly = (
    await db.query("select current_setting('transaction_read_only') as value")
  ).rows[0]?.value;
  if (readOnly !== "on")
    throw new Error("COMUN_R5_LIVE_READINESS_NOT_READ_ONLY");

  const counts = (
    await db.query(`
      select
        (select count(*) from private.comun_relata_collective_entities
          where state='active') as active_entities,
        (select count(*) from private.comun_relata_collective_entity_representations
          where status in ('declared','verified')) as active_representations,
        (select count(*) from private.comun_relata_collective_entity_consents
          where active) as active_consents,
        (select count(*) from private.comun_relata_collective_entity_candidates)
          as total_candidates,
        (select count(*) from private.comun_relata_collective_entity_candidate_reviews)
          as total_reviews,
        (select count(*) from private.comun_relata_collective_entity_projection_decisions)
          as total_projection_decisions,
        (select count(*) from public.comun_relata_collective_entity_public_projections)
          as total_projection_rows,
        (
          select count(*)
          from public.comun_admin_profiles profile
          join public.comun_admin_users admin_user
            on admin_user.user_id=profile.auth_user_id
           and admin_user.is_active
          where profile.active and profile.role='publisher'
        ) as active_publishers
    `)
  ).rows[0];

  const candidateStates = (
    await db.query(`
      select candidate_state as state,count(*)::int as count
        from private.comun_relata_collective_entity_candidates
       group by candidate_state
       order by candidate_state
    `)
  ).rows;

  const eligibilityStates = (
    await db.query(`
      select snapshot.eligibility_state as state,count(*)::int as count
        from private.comun_relata_collective_entity_candidates candidate
        cross join private.comun_relata_candidate_legitimacy_snapshot(candidate.id)
          snapshot
       group by snapshot.eligibility_state
       order by snapshot.eligibility_state
    `)
  ).rows;

  const reviewStates = (
    await db.query(`
      select review_stage,decision,count(*)::int as count
        from private.comun_relata_collective_entity_candidate_reviews
       group by review_stage,decision
       order by review_stage,decision
    `)
  ).rows;

  const projectionStates = (
    await db.query(`
      select projection_state as state,count(*)::int as count
        from public.comun_relata_collective_entity_public_projections
       group by projection_state
       order by projection_state
    `)
  ).rows;

  const queue = (
    await db.query(`
      with eligible as (
        select candidate.id,candidate.entity_id
          from private.comun_relata_collective_entity_candidates candidate
          cross join private.comun_relata_candidate_legitimacy_snapshot(candidate.id)
            snapshot
         where candidate.candidate_state='pending_legitimacy'
           and snapshot.eligibility_state='eligible_for_projection_review'
      ),
      publishers as (
        select profile.auth_user_id
          from public.comun_admin_profiles profile
          join public.comun_admin_users admin_user
            on admin_user.user_id=profile.auth_user_id
           and admin_user.is_active
         where profile.active
           and profile.role='publisher'
           and profile.auth_user_id is not null
      ),
      readiness as (
        select eligible.id,
          exists (
            select 1
              from publishers
             where not exists (
               select 1
                 from private.comun_relata_collective_entity_representations representation
                where representation.entity_id=eligible.entity_id
                  and representation.user_id=publishers.auth_user_id
                  and representation.status in ('declared','verified')
             )
          ) as has_independent_publisher
          from eligible
      )
      select
        count(*)::int as eligible_candidates,
        count(*) filter (where has_independent_publisher)::int
          as operable_candidates,
        count(*) filter (where not has_independent_publisher)::int
          as blocked_no_independent_publisher
      from readiness
    `)
  ).rows[0];

  const document = {
    checkpoint: "COMUN_49_2_R5_LIVE_READINESS_READ_ONLY",
    expectedMainSha,
    transactionReadOnly: readOnly,
    activeEntities: integer(counts.active_entities),
    activeRepresentations: integer(counts.active_representations),
    activeConsents: integer(counts.active_consents),
    totalCandidates: integer(counts.total_candidates),
    totalReviews: integer(counts.total_reviews),
    totalProjectionDecisions: integer(counts.total_projection_decisions),
    totalProjectionRows: integer(counts.total_projection_rows),
    activePublishers: integer(counts.active_publishers),
    eligibleCandidates: integer(queue.eligible_candidates),
    operableCandidates: integer(queue.operable_candidates),
    blockedNoIndependentPublisher: integer(
      queue.blocked_no_independent_publisher,
    ),
    candidateStates,
    eligibilityStates,
    reviewStates,
    projectionStates,
  };

  if (
    document.totalProjectionDecisions !== 0 ||
    document.totalProjectionRows !== 0
  ) {
    throw new Error("COMUN_R5_LIVE_READINESS_UNEXPECTED_BUSINESS_ROWS");
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(document, null, 2) + "\n");
  console.log(document.checkpoint);
} finally {
  await db.query("ROLLBACK").catch(() => {});
  await db.end();
}
