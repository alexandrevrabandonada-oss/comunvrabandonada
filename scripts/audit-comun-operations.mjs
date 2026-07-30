import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import pg from "pg";
import {
  assertUniqueOperationalCandidates,
  deriveOperationalCandidate,
} from "../lib/operational-adapters.ts";

const { Client } = pg;
const OUTPUT =
  process.env.COMUN_OPERATIONS_ARTIFACT_DIR ?? ".ci-artifacts/comun-operations";
const mode = process.argv.includes("--sync")
  ? "sync"
  : process.argv.includes("--rehearsal")
    ? "rehearsal"
    : "read-only";
const FORBIDDEN = [
  /postgres(?:ql)?:\/\//i,
  /service[_-]?role/i,
  /authorization/i,
  /cookie/i,
  /object[_-]?key/i,
  /contact_private/i,
  /raw_text/i,
  /coordinates?/i,
  /@[a-z0-9.-]+\.[a-z]{2,}/i,
];

export const SOURCE_QUERIES = [
  {
    name: "community-role-review",
    sql: `select id::text as source_id, 'communities' as domain, 'role_review' as source_type,
      'role_expiration' as work_category, 'pending' as source_state,
      coalesce(review_at, starts_at, created_at)::text as updated_at,
      review_at::text as due_at, 'normal' as risk, null::text as pauta_id,
      null::text as territory_id
      from public.comun_community_role_assignments
      where revoked_at is null and review_at is not null and review_at <= now() + interval '7 days'`,
  },
  {
    name: "pauta-contributions",
    sql: `select id::text as source_id, 'pautas' as domain, 'contribution' as source_type,
      case when risk_level in ('high','critical') then 'privacy_review' else 'contribution_triage' end as work_category,
      case when status = 'pending' then 'pending' else 'information_requested' end as source_state,
      updated_at::text, null::text as due_at,
      case when risk_level in ('high','critical') then 'high' else 'normal' end as risk,
      pauta_id::text, null::text as territory_id
      from public.comun_pauta_contributions
      where status = 'pending'`,
  },
  {
    name: "collective-actions",
    sql: `select id::text as source_id, 'actions' as domain,
      case when status = 'awaiting_result' then 'result' else 'action' end as source_type,
      case when status = 'awaiting_result' then 'result_verification' else 'action_without_next_step' end as work_category,
      'pending' as source_state, updated_at::text, null::text as due_at, 'normal' as risk,
      pauta_id::text, null::text as territory_id
      from public.comun_collective_actions
      where status = 'awaiting_result'
         or (status in ('open','active') and nullif(btrim(next_steps_summary), '') is null)`,
  },
  {
    name: "collective-tasks",
    sql: `select t.id::text as source_id, 'actions' as domain, 'task' as source_type,
      'task_overdue' as work_category, 'pending' as source_state, t.updated_at::text,
      t.due_at::text, 'normal' as risk, a.pauta_id::text, null::text as territory_id
      from public.comun_collective_action_tasks t
      join public.comun_collective_actions a on a.id = t.action_id
      where t.state in ('open','in_progress') and t.due_at < now()`,
  },
  {
    name: "collective-forwardings",
    sql: `select f.id::text as source_id, 'protocols' as domain,
      case when f.state = 'response_received' then 'response' else 'protocol' end as source_type,
      case when f.state = 'response_received' then 'response_synthesis' else 'protocol_due' end as work_category,
      case when f.state = 'awaiting_response' then 'blocked_by_third_party' else 'pending' end as source_state,
      f.updated_at::text, f.expected_response_at::text as due_at, 'normal' as risk,
      a.pauta_id::text, null::text as territory_id
      from public.comun_collective_action_forwardings f
      join public.comun_collective_actions a on a.id = f.action_id
      where f.state in ('preparing','sent','protocol_registered','awaiting_response','response_received')`,
  },
  {
    name: "sidewalk-uploads",
    sql: `select id::text as source_id, 'sidewalks' as domain, 'sidewalk_upload' as source_type,
      'unconfirmed_upload' as work_category, 'pending' as source_state, updated_at::text,
      expires_at::text as due_at, 'normal' as risk, null::text as pauta_id,
      null::text as territory_id
      from public.comun_sidewalk_uploads
      where status in ('pending','uploaded') and record_id is null`,
  },
  {
    name: "sidewalk-records",
    sql: `select id::text as source_id, 'sidewalks' as domain, 'sidewalk_record' as source_type,
      'moderation' as work_category, 'pending' as source_state, updated_at::text,
      null::text as due_at, case when geographic_risk = 'high' then 'high' else 'normal' end as risk,
      pauta_id::text, territory_id::text
      from public.comun_sidewalk_records
      where verification_status in ('pending','unverified') or status in ('received','triage')`,
  },
  {
    name: "sidewalk-forwardings",
    sql: `select id::text as source_id, 'sidewalks' as domain, 'forwarding' as source_type,
      'forwarding_follow_up' as work_category,
      case when state in ('protocol_pending','protocol_registered') then 'blocked_by_third_party' else 'pending' end as source_state,
      updated_at::text, null::text as due_at, 'normal' as risk,
      pauta_id::text, territory_id::text
      from public.comun_sidewalk_forwardings
      where state not in ('closed','archived')`,
  },
  {
    name: "archive-submissions",
    sql: `select id::text as source_id, 'archive' as domain, 'archive_submission' as source_type,
      'archive_triage' as work_category,
      case when status = 'information_requested' then 'information_requested' else 'pending' end as source_state,
      updated_at::text, null::text as due_at, 'normal' as risk,
      null::text as pauta_id, null::text as territory_id
      from public.comun_archive_submissions
      where status in ('pending','triage','information_requested','under_review')`,
  },
  {
    name: "archive-accessibility",
    sql: `select id::text as source_id, 'archive' as domain, 'archive_asset' as source_type,
      'missing_accessibility' as work_category, 'pending' as source_state,
      created_at::text as updated_at, null::text as due_at, 'normal' as risk,
      null::text as pauta_id, null::text as territory_id
      from public.comun_archive_assets
      where review_status = 'approved' and public_url is not null
        and mime_type like 'image/%' and nullif(btrim(alt_text), '') is null`,
  },
  {
    name: "archive-withdrawals",
    sql: `select id::text as source_id, 'archive' as domain, 'withdrawal' as source_type,
      'rights_withdrawal' as work_category, 'pending' as source_state,
      created_at::text as updated_at, null::text as due_at, 'critical' as risk,
      null::text as pauta_id, null::text as territory_id
      from public.comun_archive_rights_removal_requests
      where status in ('pending','under_review')`,
  },
  {
    name: "radio-processing",
    sql: `select id::text as source_id, 'radio' as domain, 'radio_item' as source_type,
      'radio_processing' as work_category, 'pending' as source_state,
      updated_at::text, available_at::text as due_at,
      case when status = 'failed' then 'high' else 'normal' end as risk,
      null::text as pauta_id, null::text as territory_id
      from public.comun_archive_processing_jobs
      where job_type = 'community_radio_audio'
        and status in ('queued','processing','retry_scheduled','failed','dead_letter')`,
  },
  {
    name: "art-submissions",
    sql: `select id::text as source_id, 'art' as domain, 'artwork' as source_type,
      'artwork_rights' as work_category,
      case when status = 'information_requested' then 'information_requested' else 'pending' end as source_state,
      updated_at::text, null::text as due_at, 'normal' as risk,
      null::text as pauta_id, territory_id::text
      from public.comun_archive_artwork_submissions
      where status in ('pending','triage','rights_review','information_requested','under_review')`,
  },
  {
    name: "platform-alerts",
    sql: `select id::text as source_id, 'platform' as domain,
      case when severity in ('critical','urgent') then 'incident' else 'alert' end as source_type,
      case when severity in ('critical','urgent') then 'critical_incident' else 'persistent_finding' end as work_category,
      'pending' as source_state, updated_at::text, null::text as due_at,
      case when severity in ('critical','urgent') then 'critical' else 'attention' end as risk,
      null::text as pauta_id, null::text as territory_id
      from public.comun_admin_alerts
      where status in ('open','acknowledged')`,
  },
];

