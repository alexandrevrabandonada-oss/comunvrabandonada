import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { assertLocalEnvironment } from "../../../scripts/local-environment.mjs";
import { cleanupOperationalPersonas, ensureLocalOperationalPersona, operationalPassword } from "./operational-personas.mjs";
import { localServiceClient } from "./local-fixtures.mjs";
import { validateOperationalStorageState } from "./operational-storage-state.mjs";

function prepare() {
  process.env.DO_NOT_TRACK = "1";
  process.env.SUPABASE_DISABLE_TELEMETRY = "1";
  process.env.ALLOW_LOCAL_TESTS = "true";
  process.env.COMUN_BASE_URL ??= "http://127.0.0.1:3102";
  process.env.MEDIA_STORAGE_PROVIDER ??= "supabase-local";
  assertLocalEnvironment();
  const readiness = execFileSync("node", ["scripts/check-comun-auth-readiness.mjs"], { encoding: "utf8", env: process.env });
  if (!readiness.includes("COMUN_LOCAL_AUTH_READY")) throw new Error("Auth readiness não emitiu COMUN_LOCAL_AUTH_READY");
}

export default async function paginationGlobalSetup() {
  prepare();
  const runId = `pagination-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  process.env.COMUN_TEST_RUN_ID = runId;
  process.env.COMUN_TEST_SUITE = "editorial-pagination";
  const base = process.env.COMUN_BASE_URL;
  const root = `.local/comun-auth/${runId}`;
  await cleanupOperationalPersonas();
  await rm(".local/comun-auth", { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  const operations = await ensureLocalOperationalPersona({ persona: "operations_admin", runId, globalRole: "viewer" });
  const participant = await ensureLocalOperationalPersona({ persona: "participant", runId });
  const db = localServiceClient();
  const inserted = await db.from("comun_editorial_operation_items").insert({ source_type: "contribution", queue: "withdrawals", title: "Retirada urgente sintética", next_action: "Conter publicação", human_gate: "Confirmação humana", fixture_tag: `fixture-s33-2-2:${runId}` }).select("id").single();
  if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? "item fixture");
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}/comun/admin/login?redirectTo=${encodeURIComponent("/comun/admin/operacao")}`);
    await page.getByLabel("E-mail").fill(operations.email);
    await page.getByLabel("Senha").fill(operationalPassword);
    await Promise.all([page.waitForURL((url) => url.pathname === "/comun/admin/operacao"), page.getByRole("button", { name: "Entrar" }).click()]);
    await page.getByRole("heading", { name: "Central operacional" }).waitFor({ state: "visible" });
    if (await page.getByLabel("E-mail").count()) throw new Error("formulário de login presente após autenticação");
    const state = `${root}/operations_admin.json`;
    await context.storageState({ path: state });
    await validateOperationalStorageState({ browser, path: state, persona: operations.persona, runId, baseUrl: base, protectedPath: "/comun/admin/operacao", heading: "Central operacional", identityEmail: null });
    await context.close();
    const participantContext = await browser.newContext();
    try {
    const page = await participantContext.newPage();
    await page.goto(`${base}/comun/entrar?returnTo=${encodeURIComponent("/comun/minha-participacao")}`);
    await page.getByLabel("E-mail").fill(participant.email);
    await page.getByLabel("Senha").fill(operationalPassword);
    await Promise.all([page.waitForURL((url) => url.pathname === "/comun/minha-participacao"), page.getByRole("button", { name: "Entrar" }).click()]);
    await page.getByRole("heading", { name: "Minha Participação" }).waitFor({ state: "visible" });
    await participantContext.storageState({ path: `${root}/participant.json` });
    } finally { await participantContext.close(); }
  } finally { await browser.close(); }
  await writeFile(".local/comun-auth/current.json", JSON.stringify({ runId, suite: "editorial-pagination", itemId: inserted.data.id, generatedAt: new Date().toISOString(), personas: [operations, participant].map(({ persona, email }) => ({ persona, email, state: `${root}/${persona}.json` })) }, null, 2) + "\n");
  console.log("COMUN_EDITORIAL_PAGINATION_AUTH_READY");
}
