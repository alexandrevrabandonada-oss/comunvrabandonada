import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3159").replace(/\/$/, "");
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (!/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(dbUrl))
  throw new Error("COMUN_P6C_A_LOCAL_DATABASE_REQUIRED");
if (process.env.COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_ENABLED !== "enabled")
  throw new Error("COMUN_P6C_A_CLASSIFICATION_FLAG_REQUIRED");
if (process.env.COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED === "enabled")
  throw new Error("COMUN_P6C_A_FORWARDING_MUST_BE_OFF");
if (process.env.COMUN_RELATA_COLLECTIVE_ENABLED === "enabled")
  throw new Error("COMUN_P6C_A_COLLECTIVE_MUST_BE_OFF");

const secret = () => randomBytes(32).toString("base64url");
const requested = [];
let hardDeletes = 0;

class Jar {
  values = new Map();
  header() {
    return [...this.values].map(([name, value]) => `${name}=${value}`).join("; ");
  }
  absorb(response) {
    const values = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
    for (const value of values) {
      for (const part of value.split(/,(?=[^;,]+=)/)) {
        const pair = part.split(";", 1)[0];
        const separator = pair.indexOf("=");
        if (separator > 0) this.values.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    }
  }
}

const primary = new Jar();
async function http(path, init = {}, jar = primary) {
  const url = `${base}${path}`;
  assert.ok(url.startsWith(`${base}/`), "external request refused");
  if (String(init.method ?? "GET").toUpperCase() === "DELETE") hardDeletes += 1;
  requested.push(url);
  const headers = new Headers(init.headers);
  if (jar.header()) headers.set("cookie", jar.header());
  const response = await fetch(url, { ...init, headers });
  jar.absorb(response);
  return response;
}

async function capture(text, answers = {}, jar = primary, extra = {}) {
  const response = await http("/api/comun/relata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      answers,
      hasPhoto: false,
      captureMode: "quick_v2",
      idempotencyKey: secret(),
      receiptSecret: secret(),
      ...extra,
    }),
  }, jar);
  const body = await response.json();
  assert.equal(response.status, 201, JSON.stringify(body));
  assert.equal(body.noOfficialSend, true);
  assert.ok(body.walletItemId);
  return body;
}

const output = [];
const port = new URL(base).port;
const server = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev", "--", "-p", port],
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
    if (process.platform !== "win32" && server.pid) process.kill(-server.pid, "SIGTERM");
    else if (server.pid) await new Promise((resolve) => {
      const killer = spawn("taskkill.exe", ["/pid", String(server.pid), "/t", "/f"], {
        windowsHide: true,
        stdio: "ignore",
      });
      killer.once("exit", resolve);
      killer.once("error", resolve);
    });
  } catch {}
}