function normalizedVersion(row) {
  return String(row.updated_at);
}

function snapshotFromRow(row) {
  return {
    domain: row.domain,
    sourceType: row.source_type,
    sourceId: row.source_id,
    sourceVersion: normalizedVersion(row),
    workCategory: row.work_category,
    sourceState: row.source_state,
    updatedAt: row.updated_at,
    dueAt: row.due_at,
    risk: row.risk,
    pautaId: row.pauta_id,
    territoryId: row.territory_id,
  };
}

async function collectCandidates(client) {
  const candidates = [];
  const counts = {};
  for (const query of SOURCE_QUERIES) {
    const result = await client.query(query.sql);
    counts[query.name] = result.rowCount;
    for (const row of result.rows)
      candidates.push(deriveOperationalCandidate(snapshotFromRow(row)));
  }
  assertUniqueOperationalCandidates(candidates);
  return { candidates, counts };
}

async function detectProjectionSchema(client) {
  const result = await client.query(`select count(*)::int as available
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'comun_editorial_operation_items'
      and column_name in (
        'source_domain','idempotency_key','sla_state','projection_contract'
      )`);
  return result.rows[0].available === 4 ? "operations-v1" : "legacy";
}

async function inventoryProjection(client, projectionSchema) {
  if (projectionSchema === "legacy") {
    const legacy = await client.query(`select
      count(*)::int as total,
      count(*) filter (where state not in ('resolved','withdrawn'))::int as open,
      count(*) filter (where priority = 1 and state not in ('resolved','withdrawn'))::int as p1,
      (select count(*)::int from public.comun_editorial_operation_assignments a
        left join public.comun_editorial_operation_items i on i.id = a.item_id
        where i.id is null) as orphan_assignments,
      (select count(*)::int from public.comun_editorial_operation_events e
        left join public.comun_editorial_operation_items i on i.id = e.item_id
        where i.id is null) as orphan_events
      from public.comun_editorial_operation_items`);
    return {
      ...legacy.rows[0],
      overdue: null,
      managed: 0,
      missing_key: null,
      duplicates: null,
    };
  }
  const result = await client.query(`select
    count(*)::int as total,
    count(*) filter (where state not in ('resolved','withdrawn'))::int as open,
    count(*) filter (where priority = 1 and state not in ('resolved','withdrawn'))::int as p1,
    count(*) filter (where sla_state = 'overdue' and state not in ('resolved','withdrawn'))::int as overdue,
    count(*) filter (where projection_contract = 'operations-v1')::int as managed,
    count(*) filter (where idempotency_key is null)::int as missing_key,
    (select count(*)::int from (
      select idempotency_key from public.comun_editorial_operation_items
      group by idempotency_key having count(*) > 1
    ) duplicate_keys) as duplicates,
    (select count(*)::int from public.comun_editorial_operation_assignments a
      left join public.comun_editorial_operation_items i on i.id = a.item_id
      where i.id is null) as orphan_assignments,
    (select count(*)::int from public.comun_editorial_operation_events e
      left join public.comun_editorial_operation_items i on i.id = e.item_id
      where i.id is null) as orphan_events
    from public.comun_editorial_operation_items`);
  return result.rows[0];
}

