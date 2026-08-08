import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "https://comunsocial.online").replace(/\/$/, "");
const dbUrl = process.env.SUPABASE_DB_URL ?? "";
const attemptId = process.env.ATTEMPT_ID ?? `P5-SMOKE-${process.env.RUN_ID ?? "manual"}-${randomUUID()}`;
const recoverOnly = process.argv.includes("--recover");
const markerHash = createHash("sha256").update(attemptId).digest("hex");

if (!/^https:\/\//.test(base)) throw new Error("COMUN_P5_PRODUCTION_HTTPS_REQUIRED");
if (!/^postgres(?:ql)?:\/\//.test(dbUrl)) throw new Error("COMUN_P5_CURRENT_DB_SECRET_REQUIRED");
if (!/^P5-SMOKE-[A-Za-z0-9._:-]{8,180}$/.test(attemptId)) throw new Error("COMUN_P5_ATTEMPT_ID_INVALID");

const db = new pg.Client({ connectionString: dbUrl });
let cookie = "";

function absorbCookie(response) {
  const value = response.headers.get("set-cookie") ?? "";
  for (const part of value.split(/,(?=[^;]+=)/)) {
    const pair = part.split(";", 1)[0];
    if (/^[^=]+=/.test(pair)) cookie = cookie ? `${cookie}; ${pair}` : pair;
  }
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  absorbCookie(response);
  return response;
}

async function fixtureRows(client, { lock = false } = {}) {
  return client.query(
    `select r.id report_id,c.id case_id,c.state case_state,c.withdrawn_at case_withdrawn_at,
            r.withdrawn_at report_withdrawn_at,r.retention_class,
            b.id bus_id,b.state bus_state,b.withdrawn_at bus_withdrawn_at,
            wi.id wallet_item_id,wi.wallet_id,wi.archived_at wallet_item_archived_at,
            w.status wallet_status,w.revoked_at wallet_revoked_at,
            (select count(*)::int from private.comun_participation_wallet_items x where x.wallet_id=w.id) wallet_item_total,
            (select count(*)::int from private.comun_participation_wallet_account_links x where x.wallet_id=w.id and x.revoked_at is null) account_link_count,
            (select count(*)::int from private.comun_participation_wallet_recovery_credentials x where x.wallet_id=w.id and x.active and x.revoked_at is null) active_recovery_count,
            (select count(*)::int from private.comun_forwarding_packages p where p.relata_case_id=c.id and p.withdrawn_at is null) forwarding_count,
            (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshot_count
       from private.comun_relata_reports r
       join public.comun_relata_cases c on c.report_id=r.id
       join private.comun_bus_relata_intakes b on b.report_id=r.id
       left join private.comun_participation_wallet_items wi on wi.subject_ref=c.id::text and wi.item_type='relata_report'
       left join private.comun_participation_wallets w on w.id=wi.wallet_id
      where position($1 in r.original_text)>0
      order by r.created_at desc${lock ? " for update of r,c,b" : ""}`,
    [attemptId],
  );
}

async function revokeExclusiveWallet(client, row) {
  if (!row.wallet_id || !row.wallet_item_id || row.wallet_item_total !== 1 || row.account_link_count !== 0) {
    throw new Error("COMUN_P5_CLEANUP_WALLET_NOT_EXCLUSIVELY_SYNTHETIC");
  }
  await client.query("select id from private.comun_participation_wallets where id=$1 for update", [row.wallet_id]);
  await client.query("select id from private.comun_participation_wallet_items where id=$1 for update", [row.wallet_item_id]);
  await client.query("update private.comun_participation_wallet_items set archived_at=coalesce(archived_at,now()),updated_at=now() where id=$1", [row.wallet_item_id]);
  await client.query("insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values($1,$2,'item_archived','P5_SYNTHETIC_FIXTURE_CLEANUP')", [row.wallet_id, row.wallet_item_id]);
  await client.query("update private.comun_participation_wallet_recovery_credentials set active=false,revoked_at=coalesce(revoked_at,now()) where wallet_id=$1 and active", [row.wallet_id]);
  await client.query("update private.comun_participation_wallets set status='revoked',revoked_at=coalesce(revoked_at,now()) where id=$1", [row.wallet_id]);
}

async function softRecover(client) {
  await client.query("begin");
  try {
    const found = await fixtureRows(client, { lock: true });
    if (found.rows.length !== 1) throw new Error("COMUN_P5_RECOVERY_FIXTURE_NOT_UNIQUE");
    const row = found.rows[0];
    if (row.forwarding_count !== 0 || row.snapshot_count !== 0) throw new Error("COMUN_P5_RECOVERY_BOUNDARY_CHANGED");
    await client.query("update private.comun_bus_relata_intakes set state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now()),updated_at=now() where id=$1", [row.bus_id]);
    await client.query("update public.comun_relata_cases set state='withdrawn',withdrawn_at=coalesce(withdrawn_at,now()),updated_at=now() where id=$1", [row.case_id]);
    await client.query("update private.comun_relata_reports set withdrawn_at=coalesce(withdrawn_at,now()),retention_class='withdrawn',updated_at=now() where id=$1", [row.report_id]);
    await client.query("insert into public.comun_relata_status_events(case_id,state,actor,result_code) values($1,'withdrawn','system_local','P5_PRODUCTION_SMOKE_RECOVERY')", [row.case_id]);
    await revokeExclusiveWallet(client, row);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function postflight(client) {
  const result = await fixtureRows(client);
  const rows = result.rows;
  return {
    candidates: rows.length,
    activeReport: rows.filter((row) => !row.report_withdrawn_at && row.retention_class !== "withdrawn").length,
    activeCase: rows.filter((row) => !row.case_withdrawn_at && row.case_state !== "withdrawn").length,
    activeBus: rows.filter((row) => !row.bus_withdrawn_at && row.bus_state !== "withdrawn").length,
    activeWalletItem: rows.filter((row) => row.wallet_item_id && !row.wallet_item_archived_at).length,
    activeWallet: rows.filter((row) => row.wallet_id && row.wallet_status === "active").length,
    forwarding: rows.reduce((sum, row) => sum + Number(row.forwarding_count ?? 0), 0),
    snapshot: rows.reduce((sum, row) => sum + Number(row.snapshot_count ?? 0), 0),
    markerHash,
  };
}

async function smoke(client) {
  let created = false;
  let errorAfterCreate;
  try {
    const response = await request("/api/comun/onibus/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        issueType: "delay_or_not_passed",
        lineLabel: "",
        direction: "",
        vehicleOrder: "",
        observedAt: new Date().toISOString(),
        waitMinutes: 12,
        description: `Fixture sintética privada ${attemptId}`,
        idempotencyKey: randomBytes(32).toString("base64url"),
        receiptSecret: randomBytes(32).toString("base64url"),
      }),
    });
    const body = await response.json().catch(() => ({}));
    assert.equal(response.status, 201, `create_status=${response.status}`);
    assert.equal(body.intakeReady, true);
    assert.equal(body.noOfficialSend, true);
    assert.equal(body.nothingPublished, true);
    assert.equal(body.receipt?.category, "public_transport");
    created = true;
    const rows = await fixtureRows(client);
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].bus_state, "ready_for_forwarding");
    assert.equal(rows.rows[0].wallet_item_total, 1);
    assert.equal(rows.rows[0].account_link_count, 0);
    assert.equal(rows.rows[0].forwarding_count, 0);
    assert.equal(rows.rows[0].snapshot_count, 0);
  } catch (error) {
    errorAfterCreate = error;
  } finally {
    if (created) {
      const withdrawn = await request("/api/comun/onibus/intake", { method: "DELETE" }).catch(() => null);
      if (!withdrawn || withdrawn.status !== 200) errorAfterCreate ??= new Error("COMUN_P5_CANONICAL_WITHDRAW_FAILED");
      await client.query("begin");
      try {
        const found = await fixtureRows(client, { lock: true });
        if (found.rows.length !== 1) throw new Error("COMUN_P5_CLEANUP_FIXTURE_NOT_UNIQUE");
        await revokeExclusiveWallet(client, found.rows[0]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => {});
        errorAfterCreate ??= error;
      }
    }
  }
  if (errorAfterCreate) throw errorAfterCreate;
  const after = await postflight(client);
  assert.deepEqual(
    { activeReport: after.activeReport, activeCase: after.activeCase, activeBus: after.activeBus, activeWalletItem: after.activeWalletItem, activeWallet: after.activeWallet, forwarding: after.forwarding, snapshot: after.snapshot },
    { activeReport: 0, activeCase: 0, activeBus: 0, activeWalletItem: 0, activeWallet: 0, forwarding: 0, snapshot: 0 },
  );
  return { result: "COMUN_P5A_PRODUCTION_PRIVATE_BUS_GREEN", ...after, category: "public_transport", hardDeletes: 0, automaticSend: false };
}

await db.connect();
try {
  if (recoverOnly) {
    await softRecover(db);
    const after = await postflight(db);
    if (after.activeReport || after.activeCase || after.activeBus || after.activeWalletItem || after.activeWallet || after.forwarding || after.snapshot) throw new Error("COMUN_P5_RECOVERY_POSTFLIGHT_FAILED");
    console.log(JSON.stringify({ result: "COMUN_P5_PRODUCTION_RECOVERY_SOFT_WITHDRAW_GREEN", ...after, hardDeletes: 0 }));
  } else {
    console.log(JSON.stringify(await smoke(db)));
  }
} finally {
  await db.end().catch(() => {});
}
