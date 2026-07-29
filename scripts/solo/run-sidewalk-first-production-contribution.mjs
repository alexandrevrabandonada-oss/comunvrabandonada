import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";

const { Client } = pg;
const cycleId =
  process.env.CYCLE_ID ?? "sidewalk-first-production-contribution-20260729-11";
const baseUrl = (
  process.env.COMUN_BASE_URL ?? "https://comunsocial.online"
).replace(/\/$/, "");
const projectRef = required("SUPABASE_PROJECT_REF");
const serviceRole = required("SUPABASE_SERVICE_ROLE_KEY");
const databaseUrl = required("SUPABASE_DB_URL");
const artifactDir = path.resolve(
  process.env.COMUN_ARTIFACT_DIR ??
    ".ci-artifacts/sidewalk-first-production-contribution",
);
const description = `[${cycleId}] Validação inaugural controlada do fluxo de contribuição do Mapa de Calçadas. Conteúdo sintético, sem dados pessoais ou de terceiros.`;

const evidence = {
  cycleId,
  cycleType: "first_controlled_production_write",
  startedAt: new Date().toISOString(),
  baseUrlHost: new URL(baseUrl).host,
  projectRefMatch: false,
  authSettingsHttpStatus: null,
  productionHttpStatus: null,
  captchaProviderObserved: "unknown",
  anonymousProviderObserved: "unknown",
  bootstrapOnPageLoad: false,
  submissionAttempt: 0,
  retryExecuted: false,
  signupRequestsBeforeSubmit: 0,
  signupRequestsTotal: 0,
  anonymousUsersCreated: "unknown",
  recordCountBefore: null,
  recordCountAfter: null,
  uploadCountAfter: null,
  photoLinkCountAfter: null,
  storageObjectCountAfter: null,
  inboxCountAfter: null,
  databaseWrites: "none",
  storageWrites: "none",
  contributionDisposition: "not_created",
  recordRef: null,
  actorRef: null,
  consoleErrors: 0,
  runtimeErrors: 0,
  challengeObserved: false,
  cycleResult:
    "COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_INSUFFICIENT_EVIDENCE",
};

await mkdir(artifactDir, { recursive: true });