async function syncProjection(client, candidates) {
  let created = 0;
  let updated = 0;
  let reopened = 0;
  let resolved = 0;
  for (const candidate of candidates) {
    const prior = await client.query(
      `select id, state, source_version
         from public.comun_editorial_operation_items
        where idempotency_key = $1
        for update`,
      [candidate.idempotencyKey],
    );
    const result = await client.query(
      `insert into public.comun_editorial_operation_items(
        source_type, source_id, source_domain, source_key, source_version,
        work_category, idempotency_key, queue, state, title, public_reason,
        next_action, priority, indicative_due_at, human_gate, pauta_id,
        territory_id, required_role, sla_state, source_updated_at,
        last_synced_at, projection_contract
      ) values (
        $1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::timestamptz,
        $15,$16::uuid,$17::uuid,$18,$19,$20::timestamptz,now(),'operations-v1'
      )
      on conflict (idempotency_key) do update set
        source_version = excluded.source_version,
        queue = excluded.queue,
        state = case
          when public.comun_editorial_operation_items.state in ('resolved','withdrawn')
            and public.comun_editorial_operation_items.source_version <> excluded.source_version
          then 'pending'
          else public.comun_editorial_operation_items.state
        end,
        title = excluded.title,
        public_reason = excluded.public_reason,
        next_action = excluded.next_action,
        priority = excluded.priority,
        indicative_due_at = excluded.indicative_due_at,
        human_gate = excluded.human_gate,
        pauta_id = excluded.pauta_id,
        territory_id = excluded.territory_id,
        required_role = excluded.required_role,
        sla_state = excluded.sla_state,
        source_updated_at = excluded.source_updated_at,
        last_synced_at = now()
      returning id, state, (xmax = 0) as inserted`,
      [
        candidate.sourceType,
        candidate.sourceKey,
        candidate.domain,
        candidate.sourceKey,
        candidate.sourceVersion,
        candidate.workCategory,
        candidate.idempotencyKey,
        candidate.queue,
        candidate.state,
        candidate.title,
        candidate.publicReason,
        candidate.nextAction,
        candidate.priority,
        candidate.dueAt,
        candidate.humanGate,
        candidate.pautaId,
        candidate.territoryId,
        candidate.requiredRole,
        candidate.slaState,
        candidate.sourceUpdatedAt,
      ],
    );
    const inserted = result.rows[0].inserted;
    const priorRow = prior.rows[0] ?? null;
    const wasReopened =
      priorRow !== null &&
      ["resolved", "withdrawn"].includes(priorRow.state) &&
      priorRow.source_version !== candidate.sourceVersion &&
      result.rows[0].state === "pending";
    if (inserted) created += 1;
    else updated += 1;
    if (wasReopened) reopened += 1;
    if (
      inserted ||
      wasReopened ||
      (priorRow !== null && priorRow.source_version !== candidate.sourceVersion)
    ) {
      await client.query(
        `insert into public.comun_editorial_operation_events(
          item_id, event_type, payload
        ) values ($1::uuid, $2, $3::jsonb)`,
        [
          result.rows[0].id,
          inserted
            ? "projection_created"
            : wasReopened
              ? "projection_reopened"
              : "projection_reconciled",
          JSON.stringify({
            domain: candidate.domain,
            category: candidate.workCategory,
            previousState: priorRow?.state ?? null,
            nextState: result.rows[0].state,
            sourceVersionChanged:
              priorRow === null ||
              priorRow.source_version !== candidate.sourceVersion,
          }),
        ],
      );
    }
  }

  const activeKeys = candidates.map((candidate) => candidate.idempotencyKey);
  const closed = await client.query(
    `update public.comun_editorial_operation_items
        set state = 'resolved',
            resolved_at = now(),
            next_action = 'A fonte canônica encerrou esta pendência.',
            last_synced_at = now()
      where projection_contract = 'operations-v1'
        and state not in ('resolved','withdrawn')
        and not (idempotency_key = any($1::text[]))
      returning id, source_domain, work_category`,
    [activeKeys],
  );
  for (const row of closed.rows) {
    await client.query(
      `insert into public.comun_editorial_operation_events(
        item_id, event_type, payload
      ) values ($1::uuid, 'projection_resolved_from_source', $2::jsonb)`,
      [
        row.id,
        JSON.stringify({
          domain: row.source_domain,
          category: row.work_category,
          previousState: "open",
          nextState: "resolved",
          sourceVersionChanged: false,
        }),
      ],
    );
  }
  resolved = closed.rowCount;
  return { created, updated, reopened, resolved };
}

