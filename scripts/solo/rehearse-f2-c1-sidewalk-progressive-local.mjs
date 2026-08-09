import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3149").replace(
  /\/$/,
  "",
);
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(
    dbUrl,
  )
) {
  throw new Error("COMUN_F2_C1_DISPOSABLE_DATABASE_REQUIRED");
}
for (const flag of [
  "COMUN_SIDEWALK_RELATA_ENABLED",
  "COMUN_RELATA_PHOTO_ONLY_ENABLED",
  "COMUN_SIDEWALK_PROGRESSIVE_CAPTURE_ENABLED",
]) {
  if (process.env[flag] !== "enabled")
    throw new Error(`COMUN_F2_C1_FLAG_REQUIRED:${flag}`);
}

const token = () => randomBytes(32).toString("base64url");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const point = { longitude: -44.100411, latitude: -22.520411 };
let cookie = "";
let protocol = "";
let attachmentId = "";
const logs = [];

function absorb(response) {
  const value = response.headers.get("set-cookie") ?? "";
  for (const part of value.split(/,(?=[^;]+?=)/)) {
    const item = part.split(";", 1)[0];
    if (item) cookie += `${cookie ? "; " : ""}${item}`;
  }
}

async function http(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  absorb(response);
  return response;
}

const server = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  [
    "run",
    process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev",
    "--",
    "-p",
    new URL(base).port,
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
for (const stream of [server.stdout, server.stderr]) {
  stream.on("data", (chunk) => {
    logs.push(String(chunk));
    if (logs.length > 100) logs.shift();
  });
}

async function stop() {
  if (server.exitCode !== null) return;
  try {
    if (process.platform !== "win32" && server.pid)
      process.kill(-server.pid, "SIGTERM");
    else server.kill("SIGTERM");
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1200));
}

