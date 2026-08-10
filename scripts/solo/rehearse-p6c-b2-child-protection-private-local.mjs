import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3160").replace(
  /\/$/,
  "",
);
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(
    dbUrl,
  )
)
  throw new Error("COMUN_P6C_B2_LOCAL_DATABASE_REQUIRED");
if (process.env.COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_ENABLED !== "enabled")
  throw new Error("COMUN_P6C_B2_CLASSIFICATION_FLAG_REQUIRED");
if (process.env.COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED === "enabled")
  throw new Error("COMUN_P6C_B2_FORWARDING_MUST_BE_OFF");
if (process.env.COMUN_RELATA_COLLECTIVE_ENABLED === "enabled")
  throw new Error("COMUN_P6C_B2_COLLECTIVE_MUST_BE_OFF");

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
    for (const value of values)
      for (const part of value.split(/,(?=[^;,]+=)/)) {
        const pair = part.split(";", 1)[0];
        const separator = pair.indexOf("=");
        if (separator > 0)
          this.values.set(pair.slice(0, separator), pair.slice(separator + 1));
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
for (const stream of [server.stdout, server.stderr])
  stream.on("data", (chunk) => {
    output.push(String(chunk));
    if (output.length > 100) output.shift();
  });
async function stop() {
  if (server.exitCode !== null) return;
  try {
    if (process.platform !== "win32" && server.pid)
      process.kill(-server.pid, "SIGTERM");
    else if (server.pid)
      await new Promise((resolve) => {
        const killer = spawn(
          "taskkill.exe",
          ["/pid", String(server.pid), "/t", "/f"],
          { windowsHide: true, stdio: "ignore" },
        );
        killer.once("exit", resolve);
        killer.once("error", resolve);
      });
  } catch {}
}

const db = new pg.Client({ connectionString: dbUrl });
let browser;
try {
  let ready = false;
  for (let index = 0; index < 90; index += 1) {
    try {
      if ((await fetch(`${base}/comun/relatar`)).status === 200) {
        ready = true;
        break;
      }
    } catch {}
    if (server.exitCode !== null)
      throw new Error(
        `COMUN_P6C_B2_SERVER_EXIT_${server.exitCode}\n${output.join("")}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(ready, true, output.join(""));

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const browserRequests = [];
  page.on("request", (request) => browserRequests.push(request.url()));
  await page.goto(`${base}/comun/relatar`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-comun-capture-hydrated='true']").waitFor();
  await page
    .getByLabel(/Uma frase basta|A descrição é opcional/)
    .fill("Há uma situação grave de proteção envolvendo uma criança.");
  await page.getByText("Há perigo imediato agora?").waitFor();
  assert.equal(await page.getByRole("button", { name: "Guardar" }).count(), 1);
  assert.equal(
    await page.getByText(/Não inclua nome, documento, endereço/).count(),
    1,
  );
  assert.equal(
    await page.getByText(/Isso é opcional. Você já pode guardar/).count(),
    1,
  );
  const accessibility = await new AxeBuilder({ page }).analyze();
  assert.equal(
    accessibility.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ).length,
    0,
  );
  assert.ok(
    browserRequests.every(
      (url) => new URL(url).origin === new URL(base).origin,
    ),
  );
  await context.close();
  await browser.close();
  browser = undefined;

  await db.connect();
  const initial = await db.query(`select
    (select count(*)::int from public.comun_relata_public_snapshots) public_snapshots,
    (select count(*)::int from private.comun_forwarding_packages) packages,
    (select count(*)::int from private.comun_forwarding_attempts) attempts`);

  const scenarios = [
    [
      "Uma criança pode estar em perigo imediato.",
      "child_protection",
      "immediate_danger",
      true,
      "emergency",
    ],
    [
      "Há suspeita de uma violação grave dos direitos de uma criança.",
      "child_protection",
      "exploitation_or_rights_violation",
      null,
      "urgent",
    ],
    [
      "A escola está sem professor.",
      "public_education",
      undefined,
      undefined,
      undefined,
    ],
    [
      "Um estudante relatou bullying, sem indicação de perigo imediato.",
      "public_education",
      undefined,
      undefined,
      undefined,
    ],
    [
      "Há uma situação séria de proteção envolvendo uma criança na escola.",
      "child_protection",
      "other_child_protection",
      null,
      "urgent",
    ],
    [
      "Professor está sem receber salário.",
      "workplace",
      undefined,
      undefined,
      undefined,
    ],
    [
      "Tem uma coisa estranha acontecendo aqui.",
      "other",
      undefined,
      undefined,
      undefined,
    ],
  ];
  const created = [];
  for (const [text, category, subtype, immediateDanger, urgency] of scenarios) {
    const body = await capture(text);
    assert.equal(body.receipt.category, category);
    created.push({ body, text, category, subtype, immediateDanger, urgency });
  }

  const forged = await capture(
    "Há uma situação grave de proteção envolvendo uma criança.",
    {},
    primary,
    { category: "public_lighting" },
  );
  assert.equal(forged.receipt.category, "child_protection");
  created.push({
    body: forged,
    text: "forged-category",
    category: "child_protection",
    subtype: "other_child_protection",
    immediateDanger: null,
    urgency: "urgent",
  });

  const photoOnly = await capture(null, {}, primary, { hasPhoto: true });
  assert.equal(photoOnly.receipt.category, "other");
  created.push({ body: photoOnly, text: null, category: "other" });

  for (const fixture of created) {
    const result = await db.query(
      `select r.original_text,r.privacy_class,r.retention_class,c.id case_id,c.category,c.urgency,c.routing_decision,
      (select count(*)::int from private.comun_participation_wallet_items wi where wi.subject_ref=c.id::text and wi.item_type='relata_report') wallet_items,
      (select coalesce(jsonb_agg(wi.metadata),'[]'::jsonb) from private.comun_participation_wallet_items wi where wi.subject_ref=c.id::text and wi.item_type='relata_report') wallet_metadata,
      (select count(*)::int from public.comun_relata_public_snapshots s where s.case_id=c.id) snapshots,
      (select count(*)::int from private.comun_forwarding_packages p where p.relata_case_id=c.id) packages
      from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id where c.protocol=$1`,
      [fixture.body.receipt.protocol],
    );
    assert.equal(result.rowCount, 1);
    const row = result.rows[0];
    assert.equal(row.wallet_items, 1);
    assert.equal(row.snapshots, 0);
    assert.equal(row.packages, 0);
    assert.equal("matchedSignals" in row.routing_decision, false);
    if (fixture.text === null) {
      assert.equal(row.original_text, null);
      assert.equal(row.category, "other");
    }
    if (fixture.category === "child_protection") {
      assert.equal(row.privacy_class, "high_risk");
      assert.equal(row.retention_class, "sensitive");
      assert.equal(row.routing_decision.publication, "never_automatic");
      assert.equal(row.routing_decision.requiresHumanReview, true);
      assert.equal(
        row.routing_decision.routingVersion,
        "comun-child-protection-routing-v1",
      );
      assert.equal(
        row.routing_decision.childProtectionIssueType,
        fixture.subtype,
      );
      assert.equal(
        row.routing_decision.immediateDanger,
        fixture.immediateDanger,
      );
      assert.equal(row.urgency, fixture.urgency);
      assert.deepEqual(row.wallet_metadata, [
        { immediateDanger: fixture.immediateDanger === true },
      ]);
      assert.equal(
        JSON.stringify(row.wallet_metadata).includes(
          "childProtectionIssueType",
        ),
        false,
      );
    }
  }

  const beforePhotoTransition = await db.query(
    `select r.id report_id,c.id case_id,c.protocol from public.comun_relata_cases c
     join private.comun_relata_reports r on r.id=c.report_id where c.protocol=$1`,
    [photoOnly.receipt.protocol],
  );
  const photoTransition = await http("/api/comun/relata/classification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "Há uma situação grave de proteção envolvendo uma criança.",
    }),
  });
  assert.equal(photoTransition.status, 200, await photoTransition.text());
  const afterPhotoTransition = await db.query(
    `select r.id report_id,c.id case_id,c.protocol,c.category,r.privacy_class,
      (select count(*)::int from private.comun_relata_classification_events e
       where e.case_id=c.id and e.previous_category='other' and e.next_category='child_protection') events
     from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id where c.protocol=$1`,
    [photoOnly.receipt.protocol],
  );
  assert.equal(
    afterPhotoTransition.rows[0].report_id,
    beforePhotoTransition.rows[0].report_id,
  );
  assert.equal(
    afterPhotoTransition.rows[0].case_id,
    beforePhotoTransition.rows[0].case_id,
  );
  assert.equal(
    afterPhotoTransition.rows[0].protocol,
    beforePhotoTransition.rows[0].protocol,
  );
  assert.equal(afterPhotoTransition.rows[0].category, "child_protection");
  assert.equal(afterPhotoTransition.rows[0].privacy_class, "high_risk");
  assert.equal(afterPhotoTransition.rows[0].events, 1);

  const educationForTransition = await capture(
    "A escola está sem professor e precisa de apoio.",
  );
  assert.equal(educationForTransition.receipt.category, "public_education");
  const beforeEducationTransition = await db.query(
    `select r.id report_id,r.original_text,c.id case_id,c.protocol from public.comun_relata_cases c
     join private.comun_relata_reports r on r.id=c.report_id where c.protocol=$1`,
    [educationForTransition.receipt.protocol],
  );
  const educationTransition = await http("/api/comun/relata/classification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "Há uma situação grave de proteção envolvendo uma criança.",
    }),
  });
  assert.equal(
    educationTransition.status,
    200,
    await educationTransition.text(),
  );
  const afterEducationTransition = await db.query(
    `select r.id report_id,r.original_text,c.id case_id,c.protocol,c.category,r.privacy_class,
      (select count(*)::int from private.comun_relata_classification_events e
       where e.case_id=c.id and e.previous_category='public_education' and e.next_category='child_protection') events
     from public.comun_relata_cases c join private.comun_relata_reports r on r.id=c.report_id where c.protocol=$1`,
    [educationForTransition.receipt.protocol],
  );
  assert.equal(
    afterEducationTransition.rows[0].report_id,
    beforeEducationTransition.rows[0].report_id,
  );
  assert.equal(
    afterEducationTransition.rows[0].case_id,
    beforeEducationTransition.rows[0].case_id,
  );
  assert.equal(
    afterEducationTransition.rows[0].protocol,
    beforeEducationTransition.rows[0].protocol,
  );
  assert.equal(afterEducationTransition.rows[0].category, "child_protection");
  assert.equal(afterEducationTransition.rows[0].privacy_class, "high_risk");
  assert.equal(afterEducationTransition.rows[0].events, 1);
  assert.ok(
    afterEducationTransition.rows[0].original_text.startsWith(
      beforeEducationTransition.rows[0].original_text,
    ),
  );
  assert.ok(
    afterEducationTransition.rows[0].original_text.includes(
      "Contexto adicional:",
    ),
  );

  const channels = await http("/api/comun/child-protection-channels");
  const channelBody = await channels.json();
  assert.equal(channels.status, 200);
  assert.equal(channelBody.informationalOnly, true);
  assert.ok(
    channelBody.channels.every(
      (channel) => channel.automationAllowed === false,
    ),
  );
  assert.ok(
    channelBody.channels.every(
      (channel) => channel.operationalStatus === "operationally_unchecked",
    ),
  );
  assert.ok(
    channelBody.channels.some(
      (channel) =>
        channel.sourceStatus === "source_conflict" &&
        channel.destination === null,
    ),
  );

  const invalidReceipt = new Jar();
  invalidReceipt.values.set(
    "comun_relata_receipt_v1",
    Buffer.from(
      JSON.stringify({
        protocol: created[0].body.receipt.protocol,
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
  assert.equal((await otherWalletList.json()).items.length, 0);

  const security = await db.query(`select
    (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.comun_relata_cases'::regclass) cases_rls,
    (select relrowsecurity and relforcerowsecurity from pg_class where oid='private.comun_relata_reports'::regclass) reports_rls,
    has_function_privilege('anon','public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text)','EXECUTE') anon_create,
    has_function_privilege('authenticated','public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text)','EXECUTE') authenticated_create,
    has_function_privilege('service_role','public.comun_relata_create(text,text,text,jsonb,text,text,text,jsonb,text,text)','EXECUTE') service_create`);
  assert.deepEqual(security.rows[0], {
    cases_rls: true,
    reports_rls: true,
    anon_create: false,
    authenticated_create: false,
    service_create: true,
  });

  const finalState = await db.query(`select
    (select count(*)::int from public.comun_relata_public_snapshots) public_snapshots,
    (select count(*)::int from private.comun_forwarding_packages) packages,
    (select count(*)::int from private.comun_forwarding_attempts) attempts`);
  assert.deepEqual(finalState.rows[0], initial.rows[0]);
  assert.equal(hardDeletes, 0);
  assert.ok(requested.every((url) => url.startsWith(`${base}/`)));
  const serverLog = output.join("");
  for (const [text] of scenarios) assert.equal(serverLog.includes(text), false);

  console.log(
    JSON.stringify({
      result: "COMUN_P6C_B2_CHILD_PROTECTION_PRIVATE_DISPOSABLE_E2E_GREEN",
      childProtection: "high_risk_never_public",
      photoOnly: "other_semantic_text_absent",
      wrongReceipt: "denied",
      otherWallet: "isolated",
      sensitiveForwarding: "disabled",
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
