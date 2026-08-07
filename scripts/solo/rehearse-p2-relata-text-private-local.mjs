import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

const base = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3139";
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl)) {
  throw new Error("COMUN_P2_LOCAL_DATABASE_REQUIRED");
}

const token = () => randomBytes(32).toString("base64url");
let cookie = "";
const output = [];
function absorb(response) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  for (const part of setCookie.split(/,(?=[^;]+?=)/)) {
    const value = part.split(";", 1)[0];
    if (value && !cookie.includes(value.split("=", 1)[0] + "=")) cookie += `${cookie ? "; " : ""}${value}`;
  }
}
async function http(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookie && !headers.has("cookie")) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  absorb(response);
  return response;
}
async function waitForServer() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`COMUN_P2_SERVER_EXIT_${server.exitCode}`);
    try {
      const response = await fetch(`${base}/comun/relatar`);
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("COMUN_P2_LOCAL_HTTP_UNAVAILABLE");
}

const server = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev", "--", "-p", new URL(base).port],
  {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (chunk) => { output.push(String(chunk)); if (output.length > 80) output.shift(); });
server.stderr.on("data", (chunk) => { output.push(String(chunk)); if (output.length > 80) output.shift(); });
function stop(signal = "SIGTERM") {
  if (server.exitCode !== null) return;
  try {
    if (process.platform !== "win32" && server.pid) {
      process.kill(-server.pid, signal);
    } else {
      server.kill(signal);
    }
  } catch {
    try { server.kill(signal); } catch {}
  }
}

async function waitForExit(timeoutMs = 5000) {
  if (server.exitCode !== null) return true;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), timeoutMs);
    server.once("exit", () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
}

try {
  assert.equal(process.env.COMUN_QUICK_CAPTURE_V2, "enabled");
  assert.notEqual(process.env.COMUN_RELATA_LOCAL_EVIDENCE, "enabled");
  await waitForServer();

  const page = await http("/comun/relatar");
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /data-comun-quick-capture-v2/);
  assert.doesNotMatch(html, /Tirar ou escolher foto|Onde foi\?|Usar localização|Marcar aproximadamente|type="file"/i);

  const idempotencyKey = token();
  const receiptSecret = token();
  const payload = {
    text: "A calçada está totalmente bloqueada por entulho e impede a passagem.",
    answers: { blocked: "sim" },
    captureMode: "quick_v2",
    hasPhoto: false,
    idempotencyKey,
    receiptSecret,
  };
  const first = await http("/api/comun/relata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const firstBody = await first.json();
  assert.equal(first.status, 201, JSON.stringify(firstBody));
  assert.equal(firstBody.noOfficialSend, true);
  assert.match(firstBody.receipt.protocol, /^COMUN-RELATA-/);
  assert.ok(firstBody.walletRecoveryCode);
  const protocol = firstBody.receipt.protocol;

  const replay = await http("/api/comun/relata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const replayBody = await replay.json();
  assert.equal(replay.status, 201, JSON.stringify(replayBody));
  assert.equal(replayBody.receipt.protocol, protocol);

  const conflict = await http("/api/comun/relata", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, text: "Outra descrição sintética diferente." }) });
  assert.equal(conflict.status, 409);

  const receipt = await http("/api/comun/relata/receipt");
  assert.equal(receipt.status, 200);
  assert.equal((await receipt.json()).receipt.protocol, protocol);
  const wrongReceipt = await http("/api/comun/relata/receipt", { headers: { cookie: "comun_relata_receipt_v1=invalid" } });
  assert.equal(wrongReceipt.status, 404);

  const wallet = await http("/api/comun/participation-wallet");
  assert.equal(wallet.status, 200);
  const walletBody = await wallet.json();
  assert.ok(walletBody.items.some((item) => item.item_type === "relata_report"));
  assert.doesNotMatch(JSON.stringify(walletBody), /A calçada está bloqueada|object_key|receiptSecret|raw_text/i);

  for (const path of ["/api/comun/relata/evidence/attachments", "/api/comun/relata/evidence/location"]) {
    const response = await http(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(response.status, 404, `${path} must remain dormant`);
  }

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const privateRow = await client.query("select original_text, privacy_class, retention_class from private.comun_relata_reports where original_text = $1", [payload.text]);
    assert.equal(privateRow.rowCount, 1);
    assert.equal(privateRow.rows[0].retention_class, "private_unsubmitted");
    assert.notEqual(privateRow.rows[0].privacy_class, "high_risk");
    const publicSnapshot = await client.query("select count(*)::int as count from public.comun_relata_public_snapshots s join public.comun_relata_cases c on c.id = s.case_id join private.comun_relata_reports r on r.id = c.report_id where r.original_text = $1", [payload.text]);
    assert.equal(publicSnapshot.rows[0].count, 0);
    const evidence = await client.query("select count(*)::int as count from private.comun_relata_attachments a join private.comun_relata_reports r on r.id = a.report_id where r.original_text = $1", [payload.text]);
    assert.equal(evidence.rows[0].count, 0);
  } finally {
    await client.end();
  }
  console.log(JSON.stringify({ result: "COMUN_P2_RELATA_TEXT_DISPOSABLE_E2E_GREEN", evidenceEnabled: false, publicSnapshotCount: 0, attachmentCount: 0 }));
} finally {
  stop();
  if (!(await waitForExit())) {
    stop("SIGKILL");
    await waitForExit(2000);
  }
  if (output.length > 0 && process.exitCode) process.stderr.write(output.slice(-20).join(""));
}