async function runRehearsal(client) {
  const fixtureSources = [
    ["communities", "community_request", "membership_review"],
    ["pautas", "contribution", "contribution_triage"],
    ["actions", "task", "task_overdue"],
    ["protocols", "protocol", "protocol_due"],
    ["protocols", "response", "response_synthesis"],
    ["sidewalks", "sidewalk_record", "moderation"],
    ["archive", "archive_submission", "archive_triage"],
    ["archive", "withdrawal", "rights_withdrawal"],
    ["platform", "incident", "critical_incident"],
    ["pautas", "contribution", "privacy_review"],
  ];
  const candidates = fixtureSources.map(
    ([domain, sourceType, workCategory], index) =>
      deriveOperationalCandidate({
        domain,
        sourceType,
        sourceId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        sourceVersion: "rehearsal-v1",
        workCategory,
        sourceState: index === 9 ? "information_requested" : "pending",
        updatedAt: "2026-07-30T12:00:00.000Z",
        dueAt: index === 2 ? "2026-07-29T12:00:00.000Z" : null,
        cycle: "operations-rehearsal-20260730",
      }),
  );
  const writes = await syncProjection(client, candidates);
  const duplicate = await syncProjection(client, candidates);
  const count = await client.query(
    `select count(*)::int as total from public.comun_editorial_operation_items
     where idempotency_key like '%:operations-rehearsal-20260730'`,
  );
  if (count.rows[0].total !== 10 || duplicate.created !== 0)
    throw new Error("COMUN_OPERATIONS_REHEARSAL_IDEMPOTENCY_FAILED");
  const negative = deriveOperationalCandidate({
    domain: "archive",
    sourceType: "withdrawal",
    sourceId: "00000000-0000-4000-8000-000000000008",
    sourceVersion: "rehearsal-v1",
    workCategory: "rights_withdrawal",
    sourceState: "pending",
    updatedAt: "2026-07-30T12:00:00.000Z",
    cycle: "operations-rehearsal-20260730",
  });
  if (negative.queue !== "withdrawals" || negative.priority !== 1)
    throw new Error("COMUN_OPERATIONS_REHEARSAL_WITHDRAWAL_NOT_PROTECTED");
  return {
    fixtures: count.rows[0].total,
    created: writes.created,
    duplicateWrites: duplicate.created,
    transitionNegative: "blocked",
    cleanup: "transaction_rollback",
  };
}

