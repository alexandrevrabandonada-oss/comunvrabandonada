import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const base = (
  process.env.COMUN_BASE_URL ?? "https://comunsocial.online"
).replace(/\/$/, "");
const dbUrl = process.env.SUPABASE_DB_URL ?? "";
const runMarker = process.env.ATTEMPT_ID ?? `P6BB-SMOKE-${randomUUID()}`;

if (!/^https:\/\//.test(base))
  throw new Error("COMUN_P6B_B_PRODUCTION_HTTPS_REQUIRED");
if (!/^postgres(?:ql)?:\/\//.test(dbUrl))
  throw new Error("COMUN_P6B_B_CURRENT_DB_SECRET_REQUIRED");
if (!/^P6BB-SMOKE-[A-Za-z0-9._:-]{8,180}$/.test(runMarker))
  throw new Error("COMUN_P6B_B_ATTEMPT_ID_INVALID");

const proof = () => randomBytes(32).toString("base64url");
const db = new pg.Client({ connectionString: dbUrl });
const fixtures = [];
let externalRequests = 0;

class Jar {
  values = new Map();
  header() {
    return [...this.values]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
  absorb(response) {
    const values =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie") ?? ""];
    for (const value of values) {
      for (const part of value.split(/,(?=[^;,]+=)/)) {
        const pair = part.split(";", 1)[0];
        const separator = pair.indexOf("=");
        if (separator > 0)
          this.values.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    }
  }
}

async function request(path, init, jar) {
  const url = `${base}${path}`;
  if (!url.startsWith(`${base}/`)) {
    externalRequests += 1;
    throw new Error("COMUN_P6B_B_EXTERNAL_REQUEST_REFUSED");
  }
  const headers = new Headers(init?.headers);
  if (jar?.header()) headers.set("cookie", jar.header());
  const response = await fetch(url, { ...init, headers });
  jar?.absorb(response);
  return response;
}

async function capture(label, text, expectedCategory, expectedUrgency) {
  const jar = new Jar();
  const response = await request(
    "/api/comun/relata",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `${text} TESTE SINTETICO PRIVADO ${runMarker}-${label}.`,
        answers: {},
        hasPhoto: false,
        captureMode: "quick_v2",
        idempotencyKey: proof(),
        receiptSecret: proof(),
      }),
    },
    jar,
  );
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, 201, `${label}:capture_failed`);
  assert.equal(body.receipt?.category, expectedCategory, `${label}:category`);
  assert.equal(body.receipt?.urgency, expectedUrgency, `${label}:urgency`);
  assert.equal(body.noOfficialSend, true, `${label}:send_contract`);
  assert.ok(body.walletItemId, `${label}:wallet_item`);
  fixtures.push({
    label,
    jar,
    protocol: body.receipt.protocol,
    walletItemId: body.walletItemId,
  });
}

async function rowsForProtocols() {
  if (!fixtures.length) return [];
  return (
    await db.query(
      `select c.protocol,c.category,c.urgency,c.state case_state,
              c.withdrawn_at case_withdrawn_at,r.withdrawn_at report_withdrawn_at,
              r.retention_class,wi.id wallet_item_id,wi.wallet_id,
              wi.archived_at wallet_item_archived_at,w.status wallet_status,
              (select count(*)::int from private.comun_participation_wallet_items x where x.wallet_id=w.id) wallet_item_total,
              (select count(*)::int from private.comun_participation_wallet_account_links x where x.wallet_id=w.id and x.revoked_at is null) account_link_count,
              (select count(*)::int from private.comun_forwarding_packages p where p.relata_case_id=c.id and p.withdrawn_at is null) active_package_count,
              (select count(*)::int from private.comun_forwarding_attempts a join private.comun_forwarding_packages p on p.id=a.package_id where p.relata_case_id=c.id and p.withdrawn_at is null and a.state<>'abandoned') active_attempt_count,
              (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshot_count
         from public.comun_relata_cases c
         join private.comun_relata_reports r on r.id=c.report_id
         left join private.comun_participation_wallet_items wi on wi.subject_ref=c.id::text and wi.item_type='relata_report'
         left join private.comun_participation_wallets w on w.id=wi.wallet_id
        where c.protocol=any($1::text[])
        order by c.protocol`,
      [fixtures.map((item) => item.protocol)],
    )
  ).rows;
}

