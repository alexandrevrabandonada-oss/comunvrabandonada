import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl)) {
  throw new Error("COMUN_R2A_WALLET_ACCOUNT_FIX_LOCAL_DATABASE_REQUIRED");
}

const hash = (value) => createHash("sha256").update(`comun-wallet-v1:${value}`).digest("hex");
const normalizePgTextArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) return value;
  const body = value.slice(1, -1);
  return body === "" ? [] : body.split(",").map((entry) => entry.replace(/^"|"$/g, ""));
};
const client = new pg.Client({ connectionString: dbUrl });
const walletToken = randomBytes(32).toString("base64url");
const walletHash = hash(walletToken);
const walletId = randomUUID();
const userId = randomUUID();

await client.connect();
try {
  await client.query("begin");
  const constraint = await client.query(`
    select c.conname, c.contype, array_agg(a.attname order by k.ordinality) as columns
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    join unnest(c.conkey) with ordinality as k(attnum, ordinality) on true
    join pg_attribute a on a.attrelid = r.oid and a.attnum = k.attnum
    where n.nspname = 'private'
      and r.relname = 'comun_participation_wallet_account_links'
      and c.conname = 'comun_participation_wallet_account_links_wallet_id_user_id_key'
    group by c.conname, c.contype
  `);
  assert.equal(constraint.rows.length, 1);
  assert.equal(constraint.rows[0].contype, "u");
  assert.deepEqual(normalizePgTextArray(constraint.rows[0].columns), ["wallet_id", "user_id"]);

  await client.query(
    `insert into private.comun_participation_wallets (id, token_hash, status)
     values ($1, decode($2,'hex'), 'active')`,
    [walletId, walletHash],
  );

  const call = async (token = walletHash, uid = userId, method = "explicit_account_link") => {
    const { rows } = await client.query(
      "select * from public.comun_participation_wallet_link_account($1,$2,$3)",
      [token, uid, method],
    );
    return rows;
  };
  await client.query("set local role service_role");
  const linked = await call();
  assert.deepEqual(linked, [{ wallet_id: walletId, linked: true }]);
  assert.deepEqual(await call(), [{ wallet_id: walletId, linked: true }]);
  const count = await client.query(
    "select count(*)::int as count from private.comun_participation_wallet_account_links where wallet_id=$1 and user_id=$2 and revoked_at is null",
    [walletId, userId],
  );
  assert.equal(count.rows[0].count, 1);
  await client.query("update private.comun_participation_wallet_account_links set revoked_at=now() where wallet_id=$1 and user_id=$2", [walletId, userId]);
  assert.deepEqual(await call(), [{ wallet_id: walletId, linked: true }]);
  assert.equal((await client.query("select revoked_at is null as active from private.comun_participation_wallet_account_links where wallet_id=$1 and user_id=$2", [walletId, userId])).rows[0].active, true);
  assert.deepEqual(await call("0".repeat(64)), []);
  assert.deepEqual(await call(walletHash, null), []);
  assert.deepEqual(await call(walletHash, userId, "invalid"), []);

  await client.query("rollback");
  await client.query("begin");
  await client.query("set local role anon");
  await assert.rejects(call(), (error) => error?.code === "42501");
  await client.query("rollback");
  await client.query("begin");
  await client.query("set local role authenticated");
  await assert.rejects(call(), (error) => error?.code === "42501");
  await client.query("rollback");
  console.log(JSON.stringify({ result: "COMUN_WALLET_ACCOUNT_LINK_RPC_FORWARD_FIX_GREEN", constraint: "exact_unique_wallet_id_user_id", duplicate: "idempotent", revokedRelinked: true, remote: "not_contacted" }));
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
