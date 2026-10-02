import { expect, test } from "@playwright/test";

const archive = "/maps/volta-redonda/volta-redonda.pmtiles";
const mapName = "Mapa real de Volta Redonda com registros públicos de calçadas";

test("production build loads real PMTiles and returns from list to map", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const ranges: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (request.url().endsWith(archive))
      ranges.push(request.headers().range ?? "");
  });
  const response = await page.goto("/comun/calcadas?vista=mapa");
  expect(response?.status()).toBe(200);
  const map = page.getByRole("region", { name: mapName, exact: true });
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.getByTestId("sidewalk-real-map-fallback")).toHaveCount(0);
  await map.locator(".maplibregl-ctrl-zoom-in").click();
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  expect(ranges.some((range) => range.startsWith("bytes="))).toBe(true);
  const partial = await page.request.get(archive, {
    headers: { Range: "bytes=0-127" },
  });
  expect(partial.status()).toBe(206);
  expect(partial.headers()["content-range"]).toMatch(/^bytes 0-127\//);
  expect((await partial.body()).byteLength).toBe(128);
  await page.screenshot({
    path: testInfo.outputPath("loaded-map.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(map).toHaveCount(0);
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("failed archive leaves a usable list instead of synthetic cartography", async ({
  page,
}) => {
  await page.route(`**${archive}`, (route) => route.abort("failed"));
  await page.goto("/comun/calcadas?vista=mapa");
  await expect(page.getByTestId("sidewalk-real-map-fallback")).toBeVisible();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("sidewalk-real-map-fallback")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Cartografia sintética");
});