async function archiveExclusiveWallet(row) {
  if (
    !row.wallet_id ||
    !row.wallet_item_id ||
    row.wallet_item_total !== 1 ||
    row.account_link_count !== 0
  )
    throw new Error("COMUN_P6B_B_CLEANUP_WALLET_NOT_EXCLUSIVELY_SYNTHETIC");
  await db.query(
    "update private.comun_participation_wallet_items set archived_at=coalesce(archived_at,now()),updated_at=now() where id=$1",
    [row.wallet_item_id],
  );
  await db.query(
    "insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values($1,$2,'item_archived','P6BB_SYNTHETIC_FIXTURE_CLEANUP')",
    [row.wallet_id, row.wallet_item_id],
  );
  await db.query(
    "update private.comun_participation_wallet_recovery_credentials set active=false,revoked_at=coalesce(revoked_at,now()) where wallet_id=$1 and active",
    [row.wallet_id],
  );
  await db.query(
    "update private.comun_participation_wallets set status='revoked',revoked_at=coalesce(revoked_at,now()) where id=$1",
    [row.wallet_id],
  );
}

async function softCleanup() {
  for (const fixture of fixtures) {
    const response = await request(
      "/api/comun/relata/receipt",
      { method: "DELETE" },
      fixture.jar,
    );
    assert.equal(response.status, 200, `${fixture.label}:withdraw_failed`);
  }
  await db.query("begin");
  try {
    const rows = await rowsForProtocols();
    assert.equal(rows.length, fixtures.length);
    for (const row of rows) await archiveExclusiveWallet(row);
    await db.query("commit");
  } catch (error) {
    await db.query("rollback").catch(() => {});
    throw error;
  }
}

async function postflight() {
  const rows = await rowsForProtocols();
  return {
    activeSyntheticReports: rows.filter(
      (row) => !row.report_withdrawn_at && row.retention_class !== "withdrawn",
    ).length,
    activeSyntheticCases: rows.filter(
      (row) => !row.case_withdrawn_at && row.case_state !== "withdrawn",
    ).length,
    activeSyntheticWalletItems: rows.filter(
      (row) => row.wallet_item_id && !row.wallet_item_archived_at,
    ).length,
    activeSyntheticWallets: rows.filter((row) => row.wallet_status === "active")
      .length,
    activeSyntheticPackages: rows.reduce(
      (sum, row) => sum + Number(row.active_package_count ?? 0),
      0,
    ),
    activeSyntheticAttempts: rows.reduce(
      (sum, row) => sum + Number(row.active_attempt_count ?? 0),
      0,
    ),
    publicSnapshots: rows.reduce(
      (sum, row) => sum + Number(row.snapshot_count ?? 0),
      0,
    ),
    collectives: 0,
    externalSends: 0,
    externalRequests,
    hardDeletes: 0,
  };
}

await db.connect();
let smokeError;
try {
  await capture(
    "flood",
    "A rua está alagada e a água está subindo.",
    "urban_flooding",
    "urgent",
  );
  await capture(
    "drainage",
    "O bueiro está entupido.",
    "stormwater_drainage",
    "attention",
  );
  await capture(
    "tree",
    "Uma árvore caiu no meio da rua.",
    "tree_hazard",
    "attention",
  );
  await capture(
    "electrical",
    "Um galho caiu na fiação e tem faísca.",
    "electrical_hazard",
    "emergency",
  );
  const rows = await rowsForProtocols();
  assert.equal(rows.length, 4);
  assert.ok(rows.every((row) => row.active_package_count === 0));
  assert.ok(rows.every((row) => row.active_attempt_count === 0));
  assert.ok(rows.every((row) => row.snapshot_count === 0));
} catch (error) {
  smokeError = error;
} finally {
  try {
    if (fixtures.length) await softCleanup();
  } catch (error) {
    smokeError ??= error;
  }
}

const after = await postflight();
await db.end().catch(() => {});
assert.deepEqual(after, {
  activeSyntheticReports: 0,
  activeSyntheticCases: 0,
  activeSyntheticWalletItems: 0,
  activeSyntheticWallets: 0,
  activeSyntheticPackages: 0,
  activeSyntheticAttempts: 0,
  publicSnapshots: 0,
  collectives: 0,
  externalSends: 0,
  externalRequests: 0,
  hardDeletes: 0,
});
if (smokeError) throw smokeError;

console.log(
  JSON.stringify({
    result: "COMUN_P6B_B_URBAN_INCIDENTS_WAVE1_PRODUCTION_GREEN",
    fixtures: fixtures.length,
    forwarding: "schema_extension_deferred_off",
    ...after,
  }),
);
