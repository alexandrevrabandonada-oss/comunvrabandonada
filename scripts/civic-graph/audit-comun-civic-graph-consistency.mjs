import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";

const requireRemote = process.argv.includes("--require-remote");
const connectionString =
  process.env.COMUN_CIVIC_GRAPH_DATABASE_URL ?? process.env.SUPABASE_DB_URL;
const referenceDate = new Date().toISOString();
const base = {
  schema: "comun.civic-graph.consistency.v1",
  generatedAt: referenceDate,
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  classification: "aggregate_read_only_not_human_rehearsal",
  containsPrivateData: false,
};

if (!connectionString) {
  const payload = {
    ...base,
    status: "canonical_source_unavailable_locally",
    counts: [],
    findings: [
      { type: "remote_source_not_configured", severity: "info", count: 1 },
    ],
  };
  await persist(payload);
  console.log(JSON.stringify({ ok: !requireRemote, status: payload.status }));
  if (requireRemote) process.exitCode = 1;
} else {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 8_000,
    query_timeout: 15_000,
  });
  try {
    await client.connect();
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction read only");
    const counts = [];
    for (const definition of countDefinitions) {
      const response = await client.query(definition.sql);
      counts.push({
        key: definition.key,
        scope: definition.scope,
        source: definition.source,
        filters: definition.filters,
        visibility: definition.visibility,
        state: definition.state,
        referenceDate,
        count: Number(response.rows[0]?.count ?? 0),
      });
    }
    await client.query("rollback");
    const byKey = new Map(counts.map((item) => [item.key, item.count]));
    const findings = findingDefinitions
      .map((definition) => ({
        ...definition,
        count: byKey.get(definition.key) ?? 0,
      }))
      .filter((item) => item.count > 0);
    const blocking = findings.filter((item) => item.severity === "critical");
    const payload = {
      ...base,
      status: blocking.length ? "inconsistent" : "consistent",
      counts,
      findings,
    };
    await persist(payload);
    console.log(
      JSON.stringify({
        ok: blocking.length === 0,
        status: payload.status,
        counts: counts.length,
        findings: findings.length,
      }),
    );
    if (blocking.length) process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function persist(payload) {
  await mkdir("reports/current", { recursive: true });
  await writeFile(
    "reports/current/comun-civic-graph-consistency.json",
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  const rows = payload.counts
    .map(
      (item) =>
        `| ${item.key} | ${item.scope} | ${item.source} | ${item.filters} | ${item.visibility} | ${item.state} | ${item.referenceDate} | ${item.count} |`,
    )
    .join("\n");
  const findings = payload.findings
    .map(
      (item) =>
        `| ${item.type} | ${item.severity} | ${item.count} | ${item.decision ?? "registrar sem correção heurística"} |`,
    )
    .join("\n");
  await writeFile(
    "reports/current/comun-civic-graph-consistency.md",
    `# Consistência agregada do grafo cívico\n\nExecução somente leitura. Estado: **${payload.status}**. Nenhum ID ou conteúdo privado é coletado.\n\n| Número | Escopo | Fonte | Filtros | Visibilidade | Estado | Referência | Contagem |\n|---|---|---|---|---|---|---|---|\n${rows || "| — | fonte remota indisponível nesta execução | — | — | — | — | — | — |"}\n\n## Findings\n\n| Tipo | Severidade | Contagem | Decisão |\n|---|---|---:|---|\n${findings || "| nenhum | — | 0 | manter consultas canônicas |"}\n\n> Registros públicos de Calçadas e relatos aprovados da pauta são escopos distintos; os números permanecem separados e rotulados.\n`,
  );
}

const countDefinitions = [
  count(
    "territories_public",
    "territórios formais públicos",
    "comun_hub_territories",
    "visibility='public'",
    "public",
    "active or archived",
    "select count(*)::int from public.comun_hub_territories where visibility='public'",
  ),
  count(
    "pautas_public",
    "pautas públicas",
    "comun_pauta_spaces",
    "visibility='public'",
    "public",
    "all public states",
    "select count(*)::int from public.comun_pauta_spaces where visibility='public'",
  ),
  count(
    "pautas_public_without_territory",
    "pautas públicas sem território formal",
    "comun_pauta_spaces",
    "visibility='public' and territory_id is null",
    "public",
    "all public states",
    "select count(*)::int from public.comun_pauta_spaces where visibility='public' and territory_id is null",
  ),
  count(
    "pautas_with_unmatched_community",
    "pautas com projeção comunitária sem comunidade pública correspondente",
    "comun_pauta_spaces + comun_communities",
    "community is not null; slug não confirmado",
    "public",
    "active projection",
    "select count(*)::int from public.comun_pauta_spaces p where p.visibility='public' and nullif(trim(p.community),'') is not null and not exists (select 1 from public.comun_communities c where c.slug=p.community and c.is_active)",
  ),
  count(
    "contributions_approved_public",
    "contribuições aprovadas na pauta",
    "comun_pauta_contributions + comun_pauta_spaces",
    "contribution.status='approved'; pauta public/non-archived",
    "public",
    "approved",
    "select count(*)::int from public.comun_pauta_contributions c join public.comun_pauta_spaces p on p.id=c.pauta_id where c.status='approved' and p.visibility='public' and p.status<>'archived'",
  ),
  count(
    "actions_public",
    "ações públicas",
    "comun_mobilization_actions",
    "visibility='public'",
    "public",
    "all action states",
    "select count(*)::int from public.comun_mobilization_actions where visibility='public'",
  ),
  count(
    "results_public",
    "resultados publicados",
    "comun_hub_results",
    "visibility='public'",
    "public",
    "all verification states",
    "select count(*)::int from public.comun_hub_results where visibility='public'",
  ),
  count(
    "results_public_without_origin",
    "resultados públicos sem pauta nem ação",
    "comun_hub_results",
    "visibility='public'; pauta_id/action_id null",
    "public",
    "all verification states",
    "select count(*)::int from public.comun_hub_results where visibility='public' and pauta_id is null and action_id is null",
  ),
  count(
    "results_verified",
    "resultados verificados",
    "comun_hub_results",
    "visibility='public' and verification_status='verified'",
    "public",
    "verified",
    "select count(*)::int from public.comun_hub_results where visibility='public' and verification_status='verified'",
  ),
  count(
    "sidewalk_records_published",
    "registros publicados de Calçadas",
    "comun_sidewalk_records",
    "status='published' and visibility='public'",
    "public",
    "published",
    "select count(*)::int from public.comun_sidewalk_records where status='published' and visibility='public'",
  ),
  count(
    "archive_items_public",
    "itens editoriais públicos",
    "comun_archive_items",
    "status='published' and visibility='public'",
    "public",
    "published",
    "select count(*)::int from public.comun_archive_items where status='published' and visibility='public'",
  ),
  count(
    "archive_links_public",
    "relações públicas entre memória e processo",
    "comun_hub_archive_links + comun_archive_items",
    "item published/public",
    "public",
    "published",
    "select count(*)::int from public.comun_hub_archive_links l join public.comun_archive_items i on i.id=l.archive_item_id where i.status='published' and i.visibility='public'",
  ),
  count(
    "radio_episodes_public",
    "episódios públicos",
    "comun_radio_episodes",
    "publication_status='published'",
    "public",
    "published",
    "select count(*)::int from public.comun_radio_episodes where publication_status='published'",
  ),
  count(
    "radio_episodes_without_civic_relation",
    "episódios sem território, pauta ou ação",
    "comun_radio_episodes",
    "published; três FKs null",
    "public",
    "published",
    "select count(*)::int from public.comun_radio_episodes where publication_status='published' and territory_id is null and pauta_id is null and action_id is null",
  ),
  count(
    "invalid_public_slugs",
    "slugs públicos fora do contrato",
    "territories+pautas+actions+results+archive",
    "slug !~ canonical regex",
    "public",
    "published/public",
    "select sum(n)::int as count from (select count(*) n from public.comun_hub_territories where visibility='public' and slug !~ '^[a-z0-9][a-z0-9-]{0,159}$' union all select count(*) from public.comun_pauta_spaces where visibility='public' and slug !~ '^[a-z0-9][a-z0-9-]{0,159}$' union all select count(*) from public.comun_mobilization_actions where visibility='public' and slug !~ '^[a-z0-9][a-z0-9-]{0,159}$' union all select count(*) from public.comun_hub_results where visibility='public' and slug !~ '^[a-z0-9][a-z0-9-]{0,159}$' union all select count(*) from public.comun_archive_items where visibility='public' and status='published' and slug !~ '^[a-z0-9][a-z0-9-]{0,159}$') x",
  ),
];

const findingDefinitions = [
  {
    key: "pautas_public_without_territory",
    type: "public_entity_without_territory",
    severity: "warning",
    decision: "exibir somente contexto comprovado e tratar aditivamente",
  },
  {
    key: "pautas_with_unmatched_community",
    type: "text_projection_without_canonical_community",
    severity: "warning",
    decision: "não gerar link comunitário",
  },
  {
    key: "results_public_without_origin",
    type: "public_result_without_origin",
    severity: "critical",
    decision: "bloquear prontidão e corrigir fonte canônica",
  },
  {
    key: "radio_episodes_without_civic_relation",
    type: "cultural_content_without_civic_relation",
    severity: "info",
    decision: "permitido; não inventar vínculo político",
  },
  {
    key: "invalid_public_slugs",
    type: "incompatible_public_slug",
    severity: "critical",
    decision: "bloquear deep link até correção canônica",
  },
];

function count(key, scope, source, filters, visibility, state, sql) {
  return { key, scope, source, filters, visibility, state, sql };
}
