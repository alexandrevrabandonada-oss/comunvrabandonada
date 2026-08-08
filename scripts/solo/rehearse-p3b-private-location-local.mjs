import assert from "node:assert/strict";
import { createDecipheriv, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3140").replace(/\/$/, "");
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl)) throw new Error("COMUN_P3B_LOCAL_DATABASE_REQUIRED");
if (process.env.COMUN_RELATA_LOCATION_ENABLED !== "enabled") throw new Error("COMUN_P3B_LOCATION_FLAG_REQUIRED");
if (process.env.COMUN_RELATA_COLLECTIVE_ENABLED === "enabled") throw new Error("COMUN_P3B_COLLECTIVE_MUST_BE_OFF");
const token = () => randomBytes(32).toString("base64url");
const synthetic = [{ longitude: -44.1001, latitude: -22.5201 }, { longitude: -44.1001, latitude: -22.5201 }];
let cookie = "";
const logs = [];
function absorb(response) { const value = response.headers.get("set-cookie") ?? ""; for (const part of value.split(/,(?=[^;]+?=)/)) cookie += `${cookie ? "; " : ""}${part.split(";", 1)[0]}`; }
async function http(path, init = {}, suppliedCookie = cookie) { const headers = new Headers(init.headers); if (suppliedCookie) headers.set("cookie", suppliedCookie); const response = await fetch(`${base}${path}`, { ...init, headers }); absorb(response); return response; }
const server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev", "--", "-p", new URL(base).port], { cwd: process.cwd(), env: process.env, shell: process.platform === "win32", detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
server.stdout.on("data", (chunk) => { logs.push(String(chunk)); if (logs.length > 80) logs.shift(); });
server.stderr.on("data", (chunk) => { logs.push(String(chunk)); if (logs.length > 80) logs.shift(); });
async function stop() { if (server.exitCode !== null) return; try { if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM"); else server.kill("SIGTERM"); } catch {} await new Promise((resolve) => setTimeout(resolve, 1200)); }
function decrypt(encrypted, protocol) {
  const key = Buffer.from(process.env.COMUN_RELATA_LOCATION_ENCRYPTION_KEY ?? "", "base64url");
  assert.equal(key.byteLength, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, encrypted.nonce);
  decipher.setAAD(Buffer.from(`relata-private-location-v1:${protocol}`));
  decipher.setAuthTag(encrypted.authTag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted.ciphertext), decipher.final()]).toString("utf8"));
}
const db = new pg.Client({ connectionString: dbUrl });
const reportIds = [];
const protocols = [];
try {
  for (let i = 0; i < 90; i++) { try { const response = await fetch(`${base}/comun/relatar`); if (response.status < 500) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 1000)); if (server.exitCode !== null) throw new Error(`COMUN_P3B_SERVER_EXIT_${server.exitCode}`); }
  await db.connect();
  for (const point of synthetic) {
    const secret = token();
    const created = await http("/api/comun/relata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "A calçada está totalmente bloqueada por entulho e impede a passagem.", answers: { blocked: "sim" }, captureMode: "quick_v2", idempotencyKey: token(), receiptSecret: secret }) });
    const body = await created.json();
    assert.equal(created.status, 201, JSON.stringify(body));
    const protocol = body.receipt.protocol;
    protocols.push(protocol);
    const location = await http("/api/comun/relata/evidence/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ longitude: point.longitude, latitude: point.latitude, origin: "map_pin", accuracyMeters: null, capturedAt: "2026-08-07T12:00:00.000Z" }) });
    const locationText = await location.text();
    assert.equal(location.status, 200, locationText);
    const locationBody = JSON.parse(locationText);
    const sanitized = JSON.stringify(locationBody);
    assert.ok(!sanitized.includes(String(point.longitude)) && !sanitized.includes(String(point.latitude)));
    const caseRow = await db.query("select id from public.comun_relata_cases where protocol=$1", [protocol]);
    const reportRow = await db.query("select id from private.comun_relata_reports where id=(select report_id from public.comun_relata_cases where protocol=$1)", [protocol]);
    assert.equal(caseRow.rowCount, 1);
    assert.equal(reportRow.rowCount, 1);
    reportIds.push(reportRow.rows[0].id);
  }
  const rows = await db.query("select report_id, encrypted_value, nonce, auth_tag, key_version, evidence_state from private.comun_relata_private_locations where report_id = any($1::uuid[])", [reportIds]);
  assert.equal(rows.rowCount, 2);
  assert.equal(rows.rows[0].nonce.length, 12);
  assert.equal(rows.rows[0].auth_tag.length, 16);
  assert.equal(rows.rows[0].key_version, "relata-location-key-v1");
  assert.equal(rows.rows[0].encrypted_value.length >= 16, true);
  assert.notDeepEqual(rows.rows[0].nonce, rows.rows[1].nonce);
  assert.notDeepEqual(rows.rows[0].encrypted_value, rows.rows[1].encrypted_value);
  assert.deepEqual(decrypt({ ciphertext: rows.rows[0].encrypted_value, nonce: rows.rows[0].nonce, authTag: rows.rows[0].auth_tag }, protocols[0]), { longitude: synthetic[0].longitude, latitude: synthetic[0].latitude, accuracyMeters: null });
  const wrongCookie = "comun_relata_receipt_v1=invalid";
  const denied = await http("/api/comun/relata/evidence/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ longitude: 0, latitude: 0, origin: "device" }) }, wrongCookie);
  assert.equal(denied.status, 404);
  const state = await http("/api/comun/relata/evidence");
  assert.equal(state.status, 200);
  assert.doesNotMatch(JSON.stringify(await state.json()), /44\.1001|22\.5201/);
  const withdrawn = await http("/api/comun/relata/evidence/location", { method: "DELETE" });
  assert.equal(withdrawn.status, 200);
  const retained = await db.query("select count(*)::int as count from private.comun_relata_private_locations where report_id = any($1::uuid[]) and evidence_state='withdrawn' and withdrawn_at is not null", [reportIds]);
  assert.equal(retained.rows[0].count, 1);
  console.log(JSON.stringify({ result: "COMUN_P3B_LOCATION_DISPOSABLE_E2E_GREEN", plaintextInResponse: false, nonceBytes: 12, authTagBytes: 16, ciphertextPresent: true, samePositionDifferentCiphertext: true, collective: "disabled", publicProjection: 0, withdrawal: "history_retained" }));
} finally {
  if (db._connected) {
    for (const reportId of reportIds) {
      await db.query("delete from private.comun_relata_private_locations where report_id=$1", [reportId]).catch(() => {});
      const wallets = await db.query("select distinct wallet_id from private.comun_participation_wallet_items where subject_ref=$1", [reportId]).catch(() => ({ rows: [] }));
      const walletIds = wallets.rows.map((row) => row.wallet_id).filter(Boolean);
      if (walletIds.length) {
        await db.query("delete from private.comun_participation_wallet_events where wallet_id=any($1::uuid[])", [walletIds]).catch(() => {});
        await db.query("delete from private.comun_participation_wallet_recovery_credentials where wallet_id=any($1::uuid[])", [walletIds]).catch(() => {});
        await db.query("delete from private.comun_participation_wallet_items where wallet_id=any($1::uuid[])", [walletIds]).catch(() => {});
        await db.query("delete from private.comun_participation_wallets where id=any($1::uuid[])", [walletIds]).catch(() => {});
      }
      const caseRow = await db.query("select id from public.comun_relata_cases where protocol=$1", [protocols[reportIds.indexOf(reportId)]]).catch(() => ({ rows: [] }));
      if (caseRow.rows[0]?.id) await db.query("delete from public.comun_relata_status_events where case_id=$1", [caseRow.rows[0].id]).catch(() => {});
      await db.query("delete from public.comun_relata_cases where id=$1", [caseRow.rows[0]?.id]).catch(() => {});
      await db.query("delete from private.comun_relata_reports where id=$1", [reportId]).catch(() => {});
    }
    await db.end();
  }
  await stop();
}
