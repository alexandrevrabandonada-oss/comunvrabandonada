import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3157").replace(
  /\/$/,
  "",
);
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(
    dbUrl,
  )
)
  throw new Error("COMUN_P6B_A_LOCAL_DATABASE_REQUIRED");
if (process.env.COMUN_ENVIRONMENTAL_INCIDENTS_ENABLED !== "enabled")
  throw new Error("COMUN_P6B_A_CLASSIFICATION_FLAG_REQUIRED");
if (process.env.COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_ENABLED === "enabled")
  throw new Error("COMUN_P6B_A_FORWARDING_MUST_BE_OFF");
if (process.env.COMUN_RELATA_COLLECTIVE_ENABLED === "enabled")
  throw new Error("COMUN_P6B_A_COLLECTIVE_MUST_BE_OFF");

const secret = () => randomBytes(32).toString("base64url");
const requested = [];
let hardDeletes = 0;

class Jar {
  values = new Map();
  header() {
    return [...this.values]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
  absorb(response) {
    const values =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [response.headers.get("set-cookie") ?? ""];
    for (const value of values) {
      for (const part of value.split(/,(?=[^;,]+=)/)) {
        const pair = part.split(";", 1)[0];
        const separator = pair.indexOf("=");
        if (separator > 0)
          this.values.set(pair.slice(0, separator), pair.slice(separator + 1));
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
  const response = await http(
    "/api/comun/relata",
    {
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
    },
    jar,
  );
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
  [
    "run",
    process.env.COMUN_R2A_USE_BUILT_SERVER === "1" ? "start" : "dev",
    "--",
    "-p",
    port,
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
server.stdout.on("data", (chunk) => {
  output.push(String(chunk));
  if (output.length > 100) output.shift();
});
server.stderr.on("data", (chunk) => {
  output.push(String(chunk));
  if (output.length > 100) output.shift();
});
async function stop() {
  if (server.exitCode !== null) return;
  try {
    if (process.platform !== "win32" && server.pid)
      process.kill(-server.pid, "SIGTERM");
    else server.kill("SIGTERM");
  } catch {}
}

const db = new pg.Client({ connectionString: dbUrl });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      if ((await fetch(`${base}/comun/relatar`)).status === 200) {
        ready = true;
        break;
      }
    } catch {}
    if (server.exitCode !== null)
      throw new Error(
        `COMUN_P6B_A_SERVER_EXIT_${server.exitCode}\n${output.join("")}`,
      );
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
  await textInput.fill("Tem muita fumaça no morro.");
  await page.getByText("Você consegue ver chamas agora?").waitFor();
  assert.equal(await page.getByRole("button", { name: "Guardar" }).count(), 1);
  for (const label of ["Sim, há chamas", "Não vejo chamas", "Não sei"])
    assert.equal(await page.getByRole("button", { name: label }).count(), 1);
  assert.match(
    await textInput.getAttribute("placeholder"),
    /sem água.*fumaça.*entulho/i,
  );
  const accessibility = await new AxeBuilder({ page }).analyze();
  assert.equal(
    accessibility.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ).length,
    0,
  );
  if (process.env.P6B_A_SCREENSHOT_PATH)
    await page.screenshot({
      path: process.env.P6B_A_SCREENSHOT_PATH,
      fullPage: true,
    });
  assert.ok(
    browserRequests.every((url) => new URL(url).origin === new URL(base).origin),
  );
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
    ["Está pegando fogo no mato.", {}, "active_fire", "emergency"],
    [
      "O fogo já apagou, só ficou fumaça.",
      {},
      "smoke_or_environmental_trace",
      "attention",
    ],
    [
      "Tem fumaça no morro.",
      {},
      "smoke_or_environmental_trace",
      "attention",
    ],
    ["Está caindo pó preto.", {}, "environmental_pollution", "attention"],
    ["Tem cheiro químico forte.", {}, "environmental_pollution", "attention"],
    ["Jogaram entulho na rua.", {}, "waste_or_debris", "attention"],
    ["Tem lixo pegando fogo.", {}, "active_fire", "emergency"],
    ["Tem uma coisa estranha acontecendo aqui.", {}, "other", "attention"],
  ];
  const created = [];
  for (const [text, answers, category, urgency] of scenarios) {
    const body = await capture(text, answers);
    assert.equal(body.receipt.category, category);
    assert.equal(body.receipt.urgency, urgency);
    created.push(body);
  }

  const unknownFlames = await capture("Tem fumaça no morro.", {
    smoke_active: "nao_sei",
  });
  assert.equal(
    unknownFlames.receipt.category,
    "smoke_or_environmental_trace",
  );
  created.push(unknownFlames);

  const photoOnly = await capture(null, {}, primary, { hasPhoto: true });
  assert.equal(photoOnly.receipt.category, "other");
  created.push(photoOnly);

  for (const body of created) {
    const rows = await db.query(
      `select r.original_text,c.category,c.routing_decision,
        (select count(*)::int from private.comun_participation_wallet_items wi
         where wi.subject_ref=c.id::text and wi.item_type='relata_report') wallet_items
       from public.comun_relata_cases c
       join private.comun_relata_reports r on r.id=c.report_id
       where c.protocol=$1`,
      [body.receipt.protocol],
    );
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].wallet_items, 1);
    assert.equal(rows.rows[0].category, body.receipt.category);
    assert.equal("matchedSignals" in rows.rows[0].routing_decision, false);
  }
  const photoRow = await db.query(
    `select r.original_text,c.category
       from public.comun_relata_cases c
       join private.comun_relata_reports r on r.id=c.report_id
       where c.protocol=$1`,
    [photoOnly.receipt.protocol],
  );
  assert.equal(photoRow.rows[0].original_text, null);
  assert.equal(photoRow.rows[0].category, "other");

