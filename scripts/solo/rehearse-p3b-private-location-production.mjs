import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "https://comunsocial.online").replace(/\/$/, "");
const dbUrl = process.env.SUPABASE_DB_URL ?? "";
const runId = process.env.RUN_ID ?? "unknown";
const mode = process.argv.includes("--recover") ? "recover" : "smoke";
const attemptId = process.env.ATTEMPT_ID || `P3B-SMOKE-${runId}-${randomUUID()}`;
const syntheticPoint = { longitude: -44.100123, latitude: -22.520123 };
const fixtureText = `A calçada está totalmente bloqueada por entulho e impede a passagem. ${attemptId}`;

if (!/^https:\/\//i.test(base)) throw new Error("COMUN_P3B_PRODUCTION_HTTPS_REQUIRED");
if (!/^postgres(?:ql)?:\/\//.test(dbUrl)) throw new Error("COMUN_P3B_CURRENT_DB_SECRET_REQUIRED");
if (!/^P3B-SMOKE-[A-Za-z0-9._:-]{8,180}$/.test(attemptId)) throw new Error("COMUN_P3B_ATTEMPT_ID_INVALID");

const markerHash = createHash("sha256").update(attemptId).digest("hex");
const db = new pg.Client({ connectionString: dbUrl });
let cookie = "";
let created = false;

function absorbCookie(response) {
  const raw = response.headers.get("set-cookie") ?? "";
  for (const part of raw.split(/,(?=[^;]+=)/)) {
    const pair = part.split(";", 1)[0];
    if (/^[^=]+=/.test(pair)) cookie = cookie ? `${cookie}; ${pair}` : pair;
  }
}

async function request(path, init = {}, suppliedCookie = cookie) {
  const headers = new Headers(init.headers);
  if (suppliedCookie) headers.set("cookie", suppliedCookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  absorbCookie(response);
  return response;
}

async function queryFixture(client, text = fixtureText) {
  return client.query(
    `select
       r.id as report_id,
       c.id as case_id,
       c.protocol,
       c.state,
       c.withdrawn_at as case_withdrawn_at,
       r.withdrawn_at as report_withdrawn_at,
       r.retention_class,
       l.id as location_id,
       l.evidence_state,
       l.withdrawn_at as location_withdrawn_at,
       (select count(*)::int from private.comun_relata_attachments a where a.report_id=r.id) as attachment_count,
       (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) as public_snapshot_count,
       (select count(*)::int from private.comun_participation_wallet_items i where i.subject_ref=c.id::text and i.archived_at is null) as wallet_item_count
     from private.comun_relata_reports r
     join public.comun_relata_cases c on c.report_id=r.id
     left join private.comun_relata_private_locations l on l.report_id=r.id
     where r.original_text=$1
     order by r.created_at desc`,
    [text],
  );
}

async function postflight(client) {
  const result = await queryFixture(client);
  const rows = result.rows;
  const activeLocation = rows.filter((row) => row.evidence_state === "added_private" && !row.location_withdrawn_at).length;
  const withdrawnLocation = rows.filter((row) => row.evidence_state === "withdrawn" && row.location_withdrawn_at).length;
  const activeCase = rows.filter((row) => row.state !== "withdrawn" && !row.case_withdrawn_at).length;
  const withdrawnCase = rows.filter((row) => row.state === "withdrawn" && row.case_withdrawn_at).length;
  const activeReport = rows.filter((row) => !row.report_withdrawn_at && row.retention_class !== "withdrawn").length;
  const activeWalletItem = rows.reduce((sum, row) => sum + Number(row.wallet_item_count ?? 0), 0);
  const reportWithdrawn = rows.filter((row) => row.retention_class === "withdrawn" && row.report_withdrawn_at).length;
  return {
    candidateCount: rows.length,
    activeLocation,
    withdrawnLocation,
    activeCase,
    withdrawnCase,
    activeReport,
    reportWithdrawn,
    activeWalletItem,
    attachmentCount: rows.reduce((sum, row) => sum + Number(row.attachment_count ?? 0), 0),
    publicSnapshotCount: rows.reduce((sum, row) => sum + Number(row.public_snapshot_count ?? 0), 0),
    markerHash,
  };
}

async function recover(client) {
  const before = await queryFixture(client);
  if (before.rows.length !== 1) throw new Error("COMUN_P3B_RECOVERY_FIXTURE_NOT_UNIQUE");
  await client.query("begin");
  try {
    const locked = await queryFixture(client);
    if (locked.rows.length !== 1) throw new Error("COMUN_P3B_RECOVERY_FIXTURE_NOT_UNIQUE");
    const row = locked.rows[0];
    if (row.attachment_count !== 0 || row.public_snapshot_count !== 0 || row.wallet_item_count !== 0) throw new Error("COMUN_P3B_RECOVERY_UNEXPECTED_RELATED_DATA");
    await client.query("update private.comun_relata_private_locations set evidence_state='withdrawn', withdrawn_at=coalesce(withdrawn_at, now()) where report_id=$1", [row.report_id]);
    await client.query("update public.comun_relata_cases set state='withdrawn', withdrawn_at=coalesce(withdrawn_at, now()), updated_at=now() where id=$1", [row.case_id]);
    await client.query("update private.comun_relata_reports set withdrawn_at=coalesce(withdrawn_at, now()), retention_class='withdrawn', updated_at=now() where id=$1", [row.report_id]);
    await client.query("insert into public.comun_relata_status_events(case_id,state,actor,result_code) values($1,'withdrawn','system_local','P3B_PRODUCTION_SMOKE_RECOVERY')", [row.case_id]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
  const after = await postflight(client);
  if (after.candidateCount !== 1 || after.activeLocation !== 0 || after.withdrawnLocation !== 1 || after.activeCase !== 0 || after.withdrawnCase !== 1 || after.activeReport !== 0 || after.reportWithdrawn !== 1 || after.activeWalletItem !== 0) throw new Error("COMUN_P3B_RECOVERY_POSTFLIGHT_FAILED");
  return { result: "COMUN_P3B_PRODUCTION_RECOVERY_GREEN", ...after, hardDeletes: 0, plaintextLocationRead: false };
}

async function smoke(client) {
  const secret = randomBytes(32).toString("base64url");
  const createdResponse = await request("/api/comun/relata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: fixtureText,
      answers: { blocked: "sim" },
      idempotencyKey: randomBytes(32).toString("base64url"),
      receiptSecret: secret,
    }),
  });
  const createdBody = await createdResponse.json().catch(() => ({}));
  if (createdResponse.status !== 201) {
    throw new Error(`COMUN_P3B_PRODUCTION_CREATE_FAILED:${createdResponse.status}:${typeof createdBody.code === "string" ? createdBody.code : "unknown"}`);
  }
  assert.equal(createdBody.noOfficialSend, true);
  assert.ok(createdBody.receipt?.protocol);
  created = true;
  let firstMetadata;
  let smokeError;
  try {
    const locationResponse = await request("/api/comun/relata/evidence/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...syntheticPoint, origin: "map_pin", accuracyMeters: null, capturedAt: "2026-08-08T12:00:00.000Z" }),
    });
    const locationBody = await locationResponse.text();
    if (locationResponse.status !== 200) throw new Error(`COMUN_P3B_PRODUCTION_LOCATION_FAILED:${locationResponse.status}`);
    assert.ok(!locationBody.includes(String(syntheticPoint.longitude)) && !locationBody.includes(String(syntheticPoint.latitude)));
    const active = await queryFixture(client);
    assert.equal(active.rows.length, 1, "COMUN_P3B_PRODUCTION_FIXTURE_NOT_UNIQUE");
    assert.equal(active.rows[0].evidence_state, "added_private");
    assert.equal(active.rows[0].state, "stored_private");
    assert.equal(active.rows[0].attachment_count, 0);
    assert.equal(active.rows[0].public_snapshot_count, 0);
    assert.equal(active.rows[0].wallet_item_count, 0);
    firstMetadata = (await client.query("select l.encrypted_value, l.nonce, l.auth_tag, l.origin, l.accuracy_class, l.captured_at, l.evidence_state, l.withdrawn_at as location_withdrawn_at from private.comun_relata_private_locations l join private.comun_relata_reports r on r.id=l.report_id where r.original_text=$1", [fixtureText])).rows[0];
    assert.equal(firstMetadata.evidence_state, "added_private");
    assert.equal(firstMetadata.location_withdrawn_at, null);

    const firstRead = await request("/api/comun/relata/evidence");
    const firstReadBody = await firstRead.text();
    if (firstRead.status !== 200) throw new Error(`COMUN_P3B_PRODUCTION_EVIDENCE_READ_FAILED:${firstRead.status}`);
    assert.ok(!firstReadBody.includes(String(syntheticPoint.longitude)) && !firstReadBody.includes(String(syntheticPoint.latitude)));

    const withdrawnFirst = await request("/api/comun/relata/evidence/location", { method: "DELETE" });
    assert.equal(withdrawnFirst.status, 200, "COMUN_P3B_PRODUCTION_LOCATION_WITHDRAW_FAILED");

    const readdedPoint = { longitude: -44.100223, latitude: -22.520223 };
    const readdedResponse = await request("/api/comun/relata/evidence/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...readdedPoint, origin: "device", accuracyMeters: 18, capturedAt: "2026-08-08T12:05:00.000Z" }),
    });
    const readdedBody = await readdedResponse.text();
    if (readdedResponse.status !== 200) throw new Error(`COMUN_P3B_PRODUCTION_LOCATION_READD_FAILED:${readdedResponse.status}`);
    assert.ok(!readdedBody.includes(String(readdedPoint.longitude)) && !readdedBody.includes(String(readdedPoint.latitude)));
    const secondMetadata = (await client.query("select l.encrypted_value, l.nonce, l.auth_tag, l.origin, l.accuracy_class, l.captured_at, l.evidence_state, l.withdrawn_at as location_withdrawn_at from private.comun_relata_private_locations l join private.comun_relata_reports r on r.id=l.report_id where r.original_text=$1", [fixtureText])).rows[0];
    assert.equal(secondMetadata.evidence_state, "added_private");
    assert.equal(secondMetadata.location_withdrawn_at, null);
    assert.notDeepEqual(secondMetadata.encrypted_value, firstMetadata.encrypted_value);
    assert.notDeepEqual(secondMetadata.nonce, firstMetadata.nonce);
    assert.notDeepEqual(secondMetadata.auth_tag, firstMetadata.auth_tag);
    assert.equal(secondMetadata.origin, "device");
    assert.equal(secondMetadata.accuracy_class, "under_25m");
    assert.equal(new Date(secondMetadata.captured_at).toISOString(), "2026-08-08T12:05:00.000Z");

    const secondRead = await request("/api/comun/relata/evidence");
    const secondReadBody = await secondRead.text();
    if (secondRead.status !== 200) throw new Error(`COMUN_P3B_PRODUCTION_EVIDENCE_READD_READ_FAILED:${secondRead.status}`);
    assert.ok(!secondReadBody.includes(String(readdedPoint.longitude)) && !secondReadBody.includes(String(readdedPoint.latitude)));
  } catch (error) {
    smokeError = error;
  } finally {
    if (created) {
      await request("/api/comun/relata/evidence/location", { method: "DELETE" }).catch(() => {});
      await request("/api/comun/relata/receipt", { method: "DELETE" }).catch(() => {});
    }
  }
  if (smokeError) throw smokeError;
  const after = await postflight(client);
  assert.equal(after.candidateCount, 1);
  assert.equal(after.activeLocation, 0);
  assert.equal(after.withdrawnLocation, 1);
  assert.equal(after.activeCase, 0);
  assert.equal(after.withdrawnCase, 1);
  assert.equal(after.activeReport, 0);
  assert.equal(after.reportWithdrawn, 1);
  assert.equal(after.activeWalletItem, 0);
  return { result: "COMUN_P3B_PRODUCTION_SYNTHETIC_CLEANUP_GREEN", ...after, f1ReaddExercised: true, hardDeletes: 0, plaintextLocationRead: false };
}

await db.connect();
try {
  const output = mode === "recover" ? await recover(db) : await smoke(db);
  console.log(JSON.stringify(output));
} finally {
  if (mode === "smoke" && created) {
    // The HTTP finally above is the primary cleanup. The always() workflow step is the crash recovery.
  }
  await db.end().catch(() => {});
}
