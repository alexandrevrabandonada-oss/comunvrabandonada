import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import pg from "pg";

const base = (
  process.env.COMUN_BASE_URL ?? "https://comunsocial.online"
).replace(/\/$/, "");
const dbUrl = process.env.SUPABASE_DB_URL ?? "";
const attemptId = process.env.ATTEMPT_ID ?? `F2-C1-SMOKE-${randomUUID()}`;
const recoveryFile = process.env.F2_C1_RECOVERY_FILE ?? "";
const mode = process.argv.includes("--recover") ? "recover" : "smoke";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const point = { longitude: -44.100511, latitude: -22.520511 };

if (!/^https:\/\//.test(base))
  throw new Error("COMUN_F2_C1_PRODUCTION_HTTPS_REQUIRED");
if (!/^postgres(?:ql)?:\/\//.test(dbUrl))
  throw new Error("COMUN_F2_C1_CURRENT_DB_SECRET_REQUIRED");
if (!/^F2-C1-SMOKE-[A-Za-z0-9._:-]{8,180}$/.test(attemptId))
  throw new Error("COMUN_F2_C1_ATTEMPT_ID_INVALID");

const db = new pg.Client({ connectionString: dbUrl });
const token = () => randomBytes(32).toString("base64url");
let cookie = "";
let protocol = "";
let attachmentId = "";

function persistRecoveryState() {
  if (!recoveryFile || !protocol) return;
  fs.writeFileSync(
    recoveryFile,
    JSON.stringify({ cookie, protocol, attachmentId }),
    { mode: 0o600 },
  );
  fs.chmodSync(recoveryFile, 0o600);
}

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

async function discoverPublicSupabaseKey() {
  const page = await fetch(
    `${base}/comun/calcadas/contribuir?__f2_c1_public_key_probe=1`,
    { headers: { "cache-control": "no-cache" } },
  );
  if (!page.ok) throw new Error("COMUN_F2_C1_PUBLIC_RUNTIME_UNAVAILABLE");
  const html = await page.text();
  const scripts = [
    ...html.matchAll(/<script[^>]+src=["']([^"']+\.js[^"']*)["']/g),
  ].map((match) => new URL(match[1], base).href);
  for (const script of scripts) {
    const response = await fetch(script);
    if (!response.ok) continue;
    const source = await response.text();
    const publishable = source.match(
      /sb_publishable_[A-Za-z0-9_-]{20,200}/,
    )?.[0];
    if (publishable) return publishable;
    for (const candidate of source.match(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    ) ?? []) {
      try {
        const payload = JSON.parse(
          Buffer.from(candidate.split(".")[1], "base64url").toString("utf8"),
        );
        if (payload.role === "anon") return candidate;
      } catch {}
    }
  }
  throw new Error("COMUN_F2_C1_PUBLIC_SUPABASE_KEY_NOT_DISCOVERABLE");
}

async function fixture(client) {
  if (!protocol) return { rows: [] };
  return client.query(
    `select c.id case_id,c.report_id,r.original_text,r.privacy_class,r.routing_decision,c.category,
            i.id intake_id,i.review_state,i.published_record_id,
            l.id location_id,l.evidence_state location_state,l.withdrawn_at location_withdrawn_at,
            a.id attachment_id,a.state attachment_state,a.withdrawn_at attachment_withdrawn_at,
            wi.id wallet_item_id,wi.wallet_id,wi.presentation_state,wi.archived_at wallet_item_archived_at,
            w.status wallet_status,
            (select count(*)::int from private.comun_participation_wallet_items x where x.wallet_id=w.id) wallet_item_total,
            (select count(*)::int from private.comun_participation_wallet_account_links x where x.wallet_id=w.id and x.revoked_at is null) account_link_count,
            (select count(*)::int from public.comun_relata_cases x where x.protocol=c.protocol) protocol_count,
            (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshots,
            (select count(*)::int from private.comun_forwarding_packages f where f.relata_case_id=c.id) forwarding
       from public.comun_relata_cases c
       join private.comun_relata_reports r on r.id=c.report_id
       left join private.comun_sidewalk_relata_intakes i on i.report_id=r.id
       left join private.comun_relata_private_locations l on l.report_id=r.id
       left join private.comun_relata_attachments a on a.report_id=r.id
       left join private.comun_participation_wallet_items wi on wi.subject_ref=c.id::text and wi.item_type='relata_report'
       left join private.comun_participation_wallets w on w.id=wi.wallet_id
      where c.protocol=$1`,
    [protocol],
  );
}

async function cleanupExactFixture(client) {
  const found = await fixture(client);
  if (found.rows.length === 0) return;
  const unique = new Map(found.rows.map((row) => [row.report_id, row]));
  assert.equal(unique.size, 1, "COMUN_F2_C1_CLEANUP_FIXTURE_NOT_UNIQUE");
  const row = [...unique.values()][0];
  const walletIds = [
    ...new Set(found.rows.map((item) => item.wallet_id).filter(Boolean)),
  ];
  if (walletIds.length) {
    assert.equal(walletIds.length, 1);
    assert.ok(
      found.rows.every(
        (item) => item.wallet_item_total === 1 && item.account_link_count === 0,
      ),
      "COMUN_F2_C1_CLEANUP_WALLET_NOT_EXCLUSIVE",
    );
  }
  await client.query("begin");
  try {
    await client.query(
      "delete from private.comun_sidewalk_relata_intakes where report_id=$1",
      [row.report_id],
    );
    await client.query(
      "delete from private.comun_relata_private_locations where report_id=$1",
      [row.report_id],
    );
    await client.query(
      "delete from private.comun_relata_attachments where report_id=$1",
      [row.report_id],
    );
    if (walletIds.length) {
      await client.query(
        "delete from private.comun_participation_wallet_events where wallet_id=any($1::uuid[])",
        [walletIds],
      );
      await client.query(
        "delete from private.comun_participation_wallet_account_links where wallet_id=any($1::uuid[])",
        [walletIds],
      );
      await client.query(
        "delete from private.comun_participation_wallet_recovery_credentials where wallet_id=any($1::uuid[])",
        [walletIds],
      );
      await client.query(
        "delete from private.comun_participation_wallet_items where wallet_id=any($1::uuid[])",
        [walletIds],
      );
      await client.query(
        "delete from private.comun_participation_wallets where id=any($1::uuid[])",
        [walletIds],
      );
    }
    await client.query(
      "alter table public.comun_relata_status_events disable trigger user",
    );
    try {
      await client.query(
        "delete from public.comun_relata_status_events where case_id=$1",
        [row.case_id],
      );
      await client.query(
        "delete from public.comun_relata_evidence_consents where case_id=$1",
        [row.case_id],
      );
      await client.query(
        "delete from public.comun_relata_consents where case_id=$1",
        [row.case_id],
      );
    } finally {
      await client.query(
        "alter table public.comun_relata_status_events enable trigger user",
      );
    }
    await client.query("delete from public.comun_relata_cases where id=$1", [
      row.case_id,
    ]);
    await client.query("delete from private.comun_relata_reports where id=$1", [
      row.report_id,
    ]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function storageObjectCount(client) {
  if (!attachmentId) return 0;
  const result = await client.query(
    "select count(*)::int count from storage.objects where bucket_id='comun-relata-private' and name in ('quarantine/'||$1::text||'.bin','sealed/'||$1::text||'.webp')",
    [attachmentId],
  );
  return result.rows[0].count;
}

async function recover(client) {
  if (recoveryFile && fs.existsSync(recoveryFile)) {
    const state = JSON.parse(fs.readFileSync(recoveryFile, "utf8"));
    cookie = typeof state.cookie === "string" ? state.cookie : "";
    protocol = typeof state.protocol === "string" ? state.protocol : "";
    attachmentId =
      typeof state.attachmentId === "string" ? state.attachmentId : "";
  }
  if (!protocol) throw new Error("COMUN_F2_C1_RECOVERY_STATE_MISSING");
  await request("/api/comun/relata/evidence/location", {
    method: "DELETE",
  }).catch(() => {});
  if (attachmentId)
    await request(`/api/comun/relata/evidence/attachments/${attachmentId}`, {
      method: "DELETE",
    }).catch(() => {});
  await cleanupExactFixture(client);
  assert.equal((await fixture(client)).rows.length, 0);
  assert.equal(await storageObjectCount(client), 0);
  if (recoveryFile) fs.rmSync(recoveryFile, { force: true });
  return {
    result: "COMUN_F2_C1_PRODUCTION_RECOVERY_GREEN",
    cleanup: "exact_fixture",
  };
}

async function smoke(client) {
  const payload = {
    phase: "capture",
    text: null,
    hasPhoto: true,
    idempotencyKey: token(),
    receiptSecret: token(),
  };
  const created = await request("/api/comun/calcadas/intake", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-comun-synthetic-attempt": attemptId,
    },
    body: JSON.stringify(payload),
  });
  const createdBody = await created.json().catch(() => ({}));
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  assert.equal(createdBody.receipt?.category, "sidewalk_accessibility");
  assert.equal(createdBody.intakeReady, false);
  assert.equal(createdBody.progressiveCapture, true);
  assert.ok(createdBody.walletRecoveryCode);
  protocol = createdBody.receipt.protocol;
  persistRecoveryState();
  let smokeError;
  try {
    let rows = await fixture(client);
    assert.equal(rows.rows.length, 1);
    assert.equal(rows.rows[0].original_text, null);
    assert.equal(rows.rows[0].privacy_class, "sensitive");
    assert.equal(rows.rows[0].category, "sidewalk_accessibility");
    assert.equal(rows.rows[0].routing_decision.captureBasis, "photo_only");
    assert.equal(rows.rows[0].routing_decision.requiresEnrichment, true);
    assert.equal(rows.rows[0].intake_id, null);
    assert.equal(rows.rows[0].protocol_count, 1);

    const started = await request("/api/comun/relata/evidence/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mimeType: "image/png",
        sizeBytes: png.byteLength,
      }),
    });
    const startBody = await started.json().catch(() => ({}));
    assert.equal(started.status, 201, JSON.stringify(startBody));
    attachmentId = startBody.upload.attachmentId;
    persistRecoveryState();
    const publicKey = await discoverPublicSupabaseKey();
    const uploaded = await fetch(startBody.upload.url, {
      method: "PUT",
      headers: {
        apikey: publicKey,
        authorization: `Bearer ${publicKey}`,
        "content-type": "image/png",
        "cache-control": "max-age=3600",
        "x-upsert": "false",
      },
      body: png,
    });
    assert.equal(uploaded.status, 200, `upload_status=${uploaded.status}`);
    assert.equal(
      (await request(startBody.upload.finalizeUrl, { method: "POST" })).status,
      200,
    );

    const completed = await request("/api/comun/calcadas/intake", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        phase: "complete",
        condition: "bad",
        problems: ["hole", "no_ramp"],
        affectedGroups: ["wheelchair_users", "general_circulation"],
      }),
    });
    const completedBody = await completed.json().catch(() => ({}));
    assert.equal(completed.status, 200, JSON.stringify(completedBody));
    assert.equal(completedBody.intakeReady, true);
    assert.equal(completedBody.sameProtocol, true);

    const location = await request("/api/comun/relata/evidence/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...point,
        origin: "map_pin",
        accuracyMeters: null,
        capturedAt: "2026-08-09T12:00:00.000Z",
      }),
    });
    assert.equal(location.status, 200, await location.text());
    const finalized = await request("/api/comun/relata/sidewalk/finalize", {
      method: "POST",
    });
    const finalizedBody = await finalized.json().catch(() => ({}));
    assert.equal(finalized.status, 200, JSON.stringify(finalizedBody));
    assert.equal(finalizedBody.intake?.state, "pending_review");

    rows = await fixture(client);
    assert.equal(rows.rows.length, 1);
    const row = rows.rows[0];
    assert.equal(row.original_text, null);
    assert.equal(row.review_state, "pending_review");
    assert.equal(row.published_record_id, null);
    assert.equal(row.location_state, "added_private");
    assert.equal(row.attachment_state, "sealed_private");
    assert.equal(row.presentation_state, "Em revisão");
    assert.equal(row.protocol_count, 1);
    assert.equal(row.snapshots, 0);
    assert.equal(row.forwarding, 0);
  } catch (error) {
    smokeError = error;
  } finally {
    await request("/api/comun/relata/evidence/location", {
      method: "DELETE",
    }).catch(() => {});
    if (attachmentId)
      await request(`/api/comun/relata/evidence/attachments/${attachmentId}`, {
        method: "DELETE",
      }).catch(() => {});
    await cleanupExactFixture(client);
  }
  if (smokeError) throw smokeError;
  assert.equal((await fixture(client)).rows.length, 0);
  assert.equal(await storageObjectCount(client), 0);
  if (recoveryFile) fs.rmSync(recoveryFile, { force: true });
  return {
    result: "COMUN_48_1B_F2_C1_SIDEWALK_PROGRESSIVE_PRODUCTION_GREEN_CLEANUP",
    semanticText: null,
    category: "sidewalk_accessibility",
    protocolCount: 1,
    adapter: "existing_comun_sidewalk_intake_create",
    state: "pending_review",
    photo: "sealed_private",
    location: "private",
    wallet: "review",
    publication: 0,
    forwarding: 0,
    migration: 0,
    cleanup: "exact_fixture",
  };
}

await db.connect();
try {
  console.log(
    JSON.stringify(mode === "recover" ? await recover(db) : await smoke(db)),
  );
} finally {
  await db.end().catch(() => {});
}
