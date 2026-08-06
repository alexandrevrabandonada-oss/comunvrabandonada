import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";

const url = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? process.env.PR23_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(url)) {
  throw new Error("COMUN_R2A_LOCAL_DATABASE_REQUIRED");
}

const { Client } = pg;
const proof = () => crypto.randomBytes(32).toString("base64url");
async function withRole(role, fn) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

const idempotency = proof();
const receiptSecret = proof();
const created = await withRole("service_role", (client) =>
  client.query(
    "select * from public.comun_relata_create($1,$2,$3,$4::jsonb,$5,$6,$7,$8::jsonb,$9,$10)",
    [idempotency, receiptSecret, "A calçada está totalmente bloqueada por entulho", "{}", "sidewalk_accessibility", "attention", "relata-routing-v1", "{}", "restricted", "relata-consent-v1"],
  ),
);
assert.equal(created.rowCount, 1);
assert.equal(created.rows[0].state, "stored_private");
assert.match(created.rows[0].protocol, /^COMUN-RELATA-[A-F0-9]{16}$/);
const receipt = await withRole("service_role", (client) =>
  client.query("select * from public.comun_relata_get_receipt($1,$2)", [created.rows[0].protocol, receiptSecret]),
);
assert.equal(receipt.rows[0].timeline.length, 4);
const withdrawn = await withRole("service_role", (client) =>
  client.query("select * from public.comun_relata_withdraw($1,$2)", [created.rows[0].protocol, receiptSecret]),
);
assert.equal(withdrawn.rows[0].state, "withdrawn");

await assert.rejects(
  withRole("anon", (client) => client.query("select count(*) from private.comun_relata_reports")),
  /permission denied/,
);
await assert.rejects(
  withRole("authenticated", (client) => client.query("select count(*) from public.comun_relata_cases")),
  /permission denied/,
);

const client = new Client({ connectionString: url });
await client.connect();
const security = await client.query(`
  select count(*) filter (where c.relrowsecurity and c.relforcerowsecurity)::int as protected, count(*)::int as total
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where (n.nspname='private' and c.relname in ('comun_relata_reports','comun_relata_private_locations','comun_relata_attachments','comun_participation_wallets','comun_participation_wallet_items','comun_participation_wallet_events','comun_participation_wallet_recovery_credentials','comun_participation_wallet_rate_limits','comun_participation_wallet_account_links'))
     or (n.nspname='public' and c.relname in ('comun_relata_cases','comun_relata_public_snapshots','comun_relata_consents','comun_relata_status_events','comun_relata_evidence_consents'))
`);
assert.deepEqual(security.rows[0], { protected: 14, total: 14 });
const grants = await client.query("select count(*)::int as count from information_schema.role_table_grants where grantee in ('PUBLIC','anon','authenticated') and table_name in ('comun_relata_reports','comun_relata_cases','comun_relata_public_snapshots','comun_participation_wallets')");
assert.equal(grants.rows[0].count, 0);
const bucket = await client.query("select public,file_size_limit,allowed_mime_types from storage.buckets where id='comun-relata-private'");
assert.deepEqual({ ...bucket.rows[0], file_size_limit: Number(bucket.rows[0].file_size_limit) }, { public: false, file_size_limit: 8388608, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] });
await client.end();

console.log(JSON.stringify({ result: "COMUN_48_1B_R2A_CORE_LOCAL_GREEN", relata: "create_receipt_withdraw", timeline: 4, rls: "14/14", publicCrud: "blocked", storage: "private_8mb_allowlisted", remote: "not_contacted" }));
