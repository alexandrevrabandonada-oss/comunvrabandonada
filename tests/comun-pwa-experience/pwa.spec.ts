import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("manifest válido, escopo e atalhos seguros", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/comun/", start_url: "/comun", scope: "/comun/", display: "standalone" });
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBeTruthy();
  expect(manifest.shortcuts).toHaveLength(4);
});

test("shell registra service worker e não tem violações Axe graves", async ({ page }) => {
  await page.goto("/comun");
  await expect(page.getByRole("link", { name: /COMUN VR ABANDONADA/i }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker?.getRegistration("/comun/").then(Boolean))).toBeTruthy();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});

test("fallback offline explica limites sem simular envio", async ({ page }) => {
  await page.goto("/comun/offline");
  await expect(page.getByRole("heading", { name: "Sem conexão agora." })).toBeVisible();
  await expect(page.getByText(/fotos não são guardadas/i)).toBeVisible();
  await expect(page.getByText(/precisam de conexão para confirmação/i)).toBeVisible();
});

test("conteúdo privado está fora da política de cache", async ({ request }) => {
  const sw = await (await request.get("/sw.js")).text();
  for (const route of ["/comun/admin", "/comun/minha-participacao", "/comun/caixa-de-entrada", "/api/"]) expect(sw).toContain(route);
  expect(sw).toContain('request.method !== "GET"');
  expect(sw).toContain('response.headers.has("set-cookie")');
});