function sanitizeArtifact(value) {
  const text = JSON.stringify(value, null, 2);
  const occurrences = FORBIDDEN.filter((pattern) => pattern.test(text)).length;
  if (occurrences)
    throw new Error("COMUN_OPERATIONS_ARTIFACT_SANITIZATION_FAILED");
  return `${text}\n`;
}

async function persist(name, value) {
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(path.join(OUTPUT, name), sanitizeArtifact(value), "utf8");
}

export async function runOperationsAudit() {
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) throw new Error("COMUN_OPERATIONS_DATABASE_URL_MISSING");
  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
  });
  const startedAt = new Date().toISOString();
  let report;
  try {
    await client.connect();
    await client.query(
      mode === "read-only" ? "begin transaction read only" : "begin",
    );
    await client.query("set local statement_timeout = '30s'");
    const projectionSchema = await detectProjectionSchema(client);
    if (mode !== "read-only" && projectionSchema !== "operations-v1")
      throw new Error("COMUN_OPERATIONS_PROJECTION_MIGRATION_REQUIRED");
    const before = await inventoryProjection(client, projectionSchema);
    if (mode === "rehearsal") {
      const rehearsal = await runRehearsal(client);
      await client.query("rollback");
      report = {
        formatVersion: 1,
        auditType: "operations_controlled_private_rehearsal",
        mode,
        rehearsal,
        before,
        projectionSchema,
        databaseWrites: "rolled_back",
        storageWrites: "none",
        publicWrites: "none",
        cleanup: "green",
        result: "COMUN_OPERATIONS_CONTROLLED_REHEARSAL_GREEN",
      };
    } else {
      const { candidates, counts } = await collectCandidates(client);
      const sync =
        mode === "sync"
          ? await syncProjection(client, candidates)
          : { created: 0, updated: 0, reopened: 0, resolved: 0 };
      if (mode === "sync") await client.query("commit");
      else await client.query("rollback");
      report = {
        formatVersion: 1,
        auditType:
          mode === "sync"
            ? "operations_projection_sync"
            : "operations_read_only_preflight",
        mode,
        sourceCounts: counts,
        candidates: candidates.length,
        projectionBefore: before,
        projectionSchema,
        migrationRequired: projectionSchema !== "operations-v1",
        sync,
        databaseWrites:
          mode === "sync" ? "operational_projection_only" : "none",
        storageWrites: "none",
        sourceWrites: "none",
        containsPersonalData: false,
        containsSourceIds: false,
        containsPrivateContent: false,
        result:
          mode === "sync"
            ? "COMUN_OPERATIONS_SYNC_GREEN"
            : "COMUN_OPERATIONS_PREFLIGHT_GREEN",
      };
    }
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {}
    report = {
      formatVersion: 1,
      auditType: "operations_failure",
      mode,
      classification:
        error instanceof Error
          ? error.message.replace(/[^A-Z0-9_ -]/gi, "").slice(0, 120)
          : "UNKNOWN",
      databaseWrites: mode === "read-only" ? "none" : "rolled_back_or_unknown",
      storageWrites: "none",
      result: "COMUN_OPERATIONS_BLOCKED_PREFLIGHT",
    };
    await persist("operations-report.json", report);
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  report.startedAt = startedAt;
  report.completedAt = new Date().toISOString();
  await persist("operations-report.json", report);
  await persist("sanitization-report.json", {
    status: "sanitized",
    forbiddenOccurrences: 0,
    containsPersonalData: false,
    containsSourceIds: false,
    rawRowsPersisted: false,
  });
  console.log(report.result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await runOperationsAudit();