  const invalidReceipt = new Jar();
  invalidReceipt.values.set(
    "comun_relata_receipt_v1",
    Buffer.from(
      JSON.stringify({
        protocol: created[0].receipt.protocol,
        receiptSecret: secret(),
      }),
    ).toString("base64url"),
  );
  assert.equal(
    (await http("/api/comun/relata/receipt", {}, invalidReceipt)).status,
    404,
  );

  const otherWallet = new Jar();
  assert.equal(
    (
      await http(
        "/api/comun/participation-wallet",
        { method: "POST" },
        otherWallet,
      )
    ).status,
    201,
  );
  const otherWalletList = await http(
    "/api/comun/participation-wallet",
    {},
    otherWallet,
  );
  const otherWalletBody = await otherWalletList.json();
  assert.equal(otherWalletList.status, 200);
  assert.equal(otherWalletBody.items.length, 0);

  const finalState = await db.query(`
    select
      (select count(*)::int from public.comun_relata_public_snapshots) public_snapshots,
      (select count(*)::int from private.comun_forwarding_packages) packages,
      (select count(*)::int from private.comun_forwarding_attempts) attempts
  `);
  assert.deepEqual(finalState.rows[0], {
    public_snapshots: initial.rows[0].public_snapshots,
    packages: initial.rows[0].packages,
    attempts: initial.rows[0].attempts,
  });
  assert.equal(hardDeletes, 0);
  assert.ok(requested.every((url) => url.startsWith(`${base}/`)));
  const serverLog = output.join("");
  for (const [text] of scenarios) assert.equal(serverLog.includes(text), false);

  console.log(
    JSON.stringify({
      result: "COMUN_P6B_A_ENVIRONMENTAL_INCIDENTS_DISPOSABLE_E2E_GREEN",
      fire: "active_emergency_no_send",
      smoke: "optional_question_capture_first",
      pollution: "recognized_without_attribution",
      waste: "recognized",
      riskDominance: "one_report_one_protocol",
      photoOnly: "other_original_text_null",
      wrongReceipt: "denied",
      otherWallet: "isolated",
      forwarding: "schema_extension_deferred",
      externalRequests: 0,
      publicSnapshots: finalState.rows[0].public_snapshots,
      collectives: 0,
      hardDeletes,
    }),
  );
} finally {
  if (browser) await browser.close().catch(() => {});
  if (db._connected) await db.end();
  await stop();
}
