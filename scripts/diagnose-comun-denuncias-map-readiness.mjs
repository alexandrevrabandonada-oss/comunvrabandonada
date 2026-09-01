import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolveComunDenunciasMapReadiness } from "../lib/comun-denuncias-map-readiness.ts";

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  }),
);

const sql = String.raw`
begin read only;
with consented as (
  select m.collective_case_id, count(*)::integer as consented_members
  from public.comun_relata_case_memberships m
  join public.comun_relata_cases c
    on c.id=m.individual_case_id and c.state<>'withdrawn'
  join private.comun_relata_public_projection_consents consent
    on consent.case_id=c.id and consent.active
   and consent.consent_version='relata-public-projection-v1'
   and consent.scope='collective_projection'
  where m.active
  group by m.collective_case_id
), real_collectives as (
  select collective.id, collective.category,
    coalesce(consented.consented_members,0) as consented_members
  from public.comun_relata_collective_cases collective
  left join consented on consented.collective_case_id=collective.id
  where collective.state='active'
    and collective.active_members_count>=2
    and collective.confidence_level='high'
    and exists (
      select 1 from public.comun_relata_case_match_events event
      where event.collective_case_id=collective.id
        and event.decision='auto_link_high_confidence'
        and event.confidence_level='high'
        and event.match_rule_version='relata-match-v1'
    )
), projection_policy as (
  select projection.public_id,
    projection.projection_state,
    projection.category,
    candidate.grid_meters,
    projection.uncertainty_radius_meters,
    projection.policy_version,
    case projection.category
      when 'public_lighting' then 300
      when 'power_distribution' then 800
      when 'smoke_or_environmental_trace' then 1000
      else 0
    end as expected_grid
  from private.comun_relata_public_projections projection
  left join private.comun_relata_public_projection_candidates candidate
    on candidate.collective_case_id=projection.collective_case_id
)
select json_build_object(
  'transactionReadOnly',current_setting('transaction_read_only')='on',
  'featureEnabled',false,
  'realCollectives',(select count(*) from real_collectives),
  'eligibleCollectives',(select count(*) from real_collectives
    where category in ('public_lighting','power_distribution','smoke_or_environmental_trace')
      and consented_members>=2),
  'activeConsents',(select count(*) from private.comun_relata_public_projection_consents
    where active and consent_version='relata-public-projection-v1'
      and scope='collective_projection'),
  'activeConfirmations',(select count(*) from private.comun_relata_public_confirmations
    where active),
  'spatialCandidates',(select count(*) from private.comun_relata_public_projection_candidates),
  'projectionRows',(select count(*) from private.comun_relata_public_projections),
  'activeProjectionRows',(select count(*) from projection_policy
    where projection_state='active'),
  'allowedCategoryRows',(select count(*) from projection_policy
    where category in ('public_lighting','power_distribution','smoke_or_environmental_trace')),
  'eligibleRows',(select count(*) from projection_policy
    where projection_state='active'
      and expected_grid>0 and grid_meters=expected_grid
      and uncertainty_radius_meters>=expected_grid
      and policy_version='relata-public-projection-v1'),
  'invalidClusterPolicyRows',(select count(*) from projection_policy
    where expected_grid=0 or grid_meters is null or grid_meters<>expected_grid
      or uncertainty_radius_meters<expected_grid
      or policy_version<>'relata-public-projection-v1')
);
rollback;
`;

function loadEvidence() {
  const input = args.get("input");
  if (input) return JSON.parse(readFileSync(input, "utf8"));
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) throw new Error("SUPABASE_DB_URL_REQUIRED");
  if (/localhost|127\.0\.0\.1|::1/i.test(databaseUrl))
    throw new Error("COMUN_DENUNCIAS_READINESS_NON_PRODUCTION_BINDING");
  if (
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error("COMUN_DENUNCIAS_READINESS_DISALLOWED_REMOTE_AUTH");
  const query = spawnSync(
    "psql",
    [databaseUrl, "-qXAt", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", windowsHide: true },
  );
  if (query.status !== 0)
    throw new Error("COMUN_DENUNCIAS_READINESS_READ_ONLY_QUERY_FAILED");
  return JSON.parse(query.stdout.trim());
}

const raw = loadEvidence();
if (raw.transactionReadOnly !== true)
  throw new Error("COMUN_DENUNCIAS_READINESS_TRANSACTION_NOT_READ_ONLY");
const readiness = resolveComunDenunciasMapReadiness({
  featureEnabled:
    process.env.COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED === "enabled" &&
    raw.featureEnabled !== false,
  realCollectives: raw.realCollectives,
  eligibleCollectives: raw.eligibleCollectives,
  activeConsents: raw.activeConsents,
  activeConfirmations: raw.activeConfirmations,
  spatialCandidates: raw.spatialCandidates,
  projectionRows: raw.projectionRows,
  activeProjectionRows: raw.activeProjectionRows,
  allowedCategoryRows: raw.allowedCategoryRows,
  eligibleRows: raw.eligibleRows,
  invalidClusterPolicyRows: raw.invalidClusterPolicyRows,
});
const result = {
  result: readiness.mapDataReady
    ? "COMUN_DENUNCIAS_MAP_DATA_READY"
    : "COMUN_DENUNCIAS_MAP_DATA_NOT_READY",
  ...readiness,
  transactionReadOnly: true,
  piiRead: false,
  privateCoordinatesRead: false,
  businessWrites: 0,
};
const output = `${JSON.stringify(result, null, 2)}\n`;
if (args.get("output")) writeFileSync(args.get("output"), output);
process.stdout.write(output);