const db = new pg.Client({ connectionString: dbUrl });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 90; i += 1) {
    try {
      if ((await fetch(`${base}/comun/relatar`)).status === 200) {
        ready = true;
        break;
      }
    } catch {}
    if (server.exitCode !== null)
      throw new Error(`COMUN_P6C_A_SERVER_EXIT_${server.exitCode}\n${output.join("")}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(ready, true, output.join(""));

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const browserRequests = [];
  page.on("request", (request) => browserRequests.push(request.url()));
  await page.goto(`${base}/comun/relatar`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-comun-capture-hydrated='true']").waitFor();
  const textInput = page.getByLabel(/Uma frase basta|A descrição é opcional/);
  await textInput.fill("Há um problema no atendimento do SUS.");
  await page.getByText("Qual é o principal problema?").waitFor();
  assert.equal(await page.getByRole("button", { name: "Guardar" }).count(), 1);
  assert.equal(await page.getByText(/Evite incluir nome de paciente/).count(), 1);
  assert.equal(await page.getByText(/Isso é opcional. Você já pode guardar/).count(), 1);
  const accessibility = await new AxeBuilder({ page }).analyze();
  assert.equal(
    accessibility.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")).length,
    0,
  );
  if (process.env.P6C_A_SCREENSHOT_PATH)
    await page.screenshot({ path: process.env.P6C_A_SCREENSHOT_PATH, fullPage: true });
  assert.ok(browserRequests.every((url) => new URL(url).origin === new URL(base).origin));
  await context.close();
  await browser.close();
  browser = undefined;

  await db.connect();
  const initial = await db.query(`
    select
      (select count(*)::int from public.comun_relata_public_snapshots) public_snapshots,
      (select count(*)::int from private.comun_forwarding_packages) packages,
      (select count(*)::int from private.comun_forwarding_attempts) attempts
  `);

  const scenarios = [
    ["A UBS está sem médico hoje.", "public_health", "staff_or_service_availability", "sensitive", "attention"],
    ["Estou aguardando cirurgia há meses.", "public_health", "exam_or_procedure", "sensitive", "attention"],
    ["Está faltando medicamento na farmácia da unidade.", "public_health", "medicine_or_supply", "sensitive", "attention"],
    ["O banheiro da UPA está quebrado e não tem acessibilidade.", "public_health", "facility_or_accessibility", "sensitive", "attention"],
    ["Não fui atendido e ninguém informa quando será a consulta.", "public_health", "access_or_waiting", "sensitive", "attention"],
    ["Preciso de atendimento imediato.", "public_health", "other_health_service", "sensitive", "emergency"],
    ["Meu exame na UBS não foi liberado.", "public_health", "exam_or_procedure", "high_risk", "attention"],
    ["Tem uma coisa estranha acontecendo aqui.", "other", undefined, undefined, "attention"],
  ];
  const created = [];
  for (const [text, category, subtype, privacyClass, urgency] of scenarios) {
    const body = await capture(text);
    assert.equal(body.receipt.category, category);
    assert.equal(body.receipt.urgency, urgency);
    created.push({ body, text, subtype, privacyClass });
  }

  const forged = await capture("A UBS está sem médico hoje.", {}, primary, {
    category: "public_lighting",
  });
  assert.equal(forged.receipt.category, "public_health");
  created.push({ body: forged, text: "A UBS está sem médico hoje.", subtype: "staff_or_service_availability", privacyClass: "sensitive" });

  const photoOnly = await capture(null, {}, primary, { hasPhoto: true });
  assert.equal(photoOnly.receipt.category, "other");
  created.push({ body: photoOnly, text: null, subtype: undefined, privacyClass: "sensitive" });

  for (const fixture of created) {
    const rows = await db.query(
      `select r.original_text,r.privacy_class,c.category,c.routing_decision,
        (select count(*)::int from private.comun_participation_wallet_items wi
          where wi.subject_ref=c.id::text and wi.item_type='relata_report') wallet_items,
        (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshots,
        (select count(*)::int from private.comun_forwarding_packages p where p.relata_case_id=c.id) packages
       from public.comun_relata_cases c
       join private.comun_relata_reports r on r.id=c.report_id
       where c.protocol=$1`,
      [fixture.body.receipt.protocol],
    );
    assert.equal(rows.rowCount, 1);
    const row = rows.rows[0];
    assert.equal(row.wallet_items, 1);
    assert.equal(row.snapshots, 0);
    assert.equal(row.packages, 0);
    assert.equal("matchedSignals" in row.routing_decision, false);
    if (fixture.text === null) {
      assert.equal(row.original_text, null);
      assert.equal(row.category, "other");
    } else if (row.category === "public_health") {
      assert.equal(row.privacy_class, fixture.privacyClass);
      assert.equal(row.routing_decision.publication, "never_automatic");
      assert.equal(row.routing_decision.healthIssueType, fixture.subtype);
      assert.equal(row.routing_decision.routingVersion, "comun-health-service-routing-v1");
    }
  }

  const walletResponse = await http("/api/comun/participation-wallet");
  const walletBody = await walletResponse.json();
  assert.equal(walletResponse.status, 200);
  const healthWalletItems = walletBody.items.filter((item) => item.category === "public_health");
  assert.ok(healthWalletItems.length >= 1);
  assert.ok(healthWalletItems.every((item) => JSON.stringify(item.metadata ?? {}).length <= 2));
  assert.equal(JSON.stringify(healthWalletItems).includes("medicamento na farmácia"), false);

  const channelsResponse = await http("/api/comun/health-channels");
  const channelsBody = await channelsResponse.json();
  assert.equal(channelsResponse.status, 200);
  assert.equal(channelsBody.forwardingEnabled, false);
  assert.equal(channelsBody.noHealthDataTransferred, true);
  assert.equal(channelsBody.channels.length, 4);
  assert.ok(channelsBody.channels.every((channel) => channel.automationAllowed === false));
  assert.ok(channelsBody.channels.every((channel) => channel.operationalStatus === "operationally_unchecked"));
  assert.ok(channelsBody.channels.some((channel) => channel.sourceStatus === "conflicting_sources"));

  const invalidReceipt = new Jar();
  invalidReceipt.values.set(
    "comun_relata_receipt_v1",
    Buffer.from(JSON.stringify({ protocol: created[0].body.receipt.protocol, receiptSecret: secret() })).toString("base64url"),
  );
  assert.equal((await http("/api/comun/relata/receipt", {}, invalidReceipt)).status, 404);

  const otherWallet = new Jar();
  assert.equal((await http("/api/comun/participation-wallet", { method: "POST" }, otherWallet)).status, 201);
  const otherWalletList = await http("/api/comun/participation-wallet", {}, otherWallet);
  assert.equal(otherWalletList.status, 200);
  assert.equal((await otherWalletList.json()).items.length, 0);

  const security = await db.query(`
    select
      (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.comun_relata_cases'::regclass) cases_rls,
      (select relrowsecurity and relforcerowsecurity from pg_class where oid='private.comun_relata_reports'::regclass) reports_rls,
      has_function_privilege('anon','public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text)','EXECUTE') anon_create,
      has_function_privilege('authenticated','public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text)','EXECUTE') authenticated_create,
      has_function_privilege('service_role','public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text)','EXECUTE') service_create
  `);
  assert.deepEqual(security.rows[0], {
    cases_rls: true,
    reports_rls: true,
    anon_create: false,
    authenticated_create: false,
    service_create: true,
  });

  const finalState = await db.query(`
    select
      (select count(*)::int from public.comun_relata_public_snapshots) public_snapshots,
      (select count(*)::int from private.comun_forwarding_packages) packages,
      (select count(*)::int from private.comun_forwarding_attempts) attempts
  `);
  assert.deepEqual(finalState.rows[0], initial.rows[0]);
  assert.equal(hardDeletes, 0);
  assert.ok(requested.every((url) => url.startsWith(`${base}/`)));
  const serverLog = output.join("");
  for (const [text] of scenarios) assert.equal(serverLog.includes(text), false);

  console.log(JSON.stringify({
    result: "COMUN_P6C_A_SUS_PRIVATE_DISPOSABLE_E2E_GREEN",
    healthRouting: "subtypes_private",
    privacy: "sensitive_or_high_risk_never_public",
    urgentCare: "samu_guidance_no_call",
    photoOnly: "other_original_text_null",
    wrongReceipt: "denied",
    otherWallet: "isolated",
    sensitiveForwarding: "explicit_consent_required_off",
    externalRequests: 0,
    publicSnapshots: finalState.rows[0].public_snapshots,
    collectives: 0,
    hardDeletes,
  }));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (db._connected) await db.end();
  await stop();
}
