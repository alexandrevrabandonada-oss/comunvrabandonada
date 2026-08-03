import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const databaseUrl =
  process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ??
  process.env.PR23_DATABASE_URL ??
  "";

if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d{1,5}\/postgres(?:[/?]|$)/.test(
    databaseUrl,
  )
) {
  throw new Error("COMUN_RELATA_LOCAL_DATABASE_REQUIRED");
}

const proof = () => randomBytes(32).toString("base64url");
const fixture = (overrides = {}) => ({
  idempotencyKey: proof(),
  receiptSecret: proof(),
  text: "A rua está toda escura desde ontem à noite.",
  answers: { homes_power: "nao" },
  category: "public_lighting",
  urgency: "attention",
  ruleVersion: "relata-routing-v1",
  decision: { explanation: "Triagem determinística local." },
  privacyClass: "public_after_sanitization",
  consentVersion: "relata-consent-v1",
  ...overrides,
});

async function connect() {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  return client;
}

async function asRole(role, callback, subject = null) {
  const client = await connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    if (subject) {
      await client.query(
        "select set_config('request.jwt.claim.sub', $1, true)",
        [subject],
      );
    }
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

async function createReport(input) {
  return asRole("service_role", (client) =>
    client.query(
      `select * from public.comun_relata_create(
        $1,$2,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9,$10
      )`,
      [
        input.idempotencyKey,
        input.receiptSecret,
        input.text,
        input.answers,
        input.category,
        input.urgency,
        input.ruleVersion,
        input.decision,
        input.privacyClass,
        input.consentVersion,
      ],
    ),
  );
}

const first = fixture();
const firstCreate = await createReport(first);
assert.equal(firstCreate.rowCount, 1);
assert.equal(firstCreate.rows[0].state, "stored_private");
assert.equal(firstCreate.rows[0].idempotent, false);
assert.match(firstCreate.rows[0].protocol, /^COMUN-RELATA-[A-F0-9]{16}$/);

const sequential = await createReport(first);
assert.equal(sequential.rows[0].protocol, firstCreate.rows[0].protocol);
assert.equal(sequential.rows[0].idempotent, true);

await assert.rejects(
  createReport(
    fixture({ answers: { homes_power: "nao", private_note: "não permitir" } }),
  ),
  /COMUN_RELATA_INVALID_TRIAGE/,
);
await assert.rejects(
  createReport(fixture({ ruleVersion: "relata-routing-v2" })),
  /COMUN_RELATA_INVALID_CONTRACT/,
);

await assert.rejects(
  createReport({
    ...first,
    text: "Payload incompatível para a mesma chave opaca.",
  }),
  /COMUN_RELATA_IDEMPOTENCY_CONFLICT/,
);

const concurrentInput = fixture();
const [concurrentA, concurrentB] = await Promise.all([
  createReport(concurrentInput),
  createReport(concurrentInput),
]);
assert.equal(concurrentA.rows[0].protocol, concurrentB.rows[0].protocol);
assert.deepEqual(
  [concurrentA.rows[0].idempotent, concurrentB.rows[0].idempotent].sort(),
  [false, true],
);
assert.notEqual(concurrentA.rows[0].protocol, firstCreate.rows[0].protocol);

const wrongReceipt = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_get_receipt($1,$2)", [
    firstCreate.rows[0].protocol,
    proof(),
  ]),
);
const nonexistent = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_get_receipt($1,$2)", [
    "COMUN-RELATA-0000000000000000",
    proof(),
  ]),
);
assert.equal(wrongReceipt.rowCount, 0);
assert.equal(nonexistent.rowCount, 0);

const ownReceipt = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_get_receipt($1,$2)", [
    firstCreate.rows[0].protocol,
    first.receiptSecret,
  ]),
);
assert.equal(ownReceipt.rowCount, 1);
assert.equal(ownReceipt.rows[0].timeline.length, 4);

const postgres = await connect();
const caseRow = await postgres.query(
  "select id, report_id, routing_decision from public.comun_relata_cases where protocol = $1",
  [firstCreate.rows[0].protocol],
);
const caseId = caseRow.rows[0].id;
const reportId = caseRow.rows[0].report_id;
assert.deepEqual(caseRow.rows[0].routing_decision, {
  category: "public_lighting",
  urgency: "attention",
  ruleVersion: "relata-routing-v1",
  source: "deterministic_server_route",
});
const counts = await postgres.query(
  `select
    (select count(*)::int from public.comun_relata_cases where report_id = $1) as cases,
    (select count(*)::int from public.comun_relata_consents where case_id = $2) as consents,
    (select count(*)::int from public.comun_relata_status_events where case_id = $2) as events`,
  [reportId, caseId],
);
assert.deepEqual(counts.rows[0], { cases: 1, consents: 1, events: 4 });

