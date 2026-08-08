import assert from "node:assert/strict";
import { createDecipheriv, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3144").replace(/\/$/, "");
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl)) throw new Error("COMUN_P4_LOCAL_DATABASE_REQUIRED");
if (process.env.COMUN_SIDEWALK_RELATA_ENABLED !== "enabled") throw new Error("COMUN_P4_INTAKE_FLAG_REQUIRED");
if (process.env.COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED !== "enabled") throw new Error("COMUN_P4_PROJECTION_FLAG_REQUIRED");
if (process.env.COMUN_RELATA_COLLECTIVE_ENABLED === "enabled") throw new Error("COMUN_P4_COLLECTIVE_MUST_BE_OFF");

const token = () => randomBytes(32).toString("base64url");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const exactPoint = { longitude: -44.1001, latitude: -22.5201 };
let cookie = "";
const logs = [];
function absorb(response) { const value = response.headers.get("set-cookie") ?? ""; for (const part of value.split(/,(?=[^;]+?=)/)) cookie += `${cookie ? "; " : ""}${part.split(";", 1)[0]}`; }
async function http(path, init = {}, suppliedCookie = cookie) { const headers = new Headers(init.headers); if (suppliedCookie) headers.set("cookie", suppliedCookie); const response = await fetch(`${base}${path}`, { ...init, headers }); absorb(response); return response; }
const server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev", "--", "-p", new URL(base).port], { cwd: process.cwd(), env: process.env, shell: process.platform === "win32", detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
server.stdout.on("data", (chunk) => { logs.push(String(chunk)); if (logs.length > 80) logs.shift(); });
server.stderr.on("data", (chunk) => { logs.push(String(chunk)); if (logs.length > 80) logs.shift(); });
async function stop() { if (server.exitCode !== null) return; try { if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM"); else server.kill("SIGTERM"); } catch {} await new Promise((resolve) => setTimeout(resolve, 1200)); }
function decrypt(row, protocol) { const key = Buffer.from(process.env.COMUN_RELATA_LOCATION_ENCRYPTION_KEY ?? "", "base64url"); assert.equal(key.byteLength, 32); const decipher = createDecipheriv("aes-256-gcm", key, row.nonce); decipher.setAAD(Buffer.from(`relata-private-location-v1:${protocol}`)); decipher.setAuthTag(row.auth_tag); return JSON.parse(Buffer.concat([decipher.update(row.encrypted_value), decipher.final()]).toString("utf8")); }
function sanitize(point) { const meters = 150, perDegree = 111_320, latStep = meters / perDegree, lonStep = meters / (perDegree * Math.max(0.2, Math.cos((point.latitude * Math.PI) / 180))); let lat = (Math.floor(point.latitude / latStep) + 0.5) * latStep, lon = (Math.floor(point.longitude / lonStep) + 0.5) * lonStep; if (Math.abs(lat - point.latitude) < 1e-10 && Math.abs(lon - point.longitude) < 1e-10) lon += lonStep; return { type: "Point", coordinates: [Number(lon.toFixed(6)), Number(lat.toFixed(6))] }; }

const db = new pg.Client({ connectionString: dbUrl });
let reportId = null, caseId = null, intakeId = null, recordId = null, attachmentId = null;
let walletIds = [];
try {
  for (let i = 0; i < 90; i++) { try { const response = await fetch(`${base}/comun/calcadas/contribuir`); if (response.status < 500) break; } catch {} await new Promise((resolve) => setTimeout(resolve, 1000)); if (server.exitCode !== null) throw new Error(`COMUN_P4_SERVER_EXIT_${server.exitCode}`); }
  await db.connect();
  const receiptSecret = token();
  const created = await http("/api/comun/calcadas/intake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ condition: "bad", problems: ["hole", "no_ramp"], affectedGroups: ["wheelchair_users", "general_circulation"], description: "Fixture sintética P4, sem pessoa ou endereço real.", idempotencyKey: token(), receiptSecret }) });
  const createdBody = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  assert.equal(createdBody.intakeReady, true);
  assert.equal(createdBody.receipt.category, "sidewalk_accessibility");
  assert.equal(createdBody.noOfficialSend, true);
  const protocol = createdBody.receipt.protocol;
  const ids = await db.query("select r.id report_id,c.id case_id,i.id intake_id from private.comun_relata_reports r join public.comun_relata_cases c on c.report_id=r.id join private.comun_sidewalk_relata_intakes i on i.report_id=r.id where c.protocol=$1", [protocol]);
  assert.equal(ids.rowCount, 1);
  ({ report_id: reportId, case_id: caseId, intake_id: intakeId } = ids.rows[0]);
  assert.equal((await db.query("select count(*)::int count from public.comun_sidewalk_records where id=(select published_record_id from private.comun_sidewalk_relata_intakes where id=$1)", [intakeId])).rows[0].count, 0);

  const premature = await http("/api/comun/relata/sidewalk/finalize", { method: "POST" });
  assert.equal(premature.status, 409);
  const wrong = await db.query("select * from public.comun_sidewalk_intake_create($1,$2,$3,$4,$5)", [protocol, token(), "bad", ["hole"], ["general_circulation"]]);
  assert.equal(wrong.rowCount, 0);

  const started = await http("/api/comun/relata/evidence/attachments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/png", sizeBytes: png.byteLength }) });
  const startedBody = await started.json();
  assert.equal(started.status, 201, JSON.stringify(startedBody));
  attachmentId = startedBody.upload.attachmentId;
  const uploaded = await fetch(startedBody.upload.url, { method: "PUT", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""}`, "content-type": "image/png", "cache-control": "max-age=3600", "x-upsert": "false" }, body: png });
  assert.equal(uploaded.status, 200);
  assert.equal((await http(startedBody.upload.finalizeUrl, { method: "POST" })).status, 200);

  const location = await http("/api/comun/relata/evidence/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...exactPoint, origin: "map_pin", accuracyMeters: null, capturedAt: "2026-08-08T12:00:00.000Z" }) });
  assert.equal(location.status, 200, await location.text());
  const finalized = await http("/api/comun/relata/sidewalk/finalize", { method: "POST" });
  assert.equal(finalized.status, 200, await finalized.text());
  assert.equal((await http("/api/comun/relata/sidewalk/finalize", { method: "POST" })).status, 200);
  const intake = (await db.query("select review_state,published_record_id from private.comun_sidewalk_relata_intakes where id=$1", [intakeId])).rows[0];
  assert.equal(intake.review_state, "pending_review");
  assert.equal(intake.published_record_id, null);
  const wallet = await db.query("select wallet_id,presentation_state,metadata from private.comun_participation_wallet_items where item_type='relata_report' and subject_ref=$1", [caseId]);
  assert.equal(wallet.rowCount, 1);
  assert.equal(wallet.rows[0].presentation_state, "Em revisão");
  walletIds = wallet.rows.map((row) => row.wallet_id);
  console.log(JSON.stringify({ result: "COMUN_P4A_SIDEWALK_PRIVATE_INTAKE_E2E_GREEN", protocol: "masked", photo: "private", location: "encrypted", publicRecord: 0, forwarding: 0, collective: 0 }));

  const encrypted = (await db.query("select encrypted_value,nonce,auth_tag from private.comun_relata_private_locations where report_id=$1", [reportId])).rows[0];
  const privatePoint = decrypt(encrypted, protocol);
  assert.deepEqual(privatePoint, { ...exactPoint, accuracyMeters: null });
  const publicPoint = sanitize(privatePoint);
  assert.notDeepEqual(publicPoint.coordinates, [exactPoint.longitude, exactPoint.latitude]);
  const reviewed = await db.query("select * from public.comun_sidewalk_intake_review($1,$2,$3,$4::jsonb)", [intakeId, "publish_approximate", "Trecho com buraco e ausência de rampa, publicado após revisão editorial.", JSON.stringify(publicPoint)]);
  assert.equal(reviewed.rowCount, 1);
  recordId = reviewed.rows[0].published_record_id;
  const record = (await db.query("select geometry_geojson,private_geometry_geojson,public_geometry_geojson,location_precision,public_location_level,location_source,status,verification_status,visibility,private_notes from public.comun_sidewalk_records where id=$1", [recordId])).rows[0];
  assert.equal(record.geometry_geojson, null);
  assert.equal(record.private_geometry_geojson, null);
  assert.deepEqual(record.public_geometry_geojson, publicPoint);
  assert.equal(record.location_precision, "approximate");
  assert.equal(record.public_location_level, "approximate");
  assert.equal(record.location_source, "editorial");
  assert.equal(record.status, "published");
  assert.equal(record.verification_status, "verified");
  assert.equal(record.visibility, "public");
  assert.equal(record.private_notes, null);
  assert.equal((await db.query("select presentation_state from private.comun_participation_wallet_items where item_type='relata_report' and subject_ref=$1", [caseId])).rows[0].presentation_state, "Publicado no mapa");
  console.log(JSON.stringify({ result: "COMUN_P4B_SIDEWALK_REVIEW_PROJECTION_E2E_GREEN", exactPointInPublicRecord: false, publicPhoto: "none", wallet: "updated", automaticPublication: false }));
} finally {
  if (db._connected) {
    if (intakeId) await db.query("delete from private.comun_sidewalk_relata_intakes where id=$1", [intakeId]).catch(() => {});
    if (recordId) await db.query("delete from public.comun_sidewalk_records where id=$1", [recordId]).catch(() => {});
    if (reportId) {
      await db.query("delete from private.comun_relata_attachments where report_id=$1", [reportId]).catch(() => {});
      await db.query("delete from private.comun_relata_private_locations where report_id=$1", [reportId]).catch(() => {});
    }
    if (walletIds.length) {
      await db.query("delete from private.comun_participation_wallet_events where wallet_id=any($1::uuid[])", [walletIds]).catch(() => {});
      await db.query("delete from private.comun_participation_wallet_account_links where wallet_id=any($1::uuid[])", [walletIds]).catch(() => {});
      await db.query("delete from private.comun_participation_wallet_recovery_credentials where wallet_id=any($1::uuid[])", [walletIds]).catch(() => {});
      await db.query("delete from private.comun_participation_wallet_items where wallet_id=any($1::uuid[])", [walletIds]).catch(() => {});
      await db.query("delete from private.comun_participation_wallets where id=any($1::uuid[])", [walletIds]).catch(() => {});
    }
    if (caseId) {
      await db.query("alter table public.comun_relata_status_events disable trigger user").catch(() => {});
      await db.query("delete from public.comun_relata_status_events where case_id=$1", [caseId]).catch(() => {});
      await db.query("alter table public.comun_relata_status_events enable trigger user").catch(() => {});
      await db.query("delete from public.comun_relata_evidence_consents where case_id=$1", [caseId]).catch(() => {});
      await db.query("delete from public.comun_relata_consents where case_id=$1", [caseId]).catch(() => {});
      await db.query("delete from public.comun_relata_cases where id=$1", [caseId]).catch(() => {});
    }
    if (reportId) await db.query("delete from private.comun_relata_reports where id=$1", [reportId]).catch(() => {});
    await db.end();
  }
  await stop();
}
