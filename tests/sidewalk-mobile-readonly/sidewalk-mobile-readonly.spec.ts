import { expect, test } from "@playwright/test";

test("renders real cartography and exposes CAPTCHA progress without a production write", async ({
  page,
}, testInfo) => {
  const mutableRequests: string[] = [];
  const pmtilesRanges: string[] = [];
  const consoleErrors: string[] = [];

  await page.addInitScript(() => {
    Object.defineProperty(window, "hcaptcha", {
      configurable: true,
      value: {
        render: () => "readonly-widget",
        reset: () => undefined,
        remove: () => undefined,
      },
    });
  });
  await page.route("**/*", async (route) => {
    const method = route.request().method();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      mutableRequests.push(method);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  page.on("request", (request) => {
    if (request.url().includes("volta-redonda.pmtiles"))
      pmtilesRanges.push(request.headers().range ?? "");
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.goto(
    "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
    { waitUntil: "networkidle" },
  );
  expect(response?.status()).toBe(200);
  await page
    .locator('input[type="file"]')
    .setInputFiles("public/icons/comun-192.png");

  const map = page.getByRole("button", {
    name: "Mapa para confirmar ou ajustar o ponto",
  });
  await expect(map).toBeVisible();
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  await expect(map).toHaveAttribute("data-map-provider", "realVoltaRedonda");
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map).toHaveAttribute("data-road-layer", "roads");
  expect(
    await map.evaluate((element) =>
      Math.round(element.getBoundingClientRect().height),
    ),
  ).toBe(224);
  await expect
    .poll(() => pmtilesRanges.some((range) => range.startsWith("bytes=")))
    .toBe(true);
  await map.click({ position: { x: 150, y: 120 } });

  await page.getByRole("button", { name: "Regular", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Autorizo a publicação sanitizada/ })
    .check();
  await page
    .getByRole("checkbox", {
      name: /Conferi fotografia, local, condição e impacto/,
    })
    .check();
  const submit = page.getByRole("button", {
    name: "Enviar para revisão",
    exact: true,
  });
  await expect(submit).toBeEnabled();
  expect(
    await submit.evaluate((element) => getComputedStyle(element).position),
  ).toBe("sticky");
  await submit.click({ noWaitAfter: true });
  await expect(page.locator("#sidewalk-submit-progress")).toHaveText(
    "Verificando que este envio é humano…",
  );
  await expect(
    page.getByRole("dialog", { name: "Confirme que você é uma pessoa" }),
  ).toBeVisible();
  await expect(
    page.locator('button[data-submission-phase="checking_captcha"]'),
  ).toBeDisabled();
  expect(mutableRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("mapa-real-envio-observavel.png"),
    fullPage: true,
  });
});