await assert.rejects(
  asRole("anon", (client) =>
    client.query("select count(*) from private.comun_relata_reports"),
  ),
  /permission denied/,
);
await assert.rejects(
  asRole("anon", (client) =>
    client.query("select count(*) from public.comun_relata_cases"),
  ),
  /permission denied/,
);

const ordinarySubject = randomUUID();
await assert.rejects(
  asRole(
    "authenticated",
    (client) => client.query("select count(*) from public.comun_relata_cases"),
    ordinarySubject,
  ),
  /permission denied/,
);

const adminSubject = randomUUID();
await postgres.query(
  `insert into public.comun_admin_users(user_id,email,role,is_active)
   values ($1,$2,'admin',true)`,
  [adminSubject, `relata-admin-${adminSubject}@example.invalid`],
);
await assert.rejects(
  asRole(
    "authenticated",
    (client) => client.query("select count(*) from public.comun_relata_cases"),
    adminSubject,
  ),
  /permission denied/,
);

await assert.rejects(
  postgres.query(
    "update public.comun_relata_status_events set result_code='RELATA_MUTATED' where case_id=$1",
    [caseId],
  ),
  /COMUN_RELATA_EVENT_APPEND_ONLY/,
);
await assert.rejects(
  postgres.query(
    "delete from public.comun_relata_status_events where case_id=$1",
    [caseId],
  ),
  /COMUN_RELATA_EVENT_APPEND_ONLY/,
);
await assert.rejects(
  postgres.query(
    `insert into public.comun_relata_public_snapshots(case_id,public_summary,approximate_location)
     values ($1,'bloqueado','{}'::jsonb)`,
    [caseId],
  ),
  /COMUN_RELATA_PUBLICATION_BLOCKED_48_0B/,
);
await assert.rejects(
  postgres.query(
    "update public.comun_relata_cases set protocol_kind='official',is_official=true,official_protocol='X' where id=$1",
    [caseId],
  ),
  /COMUN_RELATA_PROTOCOL_IMMUTABLE/,
);

const security = await postgres.query(`
  select
    count(*) filter (where relrowsecurity and relforcerowsecurity)::int as protected_tables,
    count(*)::int as total_tables
  from pg_class
  where oid in (
    'private.comun_relata_reports'::regclass,
    'private.comun_relata_private_locations'::regclass,
    'public.comun_relata_cases'::regclass,
    'public.comun_relata_consents'::regclass,
    'public.comun_relata_status_events'::regclass,
    'public.comun_relata_public_snapshots'::regclass
  )
`);
assert.deepEqual(security.rows[0], { protected_tables: 6, total_tables: 6 });

const definerSearchPaths = await postgres.query(`
  select count(*)::int as count
  from pg_proc
  where proname like 'comun_relata_%'
    and prosecdef
    and coalesce(array_to_string(proconfig, ','), '') not like '%search_path=""%'
    and coalesce(array_to_string(proconfig, ','), '') not like '%search_path=%'
`);
assert.equal(definerSearchPaths.rows[0].count, 0);

const grants = await postgres.query(`
  select count(*)::int as count
  from information_schema.role_table_grants
  where table_name like 'comun_relata_%'
    and grantee in ('PUBLIC','anon')
`);
assert.equal(grants.rows[0].count, 0);

const rpcGrants = await postgres.query(`
  select
    count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as anon,
    count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as authenticated,
    count(*) filter (where has_function_privilege('service_role', p.oid, 'execute'))::int as service_role
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('comun_relata_create','comun_relata_get_receipt','comun_relata_withdraw')
`);
assert.deepEqual(rpcGrants.rows[0], {
  anon: 0,
  authenticated: 0,
  service_role: 3,
});

const withdrawal = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_withdraw($1,$2)", [
    firstCreate.rows[0].protocol,
    first.receiptSecret,
  ]),
);
assert.equal(withdrawal.rows[0].state, "withdrawn");
assert.equal(withdrawal.rows[0].timeline.length, 5);
const withdrawalAgain = await asRole("service_role", (client) =>
  client.query("select * from public.comun_relata_withdraw($1,$2)", [
    firstCreate.rows[0].protocol,
    first.receiptSecret,
  ]),
);
assert.equal(withdrawalAgain.rows[0].timeline.length, 5);

const persistedInvariant = await postgres.query(`
  select count(*)::int as invalid
  from public.comun_relata_cases
  where protocol_kind <> 'comun' or is_official or official_protocol is not null
`);
assert.equal(persistedInvariant.rows[0].invalid, 0);
await postgres.end();

console.log(
  JSON.stringify({
    result: "COMUN_RELATA_LOCAL_PERSISTENCE_GREEN",
    roles: ["PUBLIC", "anon", "authenticated", "admin", "non_admin", "service_role"],
    idempotency: ["sequential", "concurrent", "payload_conflict"],
    privacy: "no_private_values_emitted",
    remote: "not_contacted",
  }),
);
