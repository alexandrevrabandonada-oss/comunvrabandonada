import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

export const fixedAuditSql = `
select jsonb_build_object(
  'processesByStage', coalesce((
    select jsonb_object_agg(current_stage, total)
    from (
      select current_stage, count(*)::int as total
      from public.comun_pauta_action_cycles
      where cycle_scope = 'production'
      group by current_stage
      order by current_stage
    ) stages
  ), '{}'::jsonb),
  'processesWithoutNextAction', (
    select count(*)::int
    from public.comun_pauta_action_cycles
    where cycle_scope = 'production'
      and nullif(trim(next_action_public), '') is null
  ),
  'overdueTasks', (
    select count(*)::int
    from public.comun_collective_action_tasks
    where due_at < now()
      and state in ('open', 'in_progress')
  ),
  'protocolsNearDue', (
    select count(*)::int
    from public.comun_official_protocols
    where expected_response_at between now() and now() + interval '7 days'
      and status not in ('resolved', 'unresolved', 'archived')
  ),
  'protocolsOverdue', (
    select count(*)::int
    from public.comun_official_protocols
    where expected_response_at < now()
      and status not in ('response_received', 'satisfactory_response',
        'unsatisfactory_response', 'resolved', 'unresolved', 'archived')
  ),
  'responsesWithoutPublicSummary', (
    select count(*)::int
    from public.comun_official_protocols
    where response_received_at is not null
      and nullif(trim(public_summary), '') is null
      and status <> 'archived'
  ),
  'actionsCompletedWithoutVerifiedResult', (
    select count(*)::int
    from public.comun_collective_actions action
    left join public.comun_pauta_action_cycles cycle
      on cycle.collective_action_id = action.id
    left join public.comun_hub_results result
      on result.id = cycle.result_id
    where action.status = 'completed'
      and (result.id is null or result.verification_status <> 'verified')
  ),
  'resultsAwaitingMemory', (
    select count(*)::int
    from public.comun_pauta_action_cycles
    where current_stage = 'result'
      and memory_published_at is null
      and cycle_scope = 'production'
  ),
  'processesStalledAboveSla', (
    select count(*)::int
    from public.comun_pauta_action_cycles
    where cycle_scope = 'production'
      and current_stage not in ('memory', 'reopened')
      and last_transition_at < now() - interval '30 days'
  )
) as metrics;
`;

const forbiddenSql =
  /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|copy|call|do|vacuum|analyze|refresh|reindex|cluster)\b/i;

export function assertReadOnlyAuditSql(sql = fixedAuditSql) {
  if (forbiddenSql.test(sql))
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_AUDIT_WRITE_BLOCKED");
  if (!/^\s*select\b/i.test(sql))
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_AUDIT_SELECT_REQUIRED");
  return true;
}

export function sanitizeAggregateMetrics(metrics) {
  const numeric = [
    "processesWithoutNextAction",
    "overdueTasks",
    "protocolsNearDue",
    "protocolsOverdue",
    "responsesWithoutPublicSummary",
    "actionsCompletedWithoutVerifiedResult",
    "resultsAwaitingMemory",
    "processesStalledAboveSla",
  ];
  const clean = {
    formatVersion: 1,
    auditType: "pauta_action_cycle_aggregate",
    generatedAt: new Date().toISOString(),
    processesByStage: {},
  };
  for (const [stage, value] of Object.entries(metrics.processesByStage ?? {})) {
    if (!/^[a-z_]{3,40}$/.test(stage)) continue;
    clean.processesByStage[stage] = Math.max(0, Number(value) || 0);
  }
  for (const key of numeric)
    clean[key] = Math.max(0, Number(metrics[key]) || 0);
  clean.findingsCount = numeric.reduce(
    (total, key) => total + (clean[key] > 0 ? 1 : 0),
    0,
  );
  clean.containsPrivateData = false;
  clean.databaseWrites = "none";
  return clean;
}

export function renderAggregateMarkdown(result) {
  const stages = Object.entries(result.processesByStage)
    .map(([stage, count]) => `- ${stage}: ${count}`)
    .join("\n");
  return `# Auditoria agregada da esteira política

- Gerada em: ${result.generatedAt}
- Findings: ${result.findingsCount}
- Escritas no banco: none
- Dados privados: não incluídos

## Processos por etapa

${stages || "- nenhum processo"}

## Pontos de atenção

- Sem próxima ação: ${result.processesWithoutNextAction}
- Tarefas vencidas: ${result.overdueTasks}
- Protocolos próximos do prazo: ${result.protocolsNearDue}
- Protocolos vencidos: ${result.protocolsOverdue}
- Respostas sem síntese pública: ${result.responsesWithoutPublicSummary}
- Ações concluídas sem resultado verificado: ${result.actionsCompletedWithoutVerifiedResult}
- Resultados aguardando memória: ${result.resultsAwaitingMemory}
- Processos acima do SLA: ${result.processesStalledAboveSla}
`;
}

async function run() {
  assertReadOnlyAuditSql();
  const connectionString =
    process.env.COMUN_COLLECTIVE_ACTIONS_DATABASE_URL ??
    process.env.SUPABASE_DB_URL;
  if (!connectionString)
    throw new Error("COMUN_PAUTA_ACTION_CYCLE_AUDIT_DATABASE_MISSING");
  const outputIndex = process.argv.indexOf("--output");
  const output =
    outputIndex >= 0
      ? process.argv[outputIndex + 1]
      : ".ci-artifacts/pauta-action-cycle-audit/metrics.json";
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
  });
  try {
    await client.connect();
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction read only");
    const result = await client.query(fixedAuditSql);
    const metrics = sanitizeAggregateMetrics(result.rows[0]?.metrics ?? {});
    await client.query("rollback");
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
    await writeFile(
      path.join(path.dirname(output), "metrics.md"),
      renderAggregateMarkdown(metrics),
      "utf8",
    );
    process.stdout.write("COMUN_PAUTA_ACTION_CYCLE_DAILY_AUDIT_SANITIZED\n");
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(
      `${String(error?.message ?? "COMUN_PAUTA_ACTION_CYCLE_AUDIT_FAILED")}\n`,
    );
    process.exitCode = 1;
  });
}