let client;
let browser;
try {
  const authUrl = `https://${projectRef}.supabase.co`;
  evidence.projectRefMatch = true;
  const settingsResponse = await fetch(`${authUrl}/auth/v1/settings`, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
  });
  evidence.authSettingsHttpStatus = settingsResponse.status;
  if (!settingsResponse.ok) throw new Error("AUTH_SETTINGS_UNAVAILABLE");
  const settings = await settingsResponse.json();
  evidence.anonymousProviderObserved = observeAnonymousProvider(settings);
  evidence.captchaProviderObserved = observeCaptcha(settings);

  client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();

  const before = await inspectCycle(client, description);
  evidence.recordCountBefore = before.records.length;
  if (before.records.length !== 0) throw new Error("CYCLE_ALREADY_CONSUMED");

  const fixturePath = path.join(artifactDir, "controlled-sidewalk-fixture.jpg");
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#d8d8d8"/><path d="M0 430L800 180" stroke="#444" stroke-width="90"/><rect x="70" y="505" width="660" height="16" fill="#f0c400"/><text x="40" y="70" font-size="28" fill="#111">VALIDAÇÃO CONTROLADA COMUN</text></svg>';
  await sharp(Buffer.from(svg)).jpeg({ quality: 84 }).toFile(fixturePath);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    geolocation: { latitude: -22.5206, longitude: -44.1042 },
    permissions: ["geolocation"],
    locale: "pt-BR",
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const runtimeErrors = [];
  const signupRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /\/auth\/v1\/signup(?:\?|$)/.test(request.url())
    )
      signupRequests.push(request.url());
  });

  const response = await page.goto(
    `${baseUrl}/comun/mapa/contribuir?origem=calcadas`,
    { waitUntil: "networkidle", timeout: 60_000 },
  );
  evidence.productionHttpStatus = response?.status() ?? null;
  if (!response || response.status() !== 200)
    throw new Error("PRODUCTION_ROUTE_NOT_READY");
  await page
    .getByRole("heading", { name: "Registrar problema na calçada" })
    .waitFor({ state: "visible", timeout: 20_000 });
  evidence.signupRequestsBeforeSubmit = signupRequests.length;
  evidence.bootstrapOnPageLoad = signupRequests.length > 0;
  if (evidence.bootstrapOnPageLoad)
    throw new Error("BOOTSTRAP_OCCURRED_BEFORE_SUBMIT");

  await page.setInputFiles('input[name="photo"]', fixturePath);
  const mapButton = page.getByRole("button", {
    name: "Mapa para confirmar ou ajustar o ponto",
  });
  await mapButton.waitFor({ state: "visible", timeout: 30_000 });
  await mapButton.click({ position: { x: 300, y: 150 } });
  await page.getByText("Ruim", { exact: true }).click();
  await page.getByRole("button", { name: "Irregular", exact: true }).click();
  await page.getByLabel("Descrição opcional").fill(description);
  await page
    .getByRole("checkbox", {
      name: /Autorizo a publicação sanitizada da contribuição/,
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: /Conferi fotografia, local, condição e impacto/,
    })
    .check();

  const submit = page.getByRole("button", { name: "Enviar para revisão" });
  if (!(await submit.isEnabled()))
    throw new Error("SUBMISSION_BUTTON_NOT_READY");

  evidence.submissionAttempt = 1;
  await submit.click();
  const outcome = await waitForOutcome(page, 120_000);
  evidence.challengeObserved = outcome.challengeObserved;
  evidence.signupRequestsTotal = signupRequests.length;
  evidence.consoleErrors = consoleErrors.length;
  evidence.runtimeErrors = runtimeErrors.length;
  await page.screenshot({
    path: path.join(artifactDir, "production-outcome.png"),
    fullPage: true,
  });
  await context.close();

  const after = await inspectCycle(client, description);
  evidence.recordCountAfter = after.records.length;
  evidence.uploadCountAfter = after.uploads.length;
  evidence.photoLinkCountAfter = after.photoLinks.length;
  evidence.storageObjectCountAfter = after.storageObjects.length;
  evidence.inboxCountAfter = after.inbox.length;

  if (after.records.length === 0) {
    evidence.databaseWrites = "none";
    evidence.storageWrites = "none";
    evidence.contributionDisposition = "not_created";
    evidence.cycleResult = outcome.challengeObserved
      ? "COMUN_SIDEWALK_HCAPTCHA_HUMAN_CHALLENGE_REQUIRED_NO_WRITE"
      : "COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_BLOCKED_BEFORE_WRITE";
  } else {
    const record = after.records[0];
    evidence.recordRef = ref(record.id);
    evidence.actorRef = ref(record.member_user_id);
    evidence.anonymousUsersCreated = record.submitter_is_anonymous ? 1 : 0;
    evidence.databaseWrites = after.records.length === 1 ? "one" : "unexpected";
    evidence.storageWrites =
      after.storageObjects.length === 1 ? "one" : "unexpected";
    evidence.contributionDisposition = "preserved";
    const healthy =
      after.records.length === 1 &&
      after.uploads.length === 1 &&
      after.photoLinks.length === 1 &&
      after.storageObjects.length === 1 &&
      after.inbox.length === 1 &&
      record.submitter_is_anonymous === true &&
      record.status === "under_review" &&
      record.visibility === "internal" &&
      signupRequests.length === 1;
    evidence.cycleResult = healthy
      ? "COMUN_SIDEWALK_ANONYMOUS_AUTH_FIRST_CONTRIBUTION_GREEN_PRESERVED"
      : "COMUN_SIDEWALK_ANONYMOUS_AUTH_FIRST_CONTRIBUTION_CRITICAL";
  }
} catch (error) {
  evidence.failureCode = sanitizeError(error);
  if (client) {
    try {
      const after = await inspectCycle(client, description);
      evidence.recordCountAfter = after.records.length;
      evidence.uploadCountAfter = after.uploads.length;
      evidence.photoLinkCountAfter = after.photoLinks.length;
      evidence.storageObjectCountAfter = after.storageObjects.length;
      evidence.inboxCountAfter = after.inbox.length;
      if (after.records.length === 0) {
        evidence.databaseWrites = "none";
        evidence.storageWrites = "none";
        evidence.contributionDisposition = "not_created";
        evidence.cycleResult =
          "COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_BLOCKED_BEFORE_WRITE";
      } else {
        evidence.databaseWrites = "unexpected";
        evidence.storageWrites =
          after.storageObjects.length > 0 ? "unexpected" : "none";
        evidence.contributionDisposition = "contained_required";
        evidence.cycleResult =
          "COMUN_SIDEWALK_ANONYMOUS_AUTH_FIRST_CONTRIBUTION_CRITICAL";
      }
    } catch {
      evidence.cycleResult =
        "COMUN_SIDEWALK_FIRST_PRODUCTION_CONTRIBUTION_INSUFFICIENT_EVIDENCE";
    }
  }
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (client) await client.end().catch(() => undefined);
  evidence.finishedAt = new Date().toISOString();
  await writeArtifacts(evidence);
  console.log(evidence.cycleResult);
  if (process.env.GITHUB_STEP_SUMMARY)
    await writeFile(process.env.GITHUB_STEP_SUMMARY, markdown(evidence), {
      flag: "a",
    });
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function ref(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function observeAnonymousProvider(settings) {
  const candidates = [
    settings?.external?.anonymous,
    settings?.external?.anonymous_users,
    settings?.anonymous_users_enabled,
    settings?.external_anonymous_users_enabled,
  ];
  if (candidates.some((value) => value === true)) return "enabled";
  if (candidates.some((value) => value === false)) return "disabled";
  return "not_exposed";
}

function observeCaptcha(settings) {
  const text = JSON.stringify(settings).toLowerCase();
  if (text.includes("hcaptcha")) return "hcaptcha";
  if (text.includes("turnstile")) return "turnstile";
  if (text.includes("captcha")) return "configured_unclassified";
  return "not_exposed";
}

async function inspectCycle(db, privateNotes) {
  const records = (
    await db.query(
      `select id, member_user_id, submitter_is_anonymous, status, visibility
       from public.comun_sidewalk_records
       where private_notes = $1
       order by created_at asc`,
      [privateNotes],
    )
  ).rows;
  if (!records.length)
    return {
      records,
      uploads: [],
      photoLinks: [],
      storageObjects: [],
      inbox: [],
    };
  const ids = records.map((record) => record.id);
  const actors = records.map((record) => record.member_user_id);
  const uploads = (
    await db.query(
      `select id, record_id, object_key, status, confirmation_state
       from public.comun_sidewalk_uploads
       where record_id = any($1::uuid[])`,
      [ids],
    )
  ).rows;
  const photoLinks = (
    await db.query(
      `select record_id, original_asset_id, review_status
       from public.comun_sidewalk_record_photos
       where record_id = any($1::uuid[])`,
      [ids],
    )
  ).rows;
  const objectKeys = uploads.map((upload) => upload.object_key).filter(Boolean);
  const storageObjects = objectKeys.length
    ? (
        await db.query(
          `select name from storage.objects
           where bucket_id = 'archive-private-originals'
             and name = any($1::text[])`,
          [objectKeys],
        )
      ).rows
    : [];
  const inbox = (
    await db.query(
      `select member_user_id from public.comun_member_inbox
       where member_user_id = any($1::uuid[])
         and action_url = any($2::text[])`,
      [actors, ids.map((id) => `/comun/minha-participacao?registro=${id}`)],
    )
  ).rows;
  return { records, uploads, photoLinks, storageObjects, inbox };
}

async function waitForOutcome(page, timeoutMs) {
  const started = Date.now();
  let challengeObserved = false;
  while (Date.now() - started < timeoutMs) {
    if (/\/comun\/mapa\/contribuir\/confirmacao/.test(page.url()))
      return { status: "confirmed", challengeObserved };
    const heading = page.getByRole("heading", {
      name: /Recebemos seu registro/,
    });
    if (await heading.isVisible().catch(() => false))
      return { status: "confirmed", challengeObserved };
    const frames = page.frames().map((frame) => frame.url());
    if (frames.some((url) => /hcaptcha\.com/.test(url)))
      challengeObserved = true;
    const alert = page.locator('[role="alert"]');
    if (await alert.isVisible().catch(() => false)) {
      const text = (await alert.textContent().catch(() => "")) ?? "";
      if (/antirobô|captcha|sessão privada/i.test(text))
        return { status: "blocked", challengeObserved: true };
    }
    await page.waitForTimeout(1_000);
  }
  return { status: "timeout", challengeObserved };
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[database-url]")
    .replace(/eyJ[a-zA-Z0-9._-]+/g, "[jwt]")
    .replace(/[a-f0-9]{32,}/gi, "[opaque]")
    .slice(0, 180);
}

async function writeArtifacts(value) {
  const jsonPath = path.join(artifactDir, "result.json");
  const markdownPath = path.join(artifactDir, "result.md");
  await writeFile(jsonPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, markdown(value), "utf8");
}

function markdown(value) {
  return `# Primeira contribuição controlada em produção

- Resultado: \`${value.cycleResult}\`
- Cycle ID: \`${value.cycleId}\`
- Auth settings: \`${value.authSettingsHttpStatus ?? "unknown"}\`
- Produção: \`${value.productionHttpStatus ?? "unknown"}\`
- CAPTCHA observado: \`${value.captchaProviderObserved}\`
- Provedor anônimo observado: \`${value.anonymousProviderObserved}\`
- Bootstrap no carregamento: \`${value.bootstrapOnPageLoad}\`
- Tentativas de submissão: \`${value.submissionAttempt}\`
- Retry: \`${value.retryExecuted}\`
- Requisições de signup: \`${value.signupRequestsTotal}\`
- Registros antes/depois: \`${value.recordCountBefore ?? "unknown"}/${value.recordCountAfter ?? "unknown"}\`
- Uploads: \`${value.uploadCountAfter ?? "unknown"}\`
- Vínculos de foto: \`${value.photoLinkCountAfter ?? "unknown"}\`
- Objetos privados: \`${value.storageObjectCountAfter ?? "unknown"}\`
- Inbox: \`${value.inboxCountAfter ?? "unknown"}\`
- Escrita no banco: \`${value.databaseWrites}\`
- Escrita no Storage: \`${value.storageWrites}\`
- Disposição: \`${value.contributionDisposition}\`
- Desafio humano observado: \`${value.challengeObserved}\`
- Erros de console/runtime: \`${value.consoleErrors}/${value.runtimeErrors}\`
${value.failureCode ? `- Falha sanitizada: \`${value.failureCode}\`\n` : ""}
`;
}
