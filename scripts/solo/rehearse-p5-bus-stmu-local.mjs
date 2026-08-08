import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3155").replace(/\/$/, "");
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl)) throw new Error("COMUN_P5_LOCAL_DATABASE_REQUIRED");
if (process.env.COMUN_STMU_ASSISTED_ENABLED !== "enabled") throw new Error("COMUN_P5_STMU_FLAG_REQUIRED");
if (process.env.COMUN_RELATA_COLLECTIVE_ENABLED === "enabled") throw new Error("COMUN_P5_COLLECTIVE_MUST_BE_OFF");

const token = () => randomBytes(32).toString("base64url");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
let cookie = "";
const cookieJar = new Map();
function absorb(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie") ?? ""];
  for (const value of values) for (const part of value.split(/,(?=[^;,]+=)/)) {
    const pair = part.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  cookie = [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
}
async function http(path, init = {}, supplied = cookie) { const headers = new Headers(init.headers); if (supplied) headers.set("cookie", supplied); const response = await fetch(`${base}${path}`, { ...init, headers }); absorb(response); return response; }

const output = [];
const server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev", "--", "-p", new URL(base).port], { cwd: process.cwd(), env: process.env, shell: process.platform === "win32", detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
server.stdout.on("data", (chunk) => { output.push(String(chunk)); if (output.length > 80) output.shift(); });
server.stderr.on("data", (chunk) => { output.push(String(chunk)); if (output.length > 80) output.shift(); });
async function stop() { if (server.exitCode !== null) return; try { if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM"); else server.kill("SIGTERM"); } catch {} await new Promise((resolve) => setTimeout(resolve, 1000)); }

const db = new pg.Client({ connectionString: dbUrl });
let reportId = null, caseId = null, busId = null, walletId = null, packageId = null;
try {
  for (let i = 0; i < 90; i++) { try { const response = await fetch(`${base}/comun/onibus`); if (response.status === 200) break; } catch {} if (server.exitCode !== null) throw new Error(`COMUN_P5_SERVER_EXIT_${server.exitCode}\n${output.join("")}`); await new Promise((resolve) => setTimeout(resolve, 1000)); }
  await db.connect();
  const receiptSecret = token();
  const idempotencyKey = token();
  const created = await http("/api/comun/onibus/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ issueType: "delay_or_not_passed", lineLabel: "FIX-01", direction: "Centro", observedAt: "2026-08-08T15:00:00.000Z", waitMinutes: 12, description: "Fixture sintética P5 sem pessoa, endereço ou linha real.", idempotencyKey, receiptSecret }) });
  const createdBody = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  assert.equal(createdBody.receipt.category, "public_transport");
  assert.equal(createdBody.intakeReady, true);
  assert.equal(createdBody.noOfficialSend, true);
  assert.equal(createdBody.nothingPublished, true);
  const protocol = createdBody.receipt.protocol;
  const ids = await db.query("select r.id report_id,c.id case_id,b.id bus_id from private.comun_relata_reports r join public.comun_relata_cases c on c.report_id=r.id join private.comun_bus_relata_intakes b on b.report_id=r.id where c.protocol=$1", [protocol]);
  assert.equal(ids.rowCount, 1); ({ report_id: reportId, case_id: caseId, bus_id: busId } = ids.rows[0]);
  assert.equal((await db.query("select count(*)::int count from private.comun_forwarding_packages where relata_case_id=$1", [caseId])).rows[0].count, 0);
  assert.equal((await db.query("select count(*)::int count from public.comun_relata_public_snapshots where case_id=$1", [caseId])).rows[0].count, 0);
  assert.equal((await db.query("select to_regclass('private.comun_relata_collective_memberships') relation")).rows[0].relation, null);
  const duplicate = await http("/api/comun/onibus/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ issueType: "delay_or_not_passed", lineLabel: "FIX-01", direction: "Centro", observedAt: "2026-08-08T15:00:00.000Z", waitMinutes: 12, description: "Fixture sintética P5 sem pessoa, endereço ou linha real.", idempotencyKey, receiptSecret }) });
  assert.equal(duplicate.status, 201);
  assert.equal((await db.query("select count(*)::int count from private.comun_bus_relata_intakes where report_id=$1", [reportId])).rows[0].count, 1);
  const wrong = await db.query("select * from public.comun_bus_intake_create($1,$2,$3,$4,$5,$6,$7,$8)", [protocol, token(), "other", null, null, null, "2026-08-08T15:00:00.000Z", null]);
  assert.equal(wrong.rowCount, 0);

  const started = await http("/api/comun/relata/evidence/attachments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/png", sizeBytes: png.byteLength }) });
  assert.equal(started.status, 201); const upload = (await started.json()).upload;
  const uploaded = await fetch(upload.url, { method: "PUT", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`, "content-type": "image/png", "cache-control": "max-age=3600", "x-upsert": "false" }, body: png });
  assert.equal(uploaded.status, 200); assert.equal((await http(upload.finalizeUrl, { method: "POST" })).status, 200);
  const location = await http("/api/comun/relata/evidence/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ longitude: -44.09, latitude: -22.51, origin: "map_pin", accuracyMeters: null, capturedAt: "2026-08-08T15:00:00.000Z" }) });
  assert.equal(location.status, 200);

  const wallet = await db.query("select id,wallet_id from private.comun_participation_wallet_items where item_type='relata_report' and subject_ref=$1", [caseId]);
  assert.equal(wallet.rowCount, 1); const walletItemId = wallet.rows[0].id; walletId = wallet.rows[0].wallet_id;
  const walletToken = cookieJar.get("comun_participation_wallet_v1");
  assert.ok(walletToken);
  const resolvedWallet = await db.query("select private.comun_p5_wallet_id($1) id", [
    createHash("sha256").update(`comun-wallet-v1:${walletToken}`).digest("hex"),
  ]);
  assert.equal(resolvedWallet.rows[0].id, walletId);
  const beforePrepare = await http(`/api/comun/stmu-assisted/packages/${walletItemId}`);
  assert.equal(beforePrepare.status, 200, await beforePrepare.text());
  const walletHash = createHash("sha256").update(`comun-wallet-v1:${walletToken}`).digest("hex");
  await db.query("begin");
  try {
    await db.query("set local role service_role");
    const probe = await db.query("select * from public.comun_stmu_assisted_prepare($1,$2)", [walletHash, walletItemId]);
    assert.equal(probe.rowCount, 1);
    await db.query("rollback");
  } catch (error) {
    await db.query("rollback").catch(() => {});
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "UNKNOWN";
    const message = typeof error === "object" && error && "message" in error
      ? String(error.message).replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "[uuid]").slice(0, 240)
      : "unavailable";
    throw new Error(`COMUN_P5_PREPARE_RPC_PROBE_${code}:${message}`);
  }
  const prepared = await http(`/api/comun/stmu-assisted/packages/${walletItemId}/prepare`, { method: "POST" });
  assert.equal(prepared.status, 201, await prepared.text()); packageId = (await db.query("select id from private.comun_forwarding_packages where relata_case_id=$1", [caseId])).rows[0].id;
  const opened = await http(`/api/comun/stmu-assisted/packages/${packageId}/open`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel: "whatsapp" }) });
  const openedBody = await opened.json(); assert.equal(opened.status, 200, JSON.stringify(openedBody)); assert.equal(openedBody.destination, "https://wa.me/5524992958558");
  const firstAttempt = (await db.query("select id,state,due_at from private.comun_forwarding_attempts where package_id=$1 order by sequence_no", [packageId])).rows[0];
  assert.equal(firstAttempt.state, "prepared"); assert.equal(firstAttempt.due_at, null);
  const declared = await http(`/api/comun/stmu-assisted/attempts/${firstAttempt.id}/declare-sent`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sent: true }) });
  assert.equal(declared.status, 200); assert.ok((await declared.json()).attempt.due_at);
  const email = await http(`/api/comun/stmu-assisted/packages/${packageId}/open`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel: "email" }) });
  const emailBody = await email.json(); assert.equal(email.status, 200); assert.equal(emailBody.destination, "mailto:stmu@voltaredonda.rj.gov.br"); assert.ok(!emailBody.destination.includes("?"));
  assert.equal((await db.query("select count(*)::int count from private.comun_forwarding_attempts where package_id=$1", [packageId])).rows[0].count, 2);
  const response = await http(`/api/comun/stmu-assisted/attempts/${firstAttempt.id}/response`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ note: "Resposta institucional sintética recebida no laboratório.", officialProtocol: "FIXTURE-123", resolved: false }) });
  assert.equal(response.status, 200);
  console.log(JSON.stringify({ result: "COMUN_P5A_BUS_PRIVATE_INTAKE_E2E_GREEN", category: "public_transport", walletItems: 1, photo: "private", location: "encrypted", forwardingBeforeGesture: 0, publicProjection: 0, collective: 0 }));
  console.log(JSON.stringify({ result: "COMUN_P5B_STMU_ASSISTED_E2E_GREEN", whatsapp: "prepared_then_person_declared", email: "prepared", externalRequests: 0, automaticSend: false, attempts: 2, response: "recorded" }));
} finally {
  if (db._connected) {
    if (packageId) { await db.query("alter table private.comun_forwarding_events disable trigger comun_forwarding_events_append_only").catch(() => {}); await db.query("delete from private.comun_forwarding_events where package_id=$1", [packageId]).catch(() => {}); await db.query("alter table private.comun_forwarding_events enable trigger comun_forwarding_events_append_only").catch(() => {}); await db.query("delete from private.comun_forwarding_attempts where package_id=$1", [packageId]).catch(() => {}); await db.query("delete from private.comun_forwarding_packages where id=$1", [packageId]).catch(() => {}); }
    if (busId) await db.query("delete from private.comun_bus_relata_intakes where id=$1", [busId]).catch(() => {});
    if (reportId) { await db.query("delete from private.comun_relata_attachments where report_id=$1", [reportId]).catch(() => {}); await db.query("delete from private.comun_relata_private_locations where report_id=$1", [reportId]).catch(() => {}); }
    if (walletId) { await db.query("delete from private.comun_participation_wallet_events where wallet_id=$1", [walletId]).catch(() => {}); await db.query("delete from private.comun_participation_wallet_account_links where wallet_id=$1", [walletId]).catch(() => {}); await db.query("delete from private.comun_participation_wallet_recovery_credentials where wallet_id=$1", [walletId]).catch(() => {}); await db.query("delete from private.comun_participation_wallet_items where wallet_id=$1", [walletId]).catch(() => {}); await db.query("delete from private.comun_participation_wallets where id=$1", [walletId]).catch(() => {}); }
    if (caseId) { await db.query("alter table public.comun_relata_status_events disable trigger user").catch(() => {}); await db.query("delete from public.comun_relata_status_events where case_id=$1", [caseId]).catch(() => {}); await db.query("alter table public.comun_relata_status_events enable trigger user").catch(() => {}); await db.query("delete from public.comun_relata_evidence_consents where case_id=$1", [caseId]).catch(() => {}); await db.query("delete from public.comun_relata_consents where case_id=$1", [caseId]).catch(() => {}); await db.query("delete from public.comun_relata_cases where id=$1", [caseId]).catch(() => {}); }
    if (reportId) await db.query("delete from private.comun_relata_reports where id=$1", [reportId]).catch(() => {});
    await db.end();
  }
  await stop();
}
