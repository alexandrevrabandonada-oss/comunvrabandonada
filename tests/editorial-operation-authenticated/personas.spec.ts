import { readFileSync } from "node:fs";
import { expect, test, type Browser } from "@playwright/test";
import { OPERATIONAL_SURFACES } from "../../lib/operational-surfaces";

const base = process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000";
const manifest = JSON.parse(readFileSync(".local/comun-auth/current.json", "utf8")) as { personas: { persona: string; state: string }[] };
const stateFor = (persona: string) => {
  const state = manifest.personas.find((entry) => entry.persona === persona)?.state;
  if (!state) throw new Error(`storageState ausente: ${persona}`);
  return state;
};
const url = (path: string) => new URL(path, base).toString();
async function openPersona(browser: Browser, persona: string, path: string) {
  const context = await browser.newContext({ storageState: stateFor(persona) });
  const page = await context.newPage();
  await page.goto(url(path));
  return { context, page };
}

for (const surface of OPERATIONAL_SURFACES.filter(({ key }) => key !== "expired")) {
  test(`${surface.role}: abre ${surface.key} com o papel mínimo`, async ({ browser }) => {
    const path = `/comun/admin/operacao/superficies/${surface.key}`;
    const { context, page } = await openPersona(browser, surface.role, path);
    try {
      await expect(page).toHaveURL(new RegExp(`${surface.key}$`));
      await expect(page.getByRole("heading", { name: surface.title })).toBeVisible();
      await expect(page.locator("main")).toHaveAttribute("data-operational-surface", surface.key);
      await expect(page.getByRole("button", { name: surface.action })).toBeVisible();
    } finally { await context.close(); }
  });
}

const denials = [["privacy_reviewer", "art-rights"], ["rights_reviewer", "privacy"], ["facilitator", "queue"], ["protocol_operator", "media"], ["result_editor", "assignment"], ["art_editor", "radio-rights"], ["radio_editor", "art-rights"], ["participant", "audit"]] as const;
for (const [persona, surface] of denials) {
  test(`${persona}: negação fechada em ${surface}`, async ({ browser }) => {
    const path = `/comun/admin/operacao/superficies/${surface}`;
    const context = await browser.newContext({ storageState: stateFor(persona) });
    try {
      // A página de fallback administrativa é inacessível ao papel viewer e redireciona
      // novamente; validar a primeira resposta evita seguir esse loop conhecido sem
      // transformar uma negação em login adicional ou em skip.
      const response = await context.request.get(url(path), { maxRedirects: 0 });
      expect(response.status()).toBeGreaterThanOrEqual(300);
      expect(response.status()).toBeLessThan(400);
      expect(response.headers().location).toContain(persona === "participant" ? "/comun/admin/login" : "/comun/admin?forbidden=operational-surface");
      expect(await response.text()).not.toContain("Item fixture");
      expect(await response.text()).not.toContain("Conteúdo sensível oculto");
    } finally { await context.close(); }
  });
}

test("sessão expirada volta ao login sem conteúdo protegido", async ({ browser }) => {
  const { context, page } = await openPersona(browser, "operations_admin", "/comun/admin/operacao");
  try {
    await context.clearCookies();
    await page.goto(url("/comun/admin/operacao/superficies/expired"));
    await expect(page).toHaveURL(/\/comun\/admin\/login/);
    expect(await page.content()).not.toContain("Item fixture");
  } finally { await context.close(); }
});

for (const persona of manifest.personas.map(({ persona }) => persona)) {
  test(`${persona}: sessão é isolada depois do logout local`, async ({ browser }) => {
    const { context, page } = await openPersona(browser, persona, "/comun/admin/acervo");
    try {
      await context.clearCookies();
      await page.goto(url("/comun/admin/operacao"));
      await expect(page).toHaveURL(/\/comun\/admin\/login/);
    } finally { await context.close(); }
  });
}

test("visitante é negado", async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(url("/comun/admin/operacao"));
    await expect(page).toHaveURL(/\/comun\/admin\/login/);
  } finally { await context.close(); }
});
