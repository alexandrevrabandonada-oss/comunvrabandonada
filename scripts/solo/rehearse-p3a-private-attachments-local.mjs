import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

const base = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3139";
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl)) throw new Error("COMUN_P3A_LOCAL_DATABASE_REQUIRED");
const token = () => randomBytes(32).toString("base64url");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
let cookie = "";
const output = [];
function absorb(response) { const value = response.headers.get("set-cookie") ?? ""; for (const part of value.split(/,(?=[^;]+?=)/)) cookie += `${cookie ? "; " : ""}${part.split(";", 1)[0]}`; }
async function http(path, init = {}) { const headers = new Headers(init.headers); if (cookie) headers.set("cookie", cookie); const response = await fetch(`${base}${path}`, { ...init, headers }); absorb(response); return response; }
const server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev", "--", "-p", new URL(base).port], { cwd: process.cwd(), env: process.env, shell: process.platform === "win32", detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
server.stdout.on("data", (chunk) => { output.push(String(chunk)); if (output.length > 80) output.shift(); });
server.stderr.on("data", (chunk) => { output.push(String(chunk)); if (output.length > 80) output.shift(); });
async function stop() { if (server.exitCode !== null) return; try { if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM"); else server.kill("SIGTERM"); } catch {} await new Promise((resolve) => setTimeout(resolve, 1200)); }
try {
  for (let i = 0; i < 90; i++) { try { const response = await fetch(`${base}/comun/relatar`); if (response.status < 500) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 1000)); if (server.exitCode !== null) throw new Error(`COMUN_P3A_SERVER_EXIT_${server.exitCode}`); }
  const receiptSecret = token();
  const created = await http("/api/comun/relata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "A calçada está totalmente bloqueada por entulho e impede a passagem.", answers: { blocked: "sim" }, captureMode: "quick_v2", idempotencyKey: token(), receiptSecret }) });
  const createdBody = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  const protocol = createdBody.receipt.protocol;
  async function addPhoto() {
    const started = await http("/api/comun/relata/evidence/attachments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/png", sizeBytes: png.byteLength }) });
    const startedBody = await started.json();
    assert.equal(started.status, 201, JSON.stringify(startedBody));
    const upload = startedBody.upload;
    assert.match(upload.url, /^https?:\/\/(?:127\.0\.0\.1|localhost):/);
    assert.ok(upload.finalizeUrl);
    const uploaded = await fetch(upload.url, { method: "PUT", headers: { "content-type": "image/png", "cache-control": "max-age=3600", "x-upsert": "false" }, body: png });
    assert.equal(uploaded.status, 200, await uploaded.text());
    const finalized = await http(upload.finalizeUrl, { method: "POST" });
    assert.equal(finalized.status, 200);
    return upload.attachmentId;
  }
  const attachmentId = await addPhoto();
  await addPhoto();
  await addPhoto();
  const read = await http(`/api/comun/relata/evidence/attachments/${attachmentId}`);
  assert.equal(read.status, 200);
  assert.equal(read.headers.get("content-type"), "image/webp");
  const wrongCookie = cookie.replace(/comun_relata_receipt_v1=[^;]+/, "comun_relata_receipt_v1=invalid");
  const denied = await fetch(`${base}/api/comun/relata/evidence/attachments/${attachmentId}`, { headers: { cookie: wrongCookie } });
  assert.equal(denied.status, 404);
  const fourth = await http("/api/comun/relata/evidence/attachments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/png", sizeBytes: png.byteLength }) });
  assert.equal(fourth.status, 409);
  const locationDormant = await http("/api/comun/relata/evidence/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origin: "map_pin", latitude: 0, longitude: 0 }) });
  assert.equal(locationDormant.status, 404);
  const groupingDormant = await http("/api/comun/relata/evidence/grouping", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  assert.equal(groupingDormant.status, 404);
  const withdrawn = await http(`/api/comun/relata/evidence/attachments/${attachmentId}`, { method: "DELETE" });
  assert.equal(withdrawn.status, 200);
  const db = new pg.Client({ connectionString: dbUrl });
  await db.connect();
  const report = await db.query("select id from private.comun_relata_reports where id=(select report_id from public.comun_relata_cases where protocol=$1)", [protocol]);
  const reportId = report.rows[0]?.id;
  const caseRow = await db.query("select id from public.comun_relata_cases where protocol=$1", [protocol]);
  const caseId = caseRow.rows[0]?.id;
  if (reportId) {
    await db.query("delete from private.comun_relata_attachments where report_id=$1", [reportId]);
    const walletRows = await db.query("select distinct wallet_id from private.comun_participation_wallet_items where subject_ref = any($1::text[])", [[reportId, caseId].filter(Boolean)]).catch(() => ({ rows: [] }));
    const walletIds = walletRows.rows.map((row) => row.wallet_id).filter(Boolean);
    if (walletIds.length) {
      await db.query("delete from private.comun_participation_wallet_events where wallet_id = any($1::uuid[])", [walletIds]);
      await db.query("delete from private.comun_participation_wallet_account_links where wallet_id = any($1::uuid[])", [walletIds]).catch(() => {});
      await db.query("delete from private.comun_participation_wallet_recovery_credentials where wallet_id = any($1::uuid[])");
      await db.query("delete from private.comun_participation_wallet_items where wallet_id = any($1::uuid[])");
      await db.query("delete from private.comun_participation_wallets where id = any($1::uuid[])");
    }
    await db.query("delete from private.comun_relata_private_locations where report_id=$1", [reportId]).catch(() => {});
    if (caseId) {
      await db.query("delete from public.comun_relata_status_events where case_id=$1", [caseId]);
      await db.query("delete from public.comun_relata_evidence_consents where case_id=$1", [caseId]);
      await db.query("delete from public.comun_relata_consents where case_id=$1", [caseId]);
    }
    await db.query("delete from public.comun_relata_cases where protocol=$1", [protocol]);
    await db.query("delete from private.comun_relata_reports where id=$1", [reportId]);
  }
  await db.end();
  console.log(JSON.stringify({ result: "COMUN_P3A_ATTACHMENTS_DISPOSABLE_E2E_GREEN", location: "off", collective: "disabled", signedUpload: true, cleanup: "exact_fixture" }));
} finally { await stop(); }
