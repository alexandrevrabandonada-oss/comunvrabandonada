import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

function pilotSlug() {
  const slugFile = path.join(process.cwd(), ".comun-sidewalk-pilot-slug");
  const payload = JSON.parse(fs.readFileSync(slugFile, "utf8"));
  return payload.slug as string;
}

const secretMarkers = ["PRIVATE-", "private_contact", "internal_notes", "object_key", "raw_text"];

test("visitante entende a pauta piloto", async ({ page }) => {
  const slug = pilotSlug();
  await page.goto(`/comun/pautas/${slug}`);
  await expect(page.locator("h1")).toContainText(/Mapa Popular das Calçadas/i);
  await expect(page.locator('a[href="#map"]')).toBeVisible();
  await expect(page.locator('a[href="#construction_circle"]')).toBeVisible();
  const body = await page.locator("body").innerText();
  for (const marker of secretMarkers) {
    expect(body).not.toContain(marker);
  }
});

test("mapa possui alternativa textual em lista", async ({ page }) => {
  const slug = pilotSlug();
  await page.goto(`/comun/pautas/${slug}#map`);
  await expect(page.locator("#map")).toBeVisible();
});

test("área pessoal exige sessão", async ({ page }) => {
  await page.goto("/comun/minha-participacao");
  await expect(page).toHaveURL(/\/comun\/entrar/);
});

for (const routeSuffix of ["", "#map", "#construction_circle", "#participation"]) {
  test(`@a11y pauta piloto ${routeSuffix || "principal"}`, async ({ page }) => {
    const slug = pilotSlug();
    await page.goto(`/comun/pautas/${slug}${routeSuffix}`);
    await expect(page.locator("h1")).toBeVisible();
    const audit = await new AxeBuilder({ page }).analyze();
    expect(audit.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  });
}

test("@visual screenshots do piloto de calçadas", async ({ page }, testInfo) => {
  const slug = pilotSlug();
  for (const [name, hash] of [
    ["pauta", ""],
    ["mapa", "#map"],
    ["roda", "#construction_circle"],
    ["participacao", "#participation"],
  ]) {
    await page.goto(`/comun/pautas/${slug}${hash}`);
    await page.screenshot({
      path: `reports/screenshots/sprint-32-sidewalk-${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
});
