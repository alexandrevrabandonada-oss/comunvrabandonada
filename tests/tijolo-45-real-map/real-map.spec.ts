import { expect, test } from "@playwright/test";

test("usa o PMTiles real canônico por HTTP Range sem cartografia demo", async ({
  page,
}, testInfo) => {
  const ranges: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/maps/volta-redonda/volta-redonda.pmtiles"))
      ranges.push(request.headers().range ?? "");
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.goto("/comun/calcadas", {
    waitUntil: "networkidle",
  });
  const rangeResponse = await page.request.get(
    "/maps/volta-redonda/volta-redonda.pmtiles",
    { headers: { Range: "bytes=0-127" } },
  );

  expect(response?.status()).toBeLessThan(500);
  expect(rangeResponse.status()).toBe(206);
  expect(rangeResponse.headers()["content-range"]).toMatch(/^bytes 0-127\//);
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Mapa real de Volta Redonda com registros públicos de calçadas",
    }),
  ).toHaveAttribute("data-map-provider", "realVoltaRedonda");
  await expect(page.getByText(/OpenStreetMap contributors/)).toBeVisible();
  await expect(page.getByText(/IBGE/)).toBeVisible();
  await expect
    .poll(() => ranges.some((range) => range.startsWith("bytes=")))
    .toBe(true);
  expect(await page.locator("body").innerText()).not.toContain("(demo)");
  expect(await page.locator("body").innerText()).not.toContain(
    "conteúdo sintético",
  );
  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("visao-geral-real.png"),
    fullPage: false,
  });
});

test("falha do PMTiles mantém a grade neutra e a lista, sem voltar à demo", async ({
  page,
}, testInfo) => {
  await page.route("**/maps/volta-redonda/volta-redonda.pmtiles", (route) =>
    route.abort("failed"),
  );

  const response = await page.goto("/comun/calcadas");

  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByTestId("sidewalk-real-map-fallback")).toBeVisible();
  await expect(page.getByText("Mapa-base indisponível.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.locator("body")).not.toContainText("(demo)");
  await page.screenshot({
    path: testInfo.outputPath("fallback-lista.png"),
    fullPage: false,
  });
});
