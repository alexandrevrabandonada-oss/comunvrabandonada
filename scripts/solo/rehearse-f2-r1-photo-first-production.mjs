import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import pg from "pg";

const base = (
  process.env.COMUN_BASE_URL ?? "https://comunsocial.online"
).replace(/\/$/, "");
const dbUrl = process.env.SUPABASE_DB_URL ?? "";
const attemptId = process.env.ATTEMPT_ID ?? `F2-R1-SMOKE-${randomUUID()}`;
const recoveryFile = process.env.F2_R1_RECOVERY_FILE ?? "";
const mode = process.argv.includes("--recover") ? "recover" : "smoke";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

if (!/^https:\/\//.test(base))
  throw new Error("COMUN_F2_R1_PRODUCTION_HTTPS_REQUIRED");
if (!/^postgres(?:ql)?:\/\//.test(dbUrl))
  throw new Error("COMUN_F2_R1_CURRENT_DB_SECRET_REQUIRED");
if (!/^F2-R1-SMOKE-[A-Za-z0-9._:-]{8,180}$/.test(attemptId))
  throw new Error("COMUN_F2_R1_ATTEMPT_ID_INVALID");

const db = new pg.Client({ connectionString: dbUrl });
let cookie = "";
let protocol = "";
let attachmentId = "";

function token() {
  return randomBytes(32).toString("base64url");
}

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
  const page = await fetch(`${base}/comun/relatar?__f2_r1_public_key_probe=1`, {
    headers: { "cache-control": "no-cache" },
  });
  if (!page.ok) throw new Error("COMUN_F2_R1_PUBLIC_RUNTIME_UNAVAILABLE");
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
  throw new Error("COMUN_F2_R1_PUBLIC_SUPABASE_KEY_NOT_DISCOVERABLE");
}

async function fixture(client) {
  if (!protocol) return { rows: [] };
  return client.query(
    `select c.id case_id,c.report_id,r.original_text,r.privacy_class,r.routing_decision,c.category,c.urgency,
            (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshots,
            (select count(*)::int from private.comun_forwarding_packages f where f.relata_case_id=c.id) forwarding,
            (select count(*)::int from private.comun_relata_attachments a where a.report_id=r.id and a.state='sealed_private') sealed_photos
       from public.comun_relata_cases c
       join private.comun_relata_reports r on r.id=c.report_id
      where c.protocol=$1`,
    [protocol],
  );
}

async function cleanupExactFixture(client) {
  const found = await fixture(client);
  if (found.rows.length === 0) return;
  assert.equal(found.rows.length, 1, "COMUN_F2_R1_CLEANUP_FIXTURE_NOT_UNIQUE");
  const { case_id: caseId, report_id: reportId } = found.rows[0];
  const wallets = await client.query(
    "select distinct wallet_id from private.comun_participation_wallet_items where subject_ref=any($1::text[])",
    [[reportId, caseId]],
  );
  const walletIds = wallets.rows.map((row) => row.wallet_id).filter(Boolean);
  await client.query("begin");
  try {
    await client.query(
      "delete from private.comun_relata_attachments where report_id=$1",
      [reportId],
    );
    if (walletIds.length) {
      const ownership = await client.query(
        "select count(*)::int total,count(*) filter(where subject_ref=any($2::text[]))::int fixture from private.comun_participation_wallet_items where wallet_id=any($1::uuid[])",
        [walletIds, [reportId, caseId]],
      );
      assert.equal(
        ownership.rows[0].total,
        ownership.rows[0].fixture,
        "COMUN_F2_R1_CLEANUP_WALLET_NOT_EXCLUSIVE",
      );
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
        [caseId],
      );
      await client.query(
        "delete from public.comun_relata_evidence_consents where case_id=$1",
        [caseId],
      );
      await client.query(
        "delete from public.comun_relata_consents where case_id=$1",
        [caseId],
      );
    } finally {
      await client.query(
        "alter table public.comun_relata_status_events enable trigger user",
      );
    }
    await client.query("delete from public.comun_relata_cases where id=$1", [
      caseId,
    ]);
    await client.query("delete from private.comun_relata_reports where id=$1", [
      reportId,
    ]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function recover(client) {
  if (recoveryFile && fs.existsSync(recoveryFile)) {
    const state = JSON.parse(fs.readFileSync(recoveryFile, "utf8"));
    cookie = typeof state.cookie === "string" ? state.cookie : "";
    protocol = typeof state.protocol === "string" ? state.protocol : "";
    attachmentId =
      typeof state.attachmentId === "string" ? state.attachmentId : "";
  }
  if (!protocol) throw new Error("COMUN_F2_R1_RECOVERY_STATE_MISSING");
  if (attachmentId)
    await request(`/api/comun/relata/evidence/attachments/${attachmentId}`, {
      method: "DELETE",
    }).catch(() => {});
  await cleanupExactFixture(client);
  assert.equal((await fixture(client)).rows.length, 0);
  if (recoveryFile) fs.rmSync(recoveryFile, { force: true });
  return {
    result: "COMUN_F2_R1_PRODUCTION_RECOVERY_GREEN",
    cleanup: "exact_fixture",
  };
}

async function smoke(client) {
  const payload = {
    text: null,
    answers: {},
    hasPhoto: true,
    captureMode: "quick_v2",
    idempotencyKey: token(),
    receiptSecret: token(),
  };
  const created = await request("/api/comun/relata", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-comun-synthetic-attempt": attemptId,
    },
    body: JSON.stringify(payload),
  });
  const body = await created.json().catch(() => ({}));
  assert.equal(created.status, 201, JSON.stringify(body));
  assert.equal(body.receipt?.category, "other");
  assert.equal(body.noOfficialSend, true);
  assert.ok(body.walletRecoveryCode);
  protocol = body.receipt.protocol;
  persistRecoveryState();
  let smokeError;
  try {
    const rejected = await request("/api/comun/relata/evidence/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mimeType: "image/gif",
        sizeBytes: png.byteLength,
      }),
    });
    assert.equal(rejected.status, 400);
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
    const wallet = await request("/api/comun/participation-wallet");
    const walletBody = await wallet.json().catch(() => ({}));
    assert.equal(wallet.status, 200);
    assert.ok(
      walletBody.items?.some((item) => item.item_type === "relata_report"),
    );
    const rows = await fixture(client);
    assert.equal(rows.rows.length, 1);
    const row = rows.rows[0];
    assert.equal(row.original_text, null);
    assert.equal(row.privacy_class, "sensitive");
    assert.equal(row.category, "other");
    assert.equal(row.urgency, "attention");
    assert.equal(row.routing_decision.captureBasis, "photo_only");
    assert.equal(row.routing_decision.semanticTextState, "absent");
    assert.equal(row.routing_decision.requiresEnrichment, true);
    assert.equal(row.routing_decision.requiresHumanReview, true);
    assert.equal(row.routing_decision.confidence, "low");
    assert.equal(row.routing_decision.automaticForwarding, false);
    assert.equal(row.snapshots, 0);
    assert.equal(row.forwarding, 0);
    assert.equal(row.sealed_photos, 1);
  } catch (error) {
    smokeError = error;
  } finally {
    if (attachmentId)
      await request(`/api/comun/relata/evidence/attachments/${attachmentId}`, {
        method: "DELETE",
      }).catch(() => {});
    await cleanupExactFixture(client);
  }
  if (smokeError) throw smokeError;
  assert.equal((await fixture(client)).rows.length, 0);
  if (recoveryFile) fs.rmSync(recoveryFile, { force: true });
  return {
    result: "COMUN_48_1B_F2_R1_PHOTO_FIRST_PRODUCTION_GREEN_CLEANUP",
    semanticText: null,
    category: "other",
    privacy: "sensitive",
    review: "required",
    attachment: "p3_sealed_private_after_retry",
    wallet: "linked",
    forwarding: 0,
    publication: 0,
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
