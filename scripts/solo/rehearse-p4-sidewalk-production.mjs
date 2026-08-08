import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import pg from "pg";

const base = (
  process.env.COMUN_BASE_URL ?? "https://comunsocial.online"
).replace(/\/$/, "");
const dbUrl = process.env.SUPABASE_DB_URL ?? "";
const attemptId =
  process.env.ATTEMPT_ID ??
  `P4-SMOKE-${process.env.RUN_ID ?? "manual"}-${randomUUID()}`;
const mode = process.argv.includes("--recover") ? "recover" : "smoke";
const recoveryFile = process.env.P4_RECOVERY_FILE ?? "";
const markerHash = createHash("sha256").update(attemptId).digest("hex");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const point = { longitude: -44.100321, latitude: -22.520321 };

if (!/^https:\/\//.test(base))
  throw new Error("COMUN_P4_PRODUCTION_HTTPS_REQUIRED");
if (!/^postgres(?:ql)?:\/\//.test(dbUrl))
  throw new Error("COMUN_P4_CURRENT_DB_SECRET_REQUIRED");
if (!/^P4-SMOKE-[A-Za-z0-9._:-]{8,180}$/.test(attemptId))
  throw new Error("COMUN_P4_ATTEMPT_ID_INVALID");

const db = new pg.Client({ connectionString: dbUrl });
let cookie = "";
let created = false;
let attachmentId = null;

function persistRecoveryState() {
  if (!recoveryFile || !created) return;
  fs.writeFileSync(recoveryFile, JSON.stringify({ cookie, attachmentId }), {
    mode: 0o600,
  });
  fs.chmodSync(recoveryFile, 0o600);
}

function absorbCookie(response) {
  const value = response.headers.get("set-cookie") ?? "";
  for (const part of value.split(/,(?=[^;]+=)/)) {
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

async function discoverPublicSupabaseKey() {
  const page = await fetch(`${base}/comun/relatar?__p4_public_key_probe=1`, {
    headers: { "cache-control": "no-cache" },
  });
  if (!page.ok) throw new Error("COMUN_P4_PUBLIC_RUNTIME_UNAVAILABLE");
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
  throw new Error("COMUN_P4_PUBLIC_SUPABASE_KEY_NOT_DISCOVERABLE");
}

async function fixtureRows(client) {
  return client.query(
    `select r.id report_id, c.id case_id, c.state case_state, c.withdrawn_at case_withdrawn_at,
            r.withdrawn_at report_withdrawn_at, r.retention_class,
            i.id intake_id, i.review_state, i.published_record_id,
            l.id location_id, l.evidence_state location_state, l.withdrawn_at location_withdrawn_at,
            a.id attachment_id, a.state attachment_state, a.withdrawn_at attachment_withdrawn_at,
            wi.id wallet_item_id, wi.wallet_id, wi.archived_at wallet_item_archived_at,
            w.status wallet_status, w.revoked_at wallet_revoked_at,
            (select count(*)::int from private.comun_participation_wallet_items x where x.wallet_id=w.id) wallet_item_total,
            (select count(*)::int from private.comun_participation_wallet_account_links x where x.wallet_id=w.id and x.revoked_at is null) account_link_count,
            (select count(*)::int from private.comun_participation_wallet_recovery_credentials x where x.wallet_id=w.id and x.active and x.revoked_at is null) active_recovery_count,
            (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshot_count,
            0::int forwarding_count,
            (select count(*)::int from storage.objects o where o.bucket_id='comun-relata-private' and o.name in ('quarantine/'||a.id::text||'.bin','sealed/'||a.id::text||'.webp')) storage_object_count
       from private.comun_relata_reports r
       join public.comun_relata_cases c on c.report_id=r.id
       join private.comun_sidewalk_relata_intakes i on i.report_id=r.id
       left join private.comun_relata_private_locations l on l.report_id=r.id
       left join private.comun_relata_attachments a on a.report_id=r.id
       left join private.comun_participation_wallet_items wi on wi.subject_ref=c.id::text and wi.item_type='relata_report'
       left join private.comun_participation_wallets w on w.id=wi.wallet_id
      where position($1 in r.original_text)>0
      order by r.created_at desc`,
    [attemptId],
  );
}

async function revokeExclusiveSyntheticWallet(client) {
  await client.query("begin");
  try {
    const rows = await fixtureRows(client);
    if (rows.rows.length !== 1)
      throw new Error("COMUN_P4_CLEANUP_FIXTURE_NOT_UNIQUE");
    const row = rows.rows[0];
    await client.query(
      "select id from private.comun_relata_reports where id=$1 for update",
      [row.report_id],
    );
    await client.query(
      "select id from public.comun_relata_cases where id=$1 for update",
      [row.case_id],
    );
    await client.query(
      "select id from private.comun_sidewalk_relata_intakes where id=$1 for update",
      [row.intake_id],
    );
    if (
      !row.wallet_id ||
      !row.wallet_item_id ||
      row.wallet_item_total !== 1 ||
      row.account_link_count !== 0
    ) {
      throw new Error("COMUN_P4_CLEANUP_WALLET_NOT_EXCLUSIVELY_SYNTHETIC");
    }
    await client.query(
      "select id from private.comun_participation_wallets where id=$1 for update",
      [row.wallet_id],
    );
    await client.query(
      "select id from private.comun_participation_wallet_items where id=$1 for update",
      [row.wallet_item_id],
    );
    await client.query(
      "update private.comun_participation_wallet_items set archived_at=coalesce(archived_at,now()), updated_at=now() where id=$1",
      [row.wallet_item_id],
    );
    await client.query(
      "insert into private.comun_participation_wallet_events(wallet_id,item_id,event_type,result_code) values($1,$2,'item_archived','P4_SYNTHETIC_FIXTURE_CLEANUP')",
      [row.wallet_id, row.wallet_item_id],
    );
    await client.query(
      "update private.comun_participation_wallet_recovery_credentials set active=false, revoked_at=coalesce(revoked_at,now()) where wallet_id=$1 and active",
      [row.wallet_id],
    );
    await client.query(
      "update private.comun_participation_wallets set status='revoked', revoked_at=coalesce(revoked_at,now()) where id=$1",
      [row.wallet_id],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function postflight(client) {
  const result = await fixtureRows(client);
  const rows = result.rows;
  const sum = (field) =>
    rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
  return {
    candidateCount: rows.length,
    activeReport: rows.filter(
      (row) => !row.report_withdrawn_at && row.retention_class !== "withdrawn",
    ).length,
    activeLocation: rows.filter(
      (row) =>
        row.location_state === "added_private" && !row.location_withdrawn_at,
    ).length,
    activeAttachment: rows.filter(
      (row) => !["withdrawn", "rejected"].includes(row.attachment_state),
    ).length,
    activeIntake: rows.filter((row) => row.review_state !== "withdrawn").length,
    activeWalletItem: rows.filter(
      (row) => row.wallet_item_id && !row.wallet_item_archived_at,
    ).length,
    activeWallet: rows.filter(
      (row) => row.wallet_id && row.wallet_status === "active",
    ).length,
    publicRecord: rows.filter((row) => row.published_record_id).length,
    snapshot: sum("snapshot_count"),
    forwarding: sum("forwarding_count"),
    storageObjects: sum("storage_object_count"),
    markerHash,
  };
}

async function recover(client) {
  const rows = await fixtureRows(client);
  if (rows.rows.length !== 1)
    throw new Error("COMUN_P4_RECOVERY_FIXTURE_NOT_UNIQUE");
  const row = rows.rows[0];
  if (recoveryFile && fs.existsSync(recoveryFile)) {
    const recovery = JSON.parse(fs.readFileSync(recoveryFile, "utf8"));
    if (typeof recovery.cookie === "string") cookie = recovery.cookie;
    if (typeof recovery.attachmentId === "string")
      attachmentId = recovery.attachmentId;
    await request("/api/comun/relata/evidence/location", {
      method: "DELETE",
    }).catch(() => {});
    if (attachmentId)
      await request(`/api/comun/relata/evidence/attachments/${attachmentId}`, {
        method: "DELETE",
      }).catch(() => {});
    await request("/api/comun/relata/receipt", { method: "DELETE" }).catch(
      () => {},
    );
  }
  await client.query("begin");
  try {
    await client.query(
      "update private.comun_relata_private_locations set evidence_state='withdrawn', withdrawn_at=coalesce(withdrawn_at,now()) where report_id=$1",
      [row.report_id],
    );
    await client.query(
      "update private.comun_relata_attachments set state='withdrawn', withdrawn_at=coalesce(withdrawn_at,now()), updated_at=now() where report_id=$1",
      [row.report_id],
    );
    await client.query(
      "update public.comun_relata_cases set state='withdrawn', withdrawn_at=coalesce(withdrawn_at,now()), updated_at=now() where id=$1",
      [row.case_id],
    );
    await client.query(
      "update private.comun_relata_reports set withdrawn_at=coalesce(withdrawn_at,now()), retention_class='withdrawn', updated_at=now() where id=$1",
      [row.report_id],
    );
    await client.query(
      "insert into public.comun_relata_status_events(case_id,state,actor,result_code) values($1,'withdrawn','system_local','P4_PRODUCTION_SMOKE_RECOVERY')",
      [row.case_id],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
  await revokeExclusiveSyntheticWallet(client);
  const after = await postflight(client);
  if (
    after.activeReport ||
    after.activeLocation ||
    after.activeAttachment ||
    after.activeIntake ||
    after.activeWalletItem ||
    after.activeWallet ||
    after.publicRecord ||
    after.snapshot ||
    after.forwarding ||
    after.storageObjects
  ) {
    throw new Error("COMUN_P4_PRODUCTION_RECOVERY_POSTFLIGHT_FAILED");
  }
  return {
    result: "COMUN_P4_PRODUCTION_RECOVERY_SOFT_WITHDRAW_GREEN",
    ...after,
    hardDeletes: 0,
  };
}

async function smoke(client) {
  const createdResponse = await request("/api/comun/calcadas/intake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      condition: "bad",
      problems: ["hole", "irregular"],
      affectedGroups: ["wheelchair_users", "general_circulation"],
      description: `Fixture sintética privada ${attemptId}`,
      idempotencyKey: randomBytes(32).toString("base64url"),
      receiptSecret: randomBytes(32).toString("base64url"),
    }),
  });
  const createdBody = await createdResponse.json().catch(() => ({}));
  assert.equal(
    createdResponse.status,
    201,
    `create_status=${createdResponse.status}`,
  );
  assert.equal(createdBody.intakeReady, true);
  assert.equal(createdBody.nothingPublished, true);
  assert.equal(createdBody.noOfficialSend, true);
  assert.ok(createdBody.walletRecoveryCode);
  created = true;
  persistRecoveryState();
  let smokeError;
  try {
    const started = await request("/api/comun/relata/evidence/attachments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mimeType: "image/png",
        sizeBytes: png.byteLength,
      }),
    });
    const upload = (await started.json()).upload;
    assert.equal(started.status, 201);
    attachmentId = upload.attachmentId;
    persistRecoveryState();
    const publicKey = await discoverPublicSupabaseKey();
    const uploaded = await fetch(upload.url, {
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
    const finalizedPhoto = await request(upload.finalizeUrl, {
      method: "POST",
      cache: "no-store",
    });
    assert.equal(finalizedPhoto.status, 200);
    const photoRead = await request(
      `/api/comun/relata/evidence/attachments/${attachmentId}`,
    );
    assert.equal(photoRead.status, 200);
    assert.equal(photoRead.headers.get("content-type"), "image/webp");

    const location = await request("/api/comun/relata/evidence/location", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...point,
        origin: "map_pin",
        accuracyMeters: null,
        capturedAt: "2026-08-08T18:00:00.000Z",
      }),
    });
    const locationText = await location.text();
    assert.equal(location.status, 200);
    assert.ok(
      !locationText.includes(String(point.longitude)) &&
        !locationText.includes(String(point.latitude)),
    );
    const finalizedIntake = await request(
      "/api/comun/relata/sidewalk/finalize",
      { method: "POST", cache: "no-store" },
    );
    assert.equal(finalizedIntake.status, 200);

    const active = await fixtureRows(client);
    assert.equal(active.rows.length, 1);
    assert.equal(active.rows[0].review_state, "pending_review");
    assert.equal(active.rows[0].location_state, "added_private");
    assert.equal(active.rows[0].attachment_state, "sealed_private");
    assert.equal(active.rows[0].wallet_item_total, 1);
    assert.equal(active.rows[0].account_link_count, 0);
    assert.equal(active.rows[0].published_record_id, null);
    assert.equal(active.rows[0].snapshot_count, 0);
    assert.equal(active.rows[0].forwarding_count, 0);
  } catch (error) {
    smokeError = error;
  } finally {
    if (created) {
      await request("/api/comun/relata/evidence/location", {
        method: "DELETE",
      }).catch(() => {});
      if (attachmentId)
        await request(
          `/api/comun/relata/evidence/attachments/${attachmentId}`,
          { method: "DELETE" },
        ).catch(() => {});
      await request("/api/comun/relata/receipt", { method: "DELETE" }).catch(
        () => {},
      );
      await revokeExclusiveSyntheticWallet(client);
    }
  }
  if (smokeError) throw smokeError;
  const after = await postflight(client);
  assert.deepEqual(
    {
      activeReport: after.activeReport,
      activeLocation: after.activeLocation,
      activeAttachment: after.activeAttachment,
      activeIntake: after.activeIntake,
      activeWalletItem: after.activeWalletItem,
      activeWallet: after.activeWallet,
      publicRecord: after.publicRecord,
      snapshot: after.snapshot,
      forwarding: after.forwarding,
      storageObjects: after.storageObjects,
    },
    {
      activeReport: 0,
      activeLocation: 0,
      activeAttachment: 0,
      activeIntake: 0,
      activeWalletItem: 0,
      activeWallet: 0,
      publicRecord: 0,
      snapshot: 0,
      forwarding: 0,
      storageObjects: 0,
    },
  );
  if (recoveryFile) fs.rmSync(recoveryFile, { force: true });
  return {
    result: "COMUN_P4A_PRODUCTION_PRIVATE_INTAKE_GREEN",
    ...after,
    photoPrivate: true,
    locationPrivate: true,
    hardDeletes: 0,
    publicProjection: false,
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
