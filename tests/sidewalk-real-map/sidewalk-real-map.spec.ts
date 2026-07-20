import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";

test("miniapp abre no mapa e possui lista e filtros", async ({ page }) => {
  await page.goto("/comun/calcadas");
  await expect(page.locator("h1")).toContainText("Mapa das Calçadas");
  await expect(page.getByRole("button", { name: "Mapa", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.getByRole("group", { name: "Visualização" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Filtros" })).toBeVisible();
});

test("pauta encaminha para ferramenta canônica", async ({ page }) => {
  await page.goto("/comun/pautas/calcadas-em-circulacao");
  await expect(page.locator('a[href="/comun/calcadas"]')).toBeVisible();
});

test("consulta pública não inclui marcadores privados", async ({ page }) => {
  const response = await page.goto("/comun/calcadas");
  const html = await response!.text();
  for (const marker of ["private_geometry_geojson", "member_user_id", "private_notes", "original_asset_id", "object_key"]) expect(html).not.toContain(marker);
});

test("@a11y miniapp não possui violações sérias", async ({ page }) => {
  await page.goto("/comun/calcadas");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});

test("território interno não aparece nem abre pela rota direta", async ({ page }, testInfo) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):/);
  expect(key).toBeTruthy();
  const db = createClient(url!, key!, { auth: { persistSession: false } });
  const slug = `territorio-interno-${testInfo.project.name.replace(/\W/g, "-")}`;
  await db.from("comun_hub_territories").delete().eq("slug", slug);
  const inserted = await db.from("comun_hub_territories").insert({ slug, name: "NOME INTERNO PROIBIDO", territory_type: "other", status: "active", visibility: "internal", verification_status: "verified" });
  expect(inserted.error).toBeNull();
  try {
    await page.goto("/comun/territorios");
    await expect(page.getByText("NOME INTERNO PROIBIDO")).toHaveCount(0);
    const direct = await page.goto(`/comun/territorios/${slug}`);
    expect(direct?.status()).toBe(404);
  } finally {
    await db.from("comun_hub_territories").delete().eq("slug", slug);
  }
});

test("@visual captura mapa e lista", async ({ page }, testInfo) => {
  await page.goto("/comun/calcadas");
  await page.screenshot({ path: `reports/screenshots/sprint-37-calcadas-mapa-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page.screenshot({ path: `reports/screenshots/sprint-37-calcadas-lista-${testInfo.project.name}.png`, fullPage: true });
});
