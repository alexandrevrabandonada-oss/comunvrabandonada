// Diagnóstico mínimo e reprodutível de storageState local — Sprint 33.2.1.
// Uso: node scripts/comun-local-env.mjs run node scripts/diag-comun-auth-storage-state.mjs [--repeat N]
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import { assertLocalEnvironment } from "./local-environment.mjs";

assertLocalEnvironment();
const repeatIndex = process.argv.indexOf("--repeat");
const repeat = repeatIndex >= 0 ? Number(process.argv[repeatIndex + 1]) : 1;
if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) throw new Error("--repeat deve estar entre 1 e 10");
const baseUrl = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000";

function readiness() {
  const output = execFileSync("node", ["scripts/check-comun-auth-readiness.mjs"], { encoding: "utf8", env: process.env });
  if (!output.includes("COMUN_LOCAL_AUTH_READY")) throw new Error("Auth readiness não concluiu");
}

async function assertProtected(page, email) {
  await page.getByRole("heading", { name: "Central operacional" }).waitFor({ state: "visible" });
  if (await page.getByLabel("E-mail").count()) throw new Error("formulário de login presente após redirect");
  await page.goto(new URL("/comun/admin/acervo", baseUrl).toString());
  await page.getByRole("heading", { name: "Acervo" }).waitFor({ state: "visible" });
  await page.getByText(email, { exact: true }).waitFor({ state: "visible" });
}

async function runRound(index) {
  readiness();
  const runId = `storage-${index + 1}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  process.env.COMUN_TEST_RUN_ID = runId;
  process.env.COMUN_TEST_SUITE = "storage-state";
  const { cleanupOperationalPersonas, ensureLocalOperationalPersona } = await import("../tests/fixtures/comun/operational-personas.mjs");
  const { validateOperationalStorageState } = await import("../tests/fixtures/comun/operational-storage-state.mjs");
  const persona = await ensureLocalOperationalPersona({ persona: "operations_admin", runId });
  const root = `.local/comun-auth/${runId}`;
  const statePath = `${root}/operations_admin.json`;
  const browser = await chromium.launch();
  try {
    await mkdir(root, { recursive: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const protectedPath = "/comun/admin/operacao";
    const loginUrl = new URL("/comun/admin/login", baseUrl);
    loginUrl.searchParams.set("redirectTo", protectedPath);
    await page.goto(loginUrl.toString());
    await page.getByLabel("E-mail").fill(persona.email);
    await page.getByLabel("Senha").fill(process.env.COMUN_LOCAL_FIXTURE_PASSWORD ?? "comun-local-fixture-only");
    await Promise.all([
      page.waitForURL((url) => url.pathname === protectedPath),
      page.getByRole("button", { name: "Entrar" }).click(),
    ]);
    await assertProtected(page, persona.email);
    const cookies = await context.cookies();
    if (!cookies.some((cookie) => /^sb-.*auth-token/i.test(cookie.name) && Boolean(cookie.value))) {
      throw new Error("cookie de sessão não foi emitido");
    }
    // A sessão já foi validada pela factory por login, getUser e refresh antes do UI flow.
    // Só agora a superfície protegida, a identidade e o cookie foram comprovados.
    await context.storageState({ path: statePath });
    await context.close();
    await validateOperationalStorageState({
      browser,
      path: statePath,
      persona: "operations_admin",
      runId,
      baseUrl,
      protectedPath,
      heading: "Central operacional",
      identityEmail: persona.email,
    });
    const axeContext = await browser.newContext({ storageState: statePath });
    try {
      const axePage = await axeContext.newPage();
      await axePage.goto(new URL(protectedPath, baseUrl).toString());
      await axePage.getByRole("heading", { name: "Central operacional" }).waitFor({ state: "visible" });
      const result = await new AxeBuilder({ page: axePage }).analyze();
      const blocking = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
      if (blocking.length) throw new Error(`Axe bloqueante: ${blocking.map(({ id }) => id).join(", ")}`);
      await axePage.goto(new URL("/comun/admin/acervo", baseUrl).toString());
      await axePage.getByRole("button", { name: "Sair" }).click();
      await axePage.waitForURL((url) => url.pathname.includes("/comun/admin/login"));
    } finally {
      await axeContext.close();
    }
  } finally {
    await browser.close();
    await cleanupOperationalPersonas({ runId });
    await rm(root, { recursive: true, force: true });
  }
}

for (let index = 0; index < repeat; index += 1) await runRound(index);
console.log("COMUN_AUTH_STORAGE_STATE_LOCAL_OK");
