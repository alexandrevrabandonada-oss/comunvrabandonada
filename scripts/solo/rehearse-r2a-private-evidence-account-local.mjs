import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import pg from "pg";

const base = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3138";
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl)) throw new Error("COMUN_R2A_LOCAL_DATABASE_REQUIRED");

const token = () => randomBytes(32).toString("base64url");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
let cookie = "";
function absorb(response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  for (const part of setCookie.split(/,(?=[^;]+?=)/)) cookie += `${cookie ? "; " : ""}${part.split(";", 1)[0]}`;
}
async function http(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  absorb(response);
  return response;
}
async function httpWithCookie(path, cookieValue, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("cookie", cookieValue);
  return fetch(`${base}${path}`, { ...init, headers });
}
async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    if (server.exitCode !== null) {
      throw new Error(`COMUN_R2A_LOCAL_SERVER_EXIT_${server.exitCode}\n${output.join("")}`);
    }
    try { const response = await fetch(`${base}/comun/minha-participacao`); if (response.status < 500) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("COMUN_R2A_LOCAL_HTTP_UNAVAILABLE");
}

const serverScript = process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev";
const server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", serverScript, "--", "-p", new URL(base).port], { cwd: process.cwd(), env: process.env, shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"] });
const output = [];
const capture = (chunk) => {
  output.push(String(chunk));
  if (output.length > 80) output.shift();
};
server.stdout.on("data", capture);
server.stderr.on("data", capture);
try {
  await waitForServer();
  const receiptSecret = token();
  const createPayload = {
    text: "A calçada está totalmente bloqueada por entulho e impede a passagem.",
    answers: { blocked: "sim" }, idempotencyKey: token(), receiptSecret, captureMode: "quick_v2",
  };
  const created = await http("/api/comun/relata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(createPayload) });
  const createdBody = await created.json();
  assert.equal(created.status, 201, JSON.stringify(createdBody));
  assert.equal(createdBody.noOfficialSend, true);
  const protocol = createdBody.receipt.protocol;
  assert.match(protocol, /^COMUN-RELATA-/);
  assert.ok(createdBody.walletRecoveryCode);
  const replay = await http("/api/comun/relata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(createPayload) });
  const replayBody = await replay.json();
  assert.equal(replay.status, 201, JSON.stringify(replayBody));
  assert.equal(replayBody.receipt.protocol, protocol);
  const receiptCookie = cookie;
  const wrongReceiptCookie = receiptCookie
    .split(";")
    .map((part) => part.trim().startsWith("comun_relata_receipt_v1=") ? "comun_relata_receipt_v1=invalid" : part.trim())
    .join("; ");
  assert.notEqual(wrongReceiptCookie, receiptCookie);
  const wrongLocation = await httpWithCookie("/api/comun/relata/evidence/location", wrongReceiptCookie, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origin: "map_pin", longitude: -44.1, latitude: -22.52, accuracyMeters: 40 }) });
  assert.equal(wrongLocation.status, 404);

  const location = await http("/api/comun/relata/evidence/location", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ origin: "map_pin", longitude: -44.1, latitude: -22.52, accuracyMeters: 40 }) });
  assert.equal(location.status, 200);
  const locationBody = await location.json();
  assert.equal(locationBody.noOfficialSend, true);
  assert.equal(JSON.stringify(locationBody).includes("-44.1"), false);
  assert.equal(JSON.stringify(locationBody).includes("ciphertext"), false);

  const started = await http("/api/comun/relata/evidence/attachments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/png", sizeBytes: png.byteLength }) });
  const startedBody = await started.json();
  if (started.status === 404) {
    const diagnostic = new pg.Client({ connectionString: dbUrl });
    try {
      await diagnostic.connect();
      await diagnostic.query("begin");
      await diagnostic.query("select * from public.comun_relata_begin_attachment($1,$2,$3,$4,$5)", [protocol, receiptSecret, randomUUID(), "image/png", "under_1mb"]);
      await diagnostic.query("rollback");
    } catch (error) {
      await diagnostic.query("rollback").catch(() => {});
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
      throw new Error(`COMUN_R2A_ATTACHMENT_RPC_${code}`);
    } finally {
      await diagnostic.end().catch(() => {});
    }
  }
  assert.equal(started.status, 201, JSON.stringify(startedBody));
  const upload = startedBody.upload;
  const invalidType = await http("/api/comun/relata/evidence/attachments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/gif", sizeBytes: png.byteLength }) });
  assert.equal(invalidType.status, 400);
  const oversize = await http("/api/comun/relata/evidence/attachments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mimeType: "image/png", sizeBytes: 8 * 1024 * 1024 + 1 }) });
  assert.equal(oversize.status, 400);
  const uploaded = await http(upload.url, { method: "PUT", headers: { "content-type": "image/png", "content-length": String(png.byteLength) }, body: png });
  assert.equal(uploaded.status, 200);
  const attachmentBody = await uploaded.json();
  assert.equal(attachmentBody.noOfficialSend, true);
  const attachmentId = upload.url.split("/").pop();
  const downloaded = await http(`/api/comun/relata/evidence/attachments/${attachmentId}`);
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.headers.get("content-type"), "image/webp");
  const privateDownload = await fetch(`${base}/api/comun/relata/evidence/attachments/${attachmentId}`);
  assert.equal(privateDownload.status, 404);
  const secondWallet = await fetch(`${base}/api/comun/participation-wallet`, { method: "POST" });
  assert.equal(secondWallet.status, 201);
  const secondWalletCookie = (secondWallet.headers.get("set-cookie") ?? "").split(";", 1)[0];
  assert.match(secondWalletCookie, /^comun_participation_wallet_v1=/);
  const crossWallet = await fetch(`${base}/api/comun/relata/evidence/attachments/${attachmentId}`, { headers: { cookie: secondWalletCookie } });
  assert.equal(crossWallet.status, 404);
  const isolatedWallet = await fetch(`${base}/api/comun/participation-wallet`, { headers: { cookie: secondWalletCookie } });
  assert.equal((await isolatedWallet.json()).items.length, 0);

  const wallet = await http("/api/comun/participation-wallet");
  assert.equal(wallet.status, 200);
  const walletBody = await wallet.json();
  assert.ok(walletBody.items.some((item) => item.item_type === "relata_report"));
  assert.equal(JSON.stringify(walletBody).includes("object_key"), false);

  const authEmail = `r2a-${randomBytes(8).toString("hex")}@example.invalid`;
  const authResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, { method: "POST", headers: { apikey: anonKey, "content-type": "application/json" }, body: JSON.stringify({ email: authEmail, password: `${token()}Aa1!` }) });
  assert.equal(authResponse.ok, true);
  const authUser = await authResponse.json();
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  const walletToken = cookie.match(/comun_participation_wallet_v1=([^;]+)/)?.[1];
  assert.ok(walletToken);
  const cryptoHash = (value) => createHash("sha256").update(`comun-wallet-v1:${value}`).digest("hex");
  const linked = await client.query("select * from public.comun_participation_wallet_link_account($1,$2,'explicit_account_link')", [cryptoHash(walletToken), authUser.user.id]);
  assert.equal(linked.rows[0].linked, true);
  const linkRow = await client.query("select count(*)::int as count from private.comun_participation_wallet_account_links where user_id=$1", [authUser.user.id]);
  assert.equal(linkRow.rows[0].count, 1);
  const evidenceRow = await client.query("select octet_length(encrypted_value)::int as encrypted_bytes, octet_length(nonce)::int as nonce_bytes, evidence_state from private.comun_relata_private_locations where report_id=(select report_id from public.comun_relata_cases where protocol=$1)", [protocol]);
  assert.equal(evidenceRow.rows[0].encrypted_bytes > 0, true);
  assert.equal(evidenceRow.rows[0].nonce_bytes, 12);
  const attachmentRow = await client.query("select state, review_required_for_publication from private.comun_relata_attachments where id=$1", [attachmentId]);
  assert.deepEqual(attachmentRow.rows[0], { state: "sealed_private", review_required_for_publication: true });
  await client.end();

  const wrongRecovery = await fetch(`${base}/api/comun/participation-wallet/recovery/redeem`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recoveryCode: "AAAA-AAAA-AAAA-AAAA-AAAA-AAAA" }) });
  assert.equal(wrongRecovery.status, 404);
  const recovered = await fetch(`${base}/api/comun/participation-wallet/recovery/redeem`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ recoveryCode: createdBody.walletRecoveryCode }) });
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).recovered, true);

  const removedPhoto = await httpWithCookie(`/api/comun/relata/evidence/attachments/${attachmentId}`, receiptCookie, { method: "DELETE" });
  assert.equal(removedPhoto.status, 200);
  const removedLocation = await httpWithCookie("/api/comun/relata/evidence/location", receiptCookie, { method: "DELETE" });
  assert.equal(removedLocation.status, 200);
  console.log(JSON.stringify({ result: "COMUN_48_1B_R2A_PRIVATE_EVIDENCE_ACCOUNT_E2E_GREEN", location: "encrypted_server_only", photo: "sealed_private_derivative", wallet: "http_cookie_item", account: "local_auth_explicit_link", collective: "deferred_disabled", remote: "not_contacted" }));
} finally {
  if (server.exitCode === null && !server.killed) server.kill("SIGTERM");
  if (output.length && process.env.COMUN_R2A_E2E_LOG) {
    writeFileSync(process.env.COMUN_R2A_E2E_LOG, output.join(""), { flag: "a" });
  }
  server.kill();
}
