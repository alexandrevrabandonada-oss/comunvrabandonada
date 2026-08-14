import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";

test("miniapp abre em lista útil e oferece mapa e filtros", async ({
  page,
}) => {
  await page.goto("/comun/calcadas");
  await expect(page.locator("h1")).toContainText("Calçadas de Volta Redonda");
  await expect(
    page.getByRole("button", { name: "Mapa", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Visualização" })).toBeVisible();
  await page.getByRole("button", { name: /Mais filtros/ }).click();
  await expect(
    page.getByRole("group", { name: "Filtros completos" }),
  ).toBeVisible();
});

test("pauta encaminha para ferramenta canônica", async ({ page }) => {
  await page.goto("/comun/pautas/calcadas-em-circulacao");
  await expect(
    page.getByRole("link", { name: "Abrir ferramenta" }),
  ).toBeVisible();
});

test("consulta pública não inclui marcadores privados", async ({ page }) => {
  const response = await page.goto("/comun/calcadas");
  const html = await response!.text();
  for (const marker of [
    "private_geometry_geojson",
    "member_user_id",
    "private_notes",
    "original_asset_id",
    "object_key",
  ])
    expect(html).not.toContain(marker);
});

test("@a11y miniapp não possui violações sérias", async ({ page }) => {
  await page.goto("/comun/calcadas");
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("território interno não aparece nem abre pela rota direta", async ({
  page,
}, testInfo) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):/);
  expect(key).toBeTruthy();
  const db = createClient(url!, key!, { auth: { persistSession: false } });
  const slug = `territorio-interno-${testInfo.project.name.replace(/\W/g, "-")}`;
  await db.from("comun_hub_territories").delete().eq("slug", slug);
  const inserted = await db.from("comun_hub_territories").insert({
    slug,
    name: "NOME INTERNO PROIBIDO",
    territory_type: "other",
    status: "active",
    visibility: "internal",
    verification_status: "verified",
  });
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

test("rotas locais preservam contexto e deep links", async ({ page }) => {
  for (const path of [
    "/comun/calcadas/prioridades",
    "/comun/calcadas/mobilizacao",
    "/comun/calcadas/resultados",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("navigation", {
        name: "Navegação do Mapa das Calçadas",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Minha participação", exact: true }),
    ).toBeVisible();
  }
});

test("@visual captura experiência integrada", async ({ page }, testInfo) => {
  await page.goto("/comun/calcadas");
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await page.screenshot({
    path: `reports/screenshots/sprint-38-calcadas-mapa-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page.screenshot({
    path: `reports/screenshots/sprint-38-calcadas-lista-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("captura rápida aceita câmera, GPS negado e ponto manual", async ({
  page,
}, testInfo) => {
  await page.goto(
    "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
  );
  const input = page.locator('input[type="file"]');
  await expect(input).toHaveAttribute("accept", "image/*");
  await expect(input).toHaveAttribute("capture", "environment");
  await input.setInputFiles("public/icons/comun-192.png");
  await expect(
    page.getByText(
      "Permissão de localização negada. Toque no mapa para marcar manualmente.",
    ),
  ).toBeVisible();
  const pointMap = page.getByRole("button", {
    name: "Mapa para confirmar ou ajustar o ponto",
  });
  await expect(pointMap).toHaveAttribute("data-pmtiles-loaded", "true");
  await pointMap.click({ position: { x: 150, y: 120 } });
  await page.getByRole("button", { name: "Ruim" }).click();
  await page
    .getByRole("checkbox", { name: /Autorizo a publicação sanitizada/ })
    .check();
  await page
    .getByRole("checkbox", { name: /Conferi fotografia, local, condição/ })
    .check();
  await expect(
    page.getByRole("button", { name: "Enviar para revisão" }),
  ).toBeEnabled();
  await expect(page.locator('input[name="name"]')).toHaveCount(0);
  await expect(page.locator('input[name="neighborhood"]')).toHaveCount(0);
  await page.screenshot({
    path: `reports/screenshots/sprint-39-captura-rapida-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("mapa real local lê o PMTiles v3 por HTTP Range", async ({ page }) => {
  const ranges: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("volta-redonda.pmtiles"))
      ranges.push(request.headers().range ?? "");
  });
  await page.goto("/comun/calcadas");
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect
    .poll(() => ranges.some((value) => value.startsWith("bytes=")))
    .toBe(true);
  await expect(page.getByText(/OpenStreetMap contributors/)).toBeVisible();
});

test("envio direto privado conclui a confirmação em duas fases", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "360x800",
    "Jornada de câmera validada no viewport móvel primário; os demais cobrem layout e seleção.",
  );
  await page.goto(
    "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles("public/icons/comun-192.png");
  await page
    .getByRole("button", {
      name: "Mapa para confirmar ou ajustar o ponto",
    })
    .click({ position: { x: 150, y: 120 } });
  await page.getByRole("button", { name: "Regular", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Autorizo a publicação sanitizada/ })
    .check();
  await page
    .getByRole("checkbox", { name: /Conferi fotografia, local, condição/ })
    .check();
  const submit = page.getByRole("button", { name: "Enviar para revisão" });
  await expect(submit).toBeEnabled({ timeout: 15_000 });
  await submit.click();
  await expect(page).toHaveURL(
    /\/comun\/mapa\/contribuir\/confirmacao\?registro=/,
    { timeout: 30_000 },
  );
  await expect(
    page.getByText("Estado: em revisão", { exact: true }),
  ).toBeVisible();
});