async function cleanup(client) {
  if (!protocol) return;
  const found = await client.query(
    "select c.id case_id,c.report_id from public.comun_relata_cases c where c.protocol=$1",
    [protocol],
  );
  if (!found.rows.length) return;
  assert.equal(found.rows.length, 1);
  const { case_id: caseId, report_id: reportId } = found.rows[0];
  const walletRows = await client.query(
    "select distinct wallet_id from private.comun_participation_wallet_items where subject_ref=any($1::text[])",
    [[reportId, caseId]],
  );
  const walletIds = walletRows.rows.map((row) => row.wallet_id).filter(Boolean);
  await client.query("begin");
  try {
    await client.query(
      "delete from private.comun_sidewalk_relata_intakes where report_id=$1",
      [reportId],
    );
    await client.query(
      "delete from private.comun_relata_private_locations where report_id=$1",
      [reportId],
    );
    await client.query(
      "delete from private.comun_relata_attachments where report_id=$1",
      [reportId],
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

const db = new pg.Client({ connectionString: dbUrl });
try {
  for (let index = 0; index < 90; index += 1) {
    try {
      const response = await fetch(`${base}/comun/calcadas/contribuir`);
      if (response.status < 500) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (server.exitCode !== null)
      throw new Error(`COMUN_F2_C1_SERVER_EXIT_${server.exitCode}`);
  }
  await db.connect();
  const receiptSecret = token();
  const payload = {
    phase: "capture",
    text: null,
    hasPhoto: true,
    idempotencyKey: token(),
    receiptSecret,
  };
  const created = await http("/api/comun/calcadas/intake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const createdBody = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  assert.equal(createdBody.receipt.category, "sidewalk_accessibility");
  assert.equal(createdBody.intakeReady, false);
  assert.equal(createdBody.progressiveCapture, true);
  assert.ok(createdBody.walletRecoveryCode);
  protocol = createdBody.receipt.protocol;

  const replay = await http("/api/comun/calcadas/intake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(replay.status, 201);
  assert.equal((await replay.json()).receipt.protocol, protocol);

  let audit = await db.query(
    `select c.id case_id,c.report_id,r.original_text,r.privacy_class,r.routing_decision,c.category,
            (select count(*)::int from private.comun_sidewalk_relata_intakes i where i.report_id=r.id) intake_count,
            (select count(*)::int from public.comun_relata_cases x where x.protocol=c.protocol) protocol_count,
            (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshots,
            (select count(*)::int from private.comun_forwarding_packages f where f.relata_case_id=c.id) forwarding
       from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id
      where c.protocol=$1`,
    [protocol],
  );
  assert.equal(audit.rows.length, 1);
  assert.equal(audit.rows[0].original_text, null);
  assert.equal(audit.rows[0].privacy_class, "sensitive");
  assert.equal(audit.rows[0].category, "sidewalk_accessibility");
  assert.equal(audit.rows[0].routing_decision.captureBasis, "photo_only");
  assert.equal(audit.rows[0].routing_decision.requiresEnrichment, true);
  assert.equal(audit.rows[0].intake_count, 0);
  assert.equal(audit.rows[0].protocol_count, 1);

  const started = await http("/api/comun/relata/evidence/attachments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/png", sizeBytes: png.byteLength }),
  });
  const startBody = await started.json();
  assert.equal(started.status, 201, JSON.stringify(startBody));
  attachmentId = startBody.upload.attachmentId;
  const uploaded = await fetch(startBody.upload.url, {
    method: "PUT",
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`,
      "content-type": "image/png",
      "cache-control": "max-age=3600",
      "x-upsert": "false",
    },
    body: png,
  });
  assert.equal(uploaded.status, 200);
  assert.equal(
    (await http(startBody.upload.finalizeUrl, { method: "POST" })).status,
    200,
  );

  assert.equal(
    (await http("/api/comun/relata/sidewalk/finalize", { method: "POST" }))
      .status,
    409,
  );
  const completed = await http("/api/comun/calcadas/intake", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      phase: "complete",
      condition: "bad",
      problems: ["hole", "no_ramp"],
      affectedGroups: ["wheelchair_users", "general_circulation"],
    }),
  });
  const completedBody = await completed.json();
  assert.equal(completed.status, 200, JSON.stringify(completedBody));
  assert.equal(completedBody.intakeReady, true);
  assert.equal(completedBody.sameProtocol, true);

  const location = await http("/api/comun/relata/evidence/location", {
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
  const finalized = await http("/api/comun/relata/sidewalk/finalize", {
    method: "POST",
  });
  const finalizedBody = await finalized.json();
  assert.equal(finalized.status, 200, JSON.stringify(finalizedBody));
  assert.equal(finalizedBody.intake.state, "pending_review");

  audit = await db.query(
    `select r.original_text,
            (select count(*)::int from private.comun_sidewalk_relata_intakes i where i.report_id=r.id and i.review_state='pending_review') pending_intake,
            (select count(*)::int from private.comun_relata_attachments a where a.report_id=r.id and a.state='sealed_private') sealed_photos,
            (select count(*)::int from private.comun_relata_private_locations l where l.report_id=r.id and l.evidence_state='added_private') private_locations,
            (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshots,
            (select count(*)::int from private.comun_forwarding_packages f where f.relata_case_id=c.id) forwarding,
            (select count(*)::int from private.comun_participation_wallet_items w where w.subject_ref=c.id::text and w.item_type='relata_report' and w.presentation_state='Em revisão') wallet_review
       from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id
      where c.protocol=$1`,
    [protocol],
  );
  assert.equal(audit.rows[0].original_text, null);
  assert.equal(audit.rows[0].pending_intake, 1);
  assert.equal(audit.rows[0].sealed_photos, 1);
  assert.equal(audit.rows[0].private_locations, 1);
  assert.equal(audit.rows[0].snapshots, 0);
  assert.equal(audit.rows[0].forwarding, 0);
  assert.equal(audit.rows[0].wallet_review, 1);

  await http(`/api/comun/relata/evidence/attachments/${attachmentId}`, {
    method: "DELETE",
  });
  await http("/api/comun/relata/evidence/location", { method: "DELETE" });
  await cleanup(db);
  protocol = "";
  console.log(
    JSON.stringify({
      result: "COMUN_48_1B_F2_C1_SIDEWALK_PROGRESSIVE_DISPOSABLE_GREEN",
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
      remote: "not_contacted",
    }),
  );
} finally {
  if (db._connected) {
    await cleanup(db).catch((error) => {
      process.stderr.write(
        `cleanup_error=${error instanceof Error ? error.message : String(error)}\n`,
      );
    });
    await db.end().catch(() => {});
  }
  await stop();
  if (logs.length && process.env.COMUN_F2_C1_E2E_LOG)
    process.stderr.write(logs.join(""));
}
