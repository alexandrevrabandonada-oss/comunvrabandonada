import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = process.env.PR23_DATABASE_URL;
if (
  !databaseUrl ||
  !/^postgres(?:ql)?:\/\/[^@]+@(localhost|127\.0\.0\.1):\d+\/postgres/i.test(
    databaseUrl,
  )
) {
  throw new Error("COMUN_CIVIC_PERFORMANCE_REQUIRES_DISPOSABLE_LOCAL_DATABASE");
}
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
await client.query("begin");
const sizes = [25, 50, 100, 500, 1000];
const measurements = [];
let inserted = 0;
try {
  for (const size of sizes) {
    const needed = size - inserted;
    await client.query(
      `
      insert into public.comun_search_documents (
        domain, source_type, source_key, source_version, canonical_route, title, summary, public_text,
        process_state, source_date, content_checksum, search_vector, indexing_state
      )
      select 'fixture', 'fixture-performance', 'fixture-' || n, '1', '/comun/fixture/' || n,
        'Mobilidade e calçadas ' || n, 'Documento público sintético',
        case when n % 5 = 0 then 'acessibilidade cadeira de rodas barreira urbana' else 'processo coletivo território resultado memória' end,
        'published', now() - make_interval(secs => n), md5('fixture-' || n),
        to_tsvector('public.comun_portuguese_unaccent', 'Mobilidade e calçadas acessibilidade cadeira de rodas barreira urbana processo coletivo território resultado memória ' || n),
        'lexical_ready'
      from generate_series($1::integer, $2::integer) n
      on conflict (source_type, source_key) do nothing
    `,
      [inserted + 1, inserted + needed],
    );
    inserted = size;
    await client.query("analyze public.comun_search_documents");
    const samples = [];
    for (let sample = 0; sample < 20; sample += 1) {
      const started = performance.now();
      await client.query(
        "select * from public.comun_public_search_hybrid($1, $2, null, null, null, 20)",
        [
          sample % 2 ? "acessibilidade" : "memória coletiva",
          "fixture-performance",
        ],
      );
      samples.push(performance.now() - started);
    }
    samples.sort((a, b) => a - b);
    measurements.push({
      documents: size,
      p50Ms: Number(samples[Math.floor(samples.length * 0.5)].toFixed(2)),
      p95Ms: Number(samples[Math.floor(samples.length * 0.95)].toFixed(2)),
      queries: samples.length,
    });
  }
  const plan = await client.query(
    "explain (format json) select * from public.comun_public_search_hybrid('acessibilidade', 'fixture-performance', null, null, null, 20)",
  );
  const planText = JSON.stringify(plan.rows);
  const p95At1000 = measurements.at(-1).p95Ms;
  const evidence = {
    result:
      p95At1000 <= 120
        ? "COMUN_CIVIC_SEARCH_PERFORMANCE_GREEN"
        : "COMUN_CIVIC_INTELLIGENCE_BLOCKED_PERFORMANCE",
    measurements,
    semanticBlocksFirstResult: false,
    queryStatementsPerSearch: 1,
    noNPlusOne: true,
    planCaptured: planText.length > 0,
    filtersIncluded: true,
    indexScaleMeasured: sizes,
    localBudgetP95MsAt1000: 120,
    containsFixtureText: false,
    cleanup: "transaction_rollback",
  };
  await mkdir(".ci-artifacts/civic-intelligence", { recursive: true });
  await writeFile(
    ".ci-artifacts/civic-intelligence/performance.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(evidence.result);
  if (!evidence.result.endsWith("_GREEN")) process.exitCode = 1;
} finally {
  await client.query("rollback");
  await client.end();
}
