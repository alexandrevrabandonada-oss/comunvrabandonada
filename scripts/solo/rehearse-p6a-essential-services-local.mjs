import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";

const base = (process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3156").replace(
  /\/$/,
  "",
);
const dbUrl = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL ?? "";
if (
  !/^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\/postgres(?:[/?]|$)/.test(
    dbUrl,
  )
)
  throw new Error("COMUN_P6A_LOCAL_DATABASE_REQUIRED");
for (const flag of [
  "COMUN_ESSENTIAL_SERVICES_ENABLED",
  "COMUN_ESSENTIAL_FORWARDING_ASSISTED_ENABLED",
]) {
  if (process.env[flag] !== "enabled")
    throw new Error(`COMUN_P6A_FLAG_REQUIRED:${flag}`);
}
if (process.env.COMUN_RELATA_COLLECTIVE_ENABLED === "enabled")
  throw new Error("COMUN_P6A_COLLECTIVE_MUST_BE_OFF");

const secret = () => randomBytes(32).toString("base64url");
const requested = [];

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

async function http(path, init = {}, jar = primary) {
  const url = `${base}${path}`;
  assert.ok(url.startsWith(`${base}/`), "external request refused");
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
  return { response, body };
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

const primary = new Jar();
const db = new pg.Client({ connectionString: dbUrl });
let uiBrowser;
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
        `COMUN_P6A_SERVER_EXIT_${server.exitCode}\n${output.join("")}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.equal(ready, true, output.join(""));

  uiBrowser = await chromium.launch({ headless: true });
  const page = await uiBrowser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await page.goto(`${base}/comun/relatar`, { waitUntil: "networkidle" });
  await page.locator("[data-comun-quick-capture-v2='true']").waitFor();
  const textInput = page.getByLabel(/Uma frase basta|A descrição é opcional/);
  await textInput.fill("Estamos sem água desde ontem.");
  assert.equal(await page.getByText("Uma confirmação rápida").count(), 0);
  assert.equal(await page.getByRole("button", { name: "Guardar" }).count(), 1);
  await textInput.fill("A rua inteira está sem luz.");
  assert.equal(await page.getByText("Uma confirmação rápida").count(), 1);
  assert.equal(
    await page
      .getByText(
        "As casas também estão sem energia ou apenas as luminárias da rua?",
      )
      .count(),
    1,
  );
  const accessibility = await new AxeBuilder({ page }).analyze();
  assert.equal(
    accessibility.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ).length,
    0,
  );
  if (process.env.P6A_SCREENSHOT_PATH)
    await page.screenshot({
      path: process.env.P6A_SCREENSHOT_PATH,
      fullPage: true,
    });
  await uiBrowser.close();
  uiBrowser = undefined;

  await db.connect();

  const water = await capture("Estamos sem água desde ontem.");
  assert.equal(water.response.status, 201, JSON.stringify(water.body));
  assert.equal(water.body.receipt.category, "water_supply");
  assert.ok(water.body.walletItemId);
  assert.equal(water.body.noOfficialSend, true);
  const location = await http("/api/comun/relata/evidence/location", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      longitude: -44.09,
      latitude: -22.51,
      origin: "map_pin",
      accuracyMeters: null,
      capturedAt: "2026-08-09T12:00:00.000Z",
    }),
  });
  assert.equal(location.status, 200, await location.text());
  const waterPrepared = await http(
    `/api/comun/essential-services/packages/${water.body.walletItemId}/prepare`,
    { method: "POST" },
  );
  const waterPackage = await waterPrepared.json();
  assert.equal(waterPrepared.status, 201, JSON.stringify(waterPackage));
  assert.equal(waterPackage.package.category, "water_supply");
  assert.equal(waterPackage.channels[0].institution, "SAAE Volta Redonda");
  assert.equal(waterPackage.noOfficialSend, true);
  assert.ok(!JSON.stringify(waterPackage.package).includes("-44.09"));
  assert.ok(!JSON.stringify(waterPackage.package).includes("-22.51"));
  const waterPackageId = waterPackage.package.package_id;
  const waterOpen = await http(
    `/api/comun/essential-services/packages/${water.body.walletItemId}/${waterPackageId}/open`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId: "saaevr-115" }),
    },
  );
  const waterOpenBody = await waterOpen.json();
  assert.equal(waterOpen.status, 200, JSON.stringify(waterOpenBody));
  assert.equal(waterOpenBody.destination, "tel:115");
  assert.equal(waterOpenBody.attempt.attempt_state, "prepared");
  const waterOpenAgain = await http(
    `/api/comun/essential-services/packages/${water.body.walletItemId}/${waterPackageId}/open`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId: "saaevr-115" }),
    },
  );
  assert.equal(waterOpenAgain.status, 200);
  assert.equal(
    (
      await db.query(
        "select count(*)::int count from private.comun_forwarding_attempts where package_id=$1",
        [waterPackageId],
      )
    ).rows[0].count,
    1,
  );

  const invalidJar = new Jar();
  invalidJar.values.set("comun_participation_wallet_v1", secret());
  assert.equal(
    (
      await http(
        `/api/comun/essential-services/packages/${water.body.walletItemId}`,
        {},
        invalidJar,
      )
    ).status,
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
  assert.equal(
    (
      await http(
        `/api/comun/essential-services/packages/${water.body.walletItemId}`,
        {},
        otherWallet,
      )
    ).status,
    404,
  );

  const energy = await capture("O bairro está sem energia.");
  assert.equal(energy.body.receipt.category, "power_distribution");
  const energyPrepared = await http(
    `/api/comun/essential-services/packages/${energy.body.walletItemId}/prepare`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category: "water_supply" }),
    },
  );
  const energyPackage = await energyPrepared.json();
  assert.equal(energyPackage.package.category, "power_distribution");
  assert.ok(
    energyPackage.channels.every((channel) => channel.institution === "Light"),
  );
  const energyOpen = await http(
    `/api/comun/essential-services/packages/${energy.body.walletItemId}/${energyPackage.package.package_id}/open`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channelId: "light-agencia-virtual" }),
    },
  );
  assert.equal(
    (await energyOpen.json()).destination,
    "https://agenciavirtual.light.com.br/",
  );

  const lighting = await capture("O poste está apagado.");
  assert.equal(lighting.body.receipt.category, "public_lighting");
  const lightingPrepared = await http(
    `/api/comun/essential-services/packages/${lighting.body.walletItemId}/prepare`,
    { method: "POST" },
  );
  const lightingPackage = await lightingPrepared.json();
  assert.equal(lightingPackage.package.category, "public_lighting");
  assert.ok(
    lightingPackage.channels.some(
      (channel) => channel.institution === "Prefeitura de Volta Redonda",
    ),
  );

  const ambiguousProof = { idempotencyKey: secret(), receiptSecret: secret() };
  const ambiguous = await http("/api/comun/relata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "A rua inteira está sem luz.",
      answers: {},
      hasPhoto: false,
      captureMode: "quick_v2",
      ...ambiguousProof,
    }),
  });
  assert.equal(ambiguous.status, 409);
  assert.equal((await ambiguous.json()).code, "triage_incomplete");
  const beforeAnswer = await db.query(
    "select count(*)::int count from private.comun_relata_reports where idempotency_hash=extensions.digest('relata-idempotency-v1:'||$1,'sha256')",
    [ambiguousProof.idempotencyKey],
  );
  assert.equal(beforeAnswer.rows[0].count, 0);
  const ambiguousYes = await http("/api/comun/relata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: "A rua inteira está sem luz.",
      answers: { homes_power: "sim" },
      hasPhoto: false,
      captureMode: "quick_v2",
      ...ambiguousProof,
    }),
  });
  const ambiguousYesBody = await ambiguousYes.json();
  assert.equal(ambiguousYesBody.receipt.category, "power_distribution");
  assert.equal(
    (
      await db.query(
        "select count(*)::int count from public.comun_relata_cases where protocol=$1",
        [ambiguousYesBody.receipt.protocol],
      )
    ).rows[0].count,
    1,
  );
  const ambiguousNo = await capture("A rua inteira está sem luz.", {
    homes_power: "nao",
  });
  assert.equal(ambiguousNo.body.receipt.category, "public_lighting");

  const hazard = await capture("Há fio caído soltando faísca.");
  assert.equal(hazard.body.receipt.category, "electrical_hazard");
  assert.equal(
    (
      await http(
        `/api/comun/essential-services/packages/${hazard.body.walletItemId}/prepare`,
        { method: "POST" },
      )
    ).status,
    404,
  );

  const photoOnly = await capture(null, {}, primary, { hasPhoto: true });
  assert.equal(photoOnly.body.receipt.category, "other");
  const photoIdsBefore = await db.query(
    "select r.id report_id,c.id case_id,r.original_text from private.comun_relata_reports r join public.comun_relata_cases c on c.report_id=r.id where c.protocol=$1",
    [photoOnly.body.receipt.protocol],
  );
  assert.equal(photoIdsBefore.rows[0].original_text, null);
  const classified = await http("/api/comun/relata/classification", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "A luminária da rua não acende." }),
  });
  const classifiedBody = await classified.json();
  assert.equal(classified.status, 200, JSON.stringify(classifiedBody));
  assert.equal(classifiedBody.classification.category, "public_lighting");
  assert.equal(
    classifiedBody.classification.report_id,
    photoIdsBefore.rows[0].report_id,
  );
  assert.equal(
    classifiedBody.classification.case_id,
    photoIdsBefore.rows[0].case_id,
  );
  assert.equal(
    classifiedBody.classification.protocol,
    photoOnly.body.receipt.protocol,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int count from private.comun_relata_classification_events where report_id=$1",
        [photoIdsBefore.rows[0].report_id],
      )
    ).rows[0].count,
    1,
  );

  const waterAttempt = (
    await db.query(
      "select id,state,due_at from private.comun_forwarding_attempts where package_id=$1",
      [waterPackageId],
    )
  ).rows[0];
  assert.equal(waterAttempt.state, "prepared");
  assert.equal(waterAttempt.due_at, null);
  const declared = await http(
    `/api/comun/essential-services/attempts/${waterAttempt.id}/declare-sent`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sent: true }),
    },
  );
  assert.equal(declared.status, 200);
  const recorded = await http(
    `/api/comun/essential-services/attempts/${waterAttempt.id}/response`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        note: "Resposta sintética registrada somente no laboratório descartável.",
        officialProtocol: "P6A-FIXTURE-001",
        resolved: false,
      }),
    },
  );
  assert.equal(recorded.status, 200);

  const security = await db.query(`
    select
      has_function_privilege('anon','public.comun_essential_assisted_prepare(text,uuid)','execute') anon_execute,
      has_function_privilege('authenticated','public.comun_essential_assisted_prepare(text,uuid)','execute') auth_execute,
      (select relrowsecurity and relforcerowsecurity from pg_class where oid='private.comun_forwarding_packages'::regclass) package_rls,
      (select count(*)::int from public.comun_relata_public_snapshots) public_snapshots
  `);
  assert.equal(security.rows[0].anon_execute, false);
  assert.equal(security.rows[0].auth_execute, false);
  assert.equal(security.rows[0].package_rls, true);
  assert.equal(security.rows[0].public_snapshots, 0);
  assert.ok(requested.every((url) => url.startsWith(`${base}/`)));

  console.log(
    JSON.stringify({
      result: "COMUN_P6A_ESSENTIAL_SERVICES_DISPOSABLE_E2E_GREEN",
      water: "prepared_then_person_declared_sent_then_response",
      energy: "prepared",
      lighting: "prepared",
      ambiguity: "exactly_one_decision_one_protocol",
      photoOnly: "same_report_same_case_same_protocol",
      externalRequests: 0,
      automaticSend: false,
      publicSnapshots: 0,
      hardDeletes: 0,
    }),
  );
} finally {
  if (uiBrowser) await uiBrowser.close().catch(() => {});
  if (db._connected) await db.end();
  await stop();
}
