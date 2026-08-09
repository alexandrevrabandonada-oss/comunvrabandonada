import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const base = (
  process.env.COMUN_BASE_URL ?? "https://comunsocial.online"
).replace(/\/$/, "");
const dbUrl = process.env.SUPABASE_DB_URL ?? "";
const mode = process.env.P6A_SMOKE_MODE ?? "";
const runMarker = process.env.ATTEMPT_ID ?? `P6A-SMOKE-${randomUUID()}`;
if (!/^https:\/\//.test(base))
  throw new Error("COMUN_P6A_PRODUCTION_HTTPS_REQUIRED");
if (!/^postgres(?:ql)?:\/\//.test(dbUrl))
  throw new Error("COMUN_P6A_CURRENT_DB_SECRET_REQUIRED");
if (!new Set(["wave1", "wave2"]).has(mode))
  throw new Error("COMUN_P6A_SMOKE_MODE_INVALID");
if (!/^P6A-SMOKE-[A-Za-z0-9._:-]{8,180}$/.test(runMarker))
  throw new Error("COMUN_P6A_ATTEMPT_ID_INVALID");

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
    throw new Error("COMUN_P6A_EXTERNAL_REQUEST_REFUSED");
  }
  const headers = new Headers(init?.headers);
  if (jar?.header()) headers.set("cookie", jar.header());
  const response = await fetch(url, { ...init, headers });
  jar?.absorb(response);
  return response;
}

async function capture(label, text, answers = {}) {
  const jar = new Jar();
  const response = await request(
    "/api/comun/relata",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `${text} Referência sintética ${runMarker}-${label}.`,
        answers,
        hasPhoto: false,
        captureMode: "quick_v2",
        idempotencyKey: proof(),
        receiptSecret: proof(),
      }),
    },
    jar,
  );
  const body = await response.json().catch(() => ({}));
  assert.equal(response.status, 201, `${label}:${JSON.stringify(body)}`);
  assert.ok(body.walletItemId);
  assert.equal(body.noOfficialSend, true);
  const fixture = {
    label,
    jar,
    protocol: body.receipt.protocol,
    category: body.receipt.category,
    walletItemId: body.walletItemId,
    walletToken: jar.values.get("comun_participation_wallet_v1"),
    packageId: null,
  };
  assert.ok(fixture.walletToken);
  fixtures.push(fixture);
  return fixture;
}

async function rowsForProtocols() {
  if (!fixtures.length) return [];
  const protocols = fixtures.map((item) => item.protocol);
  return (
    await db.query(
      `select c.protocol,c.id case_id,c.state case_state,c.withdrawn_at case_withdrawn_at,
              r.id report_id,r.withdrawn_at report_withdrawn_at,r.retention_class,
              wi.id wallet_item_id,wi.wallet_id,wi.archived_at wallet_item_archived_at,
              w.status wallet_status,w.revoked_at wallet_revoked_at,
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
      [protocols],
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
    throw new Error("COMUN_P6A_CLEANUP_WALLET_NOT_EXCLUSIVELY_SYNTHETIC");
  await db.query(
    "update private.comun_participation_wallet_items set archived_at=coalesce(archived_at,now()),updated_at=now() where id=$1",
    [row.wallet_item_id],
  );
  await db.query(
    "insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values($1,$2,'item_archived','P6A_SYNTHETIC_FIXTURE_CLEANUP')",
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
    if (fixture.packageId) {
      const walletHash = createHash("sha256")
        .update(`comun-wallet-v1:${fixture.walletToken}`)
        .digest("hex");
      const withdrawn = await db.query(
        "select public.comun_assisted_forwarding_withdraw($1,$2) withdrawn",
        [walletHash, fixture.packageId],
      );
      assert.equal(withdrawn.rows[0].withdrawn, true);
    }
    const response = await request(
      "/api/comun/relata/receipt",
      { method: "DELETE" },
      fixture.jar,
    );
    assert.equal(response.status, 200);
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
  if (mode === "wave1") {
    const water = await capture("water", "Estamos sem água desde ontem");
    const energy = await capture("energy", "O bairro está sem energia");
    const lighting = await capture("lighting", "O poste está apagado");
    const ambiguity = await capture("ambiguity", "A rua inteira está sem luz", {
      homes_power: "nao",
    });
    assert.deepEqual(
      [water.category, energy.category, lighting.category, ambiguity.category],
      [
        "water_supply",
        "power_distribution",
        "public_lighting",
        "public_lighting",
      ],
    );
    for (const fixture of fixtures) {
      assert.equal(
        (
          await request(
            `/api/comun/essential-services/packages/${fixture.walletItemId}`,
            {},
            fixture.jar,
          )
        ).status,
        404,
      );
    }
    assert.ok(
      (await rowsForProtocols()).every((row) => row.active_package_count === 0),
    );
  } else {
    const water = await capture("forwarding", "Estamos sem água desde ontem");
    assert.equal(water.category, "water_supply");
    const prepared = await request(
      `/api/comun/essential-services/packages/${water.walletItemId}/prepare`,
      { method: "POST" },
      water.jar,
    );
    const preparedBody = await prepared.json().catch(() => ({}));
    assert.equal(prepared.status, 201, JSON.stringify(preparedBody));
    assert.equal(preparedBody.package.category, "water_supply");
    assert.equal(preparedBody.channels[0].institution, "SAAE Volta Redonda");
    water.packageId = preparedBody.package.package_id;
    const opened = await request(
      `/api/comun/essential-services/packages/${water.walletItemId}/${water.packageId}/open`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channelId: "saaevr-115" }),
      },
      water.jar,
    );
    const openedBody = await opened.json().catch(() => ({}));
    assert.equal(opened.status, 200, JSON.stringify(openedBody));
    assert.equal(openedBody.destination, "tel:115");
    assert.equal(openedBody.attempt.attempt_state, "prepared");
    const state = await db.query(
      "select a.state,(select count(*)::int from private.comun_forwarding_events e where e.package_id=$1 and e.event_type='person_declared_sent') declared_events from private.comun_forwarding_attempts a where a.package_id=$1",
      [water.packageId],
    );
    assert.equal(state.rows.length, 1);
    assert.equal(state.rows[0].state, "prepared");
    assert.equal(state.rows[0].declared_events, 0);
  }
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
    result:
      mode === "wave1"
        ? "COMUN_P6A_ESSENTIAL_SERVICES_WAVE1_PRODUCTION_GREEN"
        : "COMUN_P6A_ESSENTIAL_FORWARDING_WAVE2_PRODUCTION_GREEN",
    mode,
    fixtures: fixtures.length,
    preparedNeverSent: mode === "wave2",
    ...after,
  }),
);
