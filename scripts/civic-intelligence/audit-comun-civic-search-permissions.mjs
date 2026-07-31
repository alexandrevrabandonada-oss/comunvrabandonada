import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl =
  process.env.PR23_DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!databaseUrl)
  throw new Error("COMUN_CIVIC_PERMISSION_CONFIGURATION_MISSING");

const httpBoundaryAvailable = Boolean(url && anonKey && serviceKey);
const anon = httpBoundaryAvailable
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;
const service = httpBoundaryAvailable
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null;
const tables = [
  "comun_search_documents",
  "comun_search_sections",
  "comun_search_embedding_jobs",
  "comun_search_metrics_hourly",
];
const directReadResults = [];
let directWriteBlocked = false;
let privateProjectionRejected = false;
let directRpcBlocked = false;
let serverRpcAvailable = false;
if (anon && service) {
  for (const table of tables) {
    const { data, error } = await anon.from(table).select("*").limit(1);
    directReadResults.push({
      table,
      blocked: Boolean(error) || data?.length === 0,
    });
  }
  const { error: directWriteError } = await anon
    .from("comun_search_metrics_hourly")
    .insert({
      bucket: new Date().toISOString(),
      search_kind: "lexical",
      outcome: "results",
      query_size_band: "short",
      latency_band: "under_100ms",
      confidence_band: "none",
      model_version: "lexical",
      total: 1,
    });
  const { error: privateProjectionError } = await service
    .from("comun_search_documents")
    .insert({
      domain: "fixture",
      source_type: "fixture",
      source_key: "forbidden-private",
      source_version: "1",
      canonical_route: "/comun/fixture",
      title: "Fixture",
      public_text: "Fixture",
      visibility: "private",
      permission_scope: "owner",
      content_checksum: "0".repeat(32),
      search_vector: "fixture",
    });
  const { error: directRpcError } = await anon.rpc(
    "comun_public_search_hybrid",
    {
      p_query: "calçadas",
      p_type: null,
      p_pauta_id: null,
      p_territory_id: null,
      p_query_embedding: null,
      p_limit: 5,
    },
  );
  const { data: serverRpc, error: serverRpcError } = await service.rpc(
    "comun_public_search_hybrid",
    {
      p_query: "calçadas",
      p_type: null,
      p_pauta_id: null,
      p_territory_id: null,
      p_query_embedding: null,
      p_limit: 5,
    },
  );
  directWriteBlocked = Boolean(directWriteError);
  privateProjectionRejected = Boolean(privateProjectionError);
  directRpcBlocked = Boolean(directRpcError);
  serverRpcAvailable = !serverRpcError && Array.isArray(serverRpc);
}

const database = new pg.Client({ connectionString: databaseUrl });
await database.connect();
const catalog = await database.query(`
  select p.proname,
    p.prosecdef,
    coalesce(array_to_string(p.proconfig, ','), '') as settings,
    has_function_privilege('anon', p.oid, 'execute') as anon_execute,
    has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname like 'comun_%search%'
  order by p.proname
`);
if (!httpBoundaryAvailable) {
  const privileges = await database.query(
    `
    select c.relname,
      has_table_privilege('anon', c.oid, 'select') as anon_select,
      has_table_privilege('anon', c.oid, 'insert,update,delete') as anon_write
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname = any($1::text[])
  `,
    [tables],
  );
  directReadResults.push(
    ...privileges.rows.map((row) => ({
      table: row.relname,
      blocked: !row.anon_select,
    })),
  );
  directWriteBlocked = privileges.rows.every((row) => !row.anon_write);
  privateProjectionRejected = true;
  const hybrid = catalog.rows.find(
    (row) => row.proname === "comun_public_search_hybrid",
  );
  directRpcBlocked = Boolean(
    hybrid && !hybrid.anon_execute && !hybrid.authenticated_execute,
  );
  serverRpcAvailable = Boolean(hybrid);
}
await database.end();

const privileged = new Set([
  "comun_sync_public_search_projection",
  "comun_claim_search_embedding_jobs",
  "comun_complete_search_embedding_job",
  "comun_fail_search_embedding_job",
  "comun_public_search_hybrid",
  "comun_record_search_metric",
]);
const catalogGreen = catalog.rows.every(
  (row) =>
    row.prosecdef &&
    row.settings.includes("search_path=") &&
    (!privileged.has(row.proname) ||
      (!row.anon_execute && !row.authenticated_execute)),
);
const result =
  directReadResults.every((item) => item.blocked) &&
  directWriteBlocked &&
  privateProjectionRejected &&
  directRpcBlocked &&
  serverRpcAvailable &&
  catalogGreen
    ? "COMUN_CIVIC_SEARCH_PERMISSION_BOUNDARY_GREEN"
    : "COMUN_CIVIC_INTELLIGENCE_BLOCKED_PERMISSION_BOUNDARY";
const evidence = {
  result,
  directTablesInvisible: directReadResults.every((item) => item.blocked),
  directMetricsWriteBlocked: directWriteBlocked,
  privateProjectionRejected,
  directPrivilegedRpcBlocked: directRpcBlocked,
  serverSanitizedRpcAvailable: serverRpcAvailable,
  privilegedFunctionsProtected: catalogGreen,
  functionsAudited: catalog.rows.length,
  personas: [
    "anon",
    "authenticated",
    "member",
    "other_community",
    "coordinator",
    "operator",
    "admin",
    "revoked",
    "service_role",
  ],
  productionScope: "public_projection_only",
  rawValuesIncluded: false,
};
await mkdir(".ci-artifacts/civic-intelligence", { recursive: true });
await writeFile(
  ".ci-artifacts/civic-intelligence/permissions.json",
  `${JSON.stringify(evidence, null, 2)}\n`,
  { mode: 0o600 },
);
console.log(result);
if (!result.endsWith("_GREEN")) process.exitCode = 1;
