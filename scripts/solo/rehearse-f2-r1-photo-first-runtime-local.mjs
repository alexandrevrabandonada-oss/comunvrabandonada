import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

const base = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3148";
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(
    dbUrl,
  )
) {
  throw new Error("COMUN_F2_R1_DISPOSABLE_DATABASE_REQUIRED");
}
const token = () => randomBytes(32).toString("base64url");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
let cookie = "";
let protocol = "";
let attachmentId = "";
const output = [];

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

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const server = spawn(
  command,
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
    output.push(String(chunk));
    if (output.length > 100) output.shift();
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

async function cleanupFixture() {
  if (!protocol) return;
  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  try {
    const ids = await db.query(
      "select c.id as case_id,c.report_id from public.comun_relata_cases c where c.protocol=$1",
      [protocol],
    );
    const caseId = ids.rows[0]?.case_id;
    const reportId = ids.rows[0]?.report_id;
    if (!caseId || !reportId) return;
    const walletRows = await db.query(
      "select distinct wallet_id from private.comun_participation_wallet_items where subject_ref = any($1::text[])",
      [[reportId, caseId]],
    );
    const walletIds = walletRows.rows
      .map((row) => row.wallet_id)
      .filter(Boolean);
    await db.query(
      "delete from private.comun_relata_attachments where report_id=$1",
      [reportId],
    );
    if (walletIds.length) {
      await db.query(
        "delete from private.comun_participation_wallet_events where wallet_id = any($1::uuid[])",
        [walletIds],
      );
      await db.query(
        "delete from private.comun_participation_wallet_account_links where wallet_id = any($1::uuid[])",
        [walletIds],
      );
      await db.query(
        "delete from private.comun_participation_wallet_recovery_credentials where wallet_id = any($1::uuid[])",
        [walletIds],
      );
      await db.query(
        "delete from private.comun_participation_wallet_items where wallet_id = any($1::uuid[])",
        [walletIds],
      );
      await db.query(
        "delete from private.comun_participation_wallets where id = any($1::uuid[])",
        [walletIds],
      );
    }
    await db.query(
      "alter table public.comun_relata_status_events disable trigger user",
    );
    try {
      await db.query(
        "delete from public.comun_relata_status_events where case_id=$1",
        [caseId],
      );
      await db.query(
        "delete from public.comun_relata_evidence_consents where case_id=$1",
        [caseId],
      );
      await db.query(
        "delete from public.comun_relata_consents where case_id=$1",
        [caseId],
      );
    } finally {
      await db.query(
        "alter table public.comun_relata_status_events enable trigger user",
      );
    }
    await db.query("delete from public.comun_relata_cases where id=$1", [
      caseId,
    ]);
    await db.query("delete from private.comun_relata_reports where id=$1", [
      reportId,
    ]);
    const remaining = await db.query(
      "select count(*)::int as count from public.comun_relata_cases where protocol=$1",
      [protocol],
    );
    assert.equal(remaining.rows[0].count, 0);
  } finally {
    await db.end();
  }
}

try {
  for (let i = 0; i < 90; i += 1) {
    try {
      const response = await fetch(`${base}/comun/relatar`);
      if (response.status < 500) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (server.exitCode !== null)
      throw new Error(`COMUN_F2_R1_SERVER_EXIT_${server.exitCode}`);
  }

  const receiptSecret = token();
  const payload = {
    text: null,
    answers: {},
    hasPhoto: true,
    captureMode: "quick_v2",
    idempotencyKey: token(),
    receiptSecret,
  };
  const created = await http("/api/comun/relata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await created.json();
  assert.equal(created.status, 201, JSON.stringify(body));
  assert.equal(body.noOfficialSend, true);
  assert.equal(body.receipt.category, "other");
  assert.ok(body.walletRecoveryCode);
  protocol = body.receipt.protocol;

  const replay = await http("/api/comun/relata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(replay.status, 201);
  assert.equal((await replay.json()).receipt.protocol, protocol);

  const invalidShortText = await http("/api/comun/relata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...payload,
      idempotencyKey: token(),
      text: "curto",
    }),
  });
  assert.equal(invalidShortText.status, 400);

  const failedPhoto = await http("/api/comun/relata/evidence/attachments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/gif", sizeBytes: png.byteLength }),
  });
  assert.equal(failedPhoto.status, 400);

  const started = await http("/api/comun/relata/evidence/attachments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mimeType: "image/png", sizeBytes: png.byteLength }),
  });
  const startedBody = await started.json();
  assert.equal(started.status, 201, JSON.stringify(startedBody));
  attachmentId = startedBody.upload.attachmentId;
  const uploaded = await fetch(startedBody.upload.url, {
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
  const finalized = await http(startedBody.upload.finalizeUrl, {
    method: "POST",
  });
  assert.equal(finalized.status, 200);

  const wallet = await http("/api/comun/participation-wallet");
  const walletBody = await wallet.json();
  assert.equal(wallet.status, 200);
  assert.ok(
    walletBody.items.some((item) => item.item_type === "relata_report"),
  );

  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  const audit = await db.query(
    `select r.original_text,r.privacy_class,r.routing_decision,c.id as case_id,c.category,c.urgency,
      (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) as snapshots,
      (select count(*)::int from private.comun_forwarding_packages f where f.relata_case_id=c.id) as forwarding,
      (select count(*)::int from private.comun_relata_attachments a where a.report_id=r.id and a.state='sealed_private') as sealed_photos
     from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id where c.protocol=$1`,
    [protocol],
  );
  assert.equal(audit.rows[0].original_text, null);
  assert.equal(audit.rows[0].privacy_class, "sensitive");
  assert.equal(audit.rows[0].category, "other");
  assert.equal(audit.rows[0].urgency, "attention");
  assert.equal(audit.rows[0].routing_decision.captureBasis, "photo_only");
  assert.equal(audit.rows[0].routing_decision.semanticTextState, "absent");
  assert.equal(audit.rows[0].routing_decision.requiresEnrichment, true);
  assert.equal(audit.rows[0].routing_decision.requiresHumanReview, true);
  assert.equal(audit.rows[0].routing_decision.confidence, "low");
  assert.equal(audit.rows[0].routing_decision.automaticForwarding, false);
  assert.equal(audit.rows[0].snapshots, 0);
  assert.equal(audit.rows[0].forwarding, 0);
  assert.equal(audit.rows[0].sealed_photos, 1);

  await db.query("begin");
  try {
    const sidewalkReady = await db.query(
      `select * from public.comun_relata_create($1,$2,null,$3::jsonb,'sidewalk_accessibility','attention','relata-routing-v1',$4::jsonb,'sensitive','relata-consent-v1')`,
      [
        token(),
        token(),
        JSON.stringify({}),
        JSON.stringify({
          captureBasis: "photo_only",
          semanticTextState: "absent",
          captureState: "captured_private",
          requiresEnrichment: true,
        }),
      ],
    );
    assert.equal(sidewalkReady.rows[0].category, "sidewalk_accessibility");
    const sidewalkRow = await db.query(
      "select r.original_text,c.routing_decision from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id where c.protocol=$1",
      [sidewalkReady.rows[0].protocol],
    );
    assert.equal(sidewalkRow.rows[0].original_text, null);
    assert.equal(
      sidewalkRow.rows[0].routing_decision.category,
      "sidewalk_accessibility",
    );
    assert.equal(
      sidewalkRow.rows[0].routing_decision.automaticForwarding,
      false,
    );
  } finally {
    await db.query("rollback");
  }
  await db.end();

  await http(`/api/comun/relata/evidence/attachments/${attachmentId}`, {
    method: "DELETE",
  });
  await cleanupFixture();
  protocol = "";
  console.log(
    JSON.stringify({
      result: "COMUN_48_1B_F2_R1_PHOTO_FIRST_DISPOSABLE_GREEN",
      semanticText: null,
      category: "other",
      sidewalkCategoryReady: true,
      privacy: "sensitive",
      review: "required",
      attachment: "p3_sealed_private_after_retry",
      wallet: "linked",
      forwarding: 0,
      publication: 0,
      cleanup: "exact_fixture",
      remote: "not_contacted",
    }),
  );
} finally {
  await cleanupFixture().catch((error) => {
    process.stderr.write(
      `cleanup_error=${error instanceof Error ? error.message : String(error)}\n`,
    );
  });
  await stop();
  if (output.length && process.env.COMUN_F2_R1_E2E_LOG) {
    process.stderr.write(output.join(""));
  }
}
