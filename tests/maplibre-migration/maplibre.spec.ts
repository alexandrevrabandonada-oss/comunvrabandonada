import { expect, test } from "@playwright/test";

const archive = "/maps/volta-redonda/volta-redonda.pmtiles";
const mapName = "Mapa real de Volta Redonda com registros públicos de calçadas";

const observatoryMapName =
  "Mapa de pontos de calçadas revisados e publicados com localização aproximada";

test("Calçadas full filters preserve keyboard focus when opened and dismissed", async ({ page }) => {
  await page.goto("/maplibre-real-map-test?vista=lista");
  const trigger = page.getByRole("button", { name: "Mais filtros", exact: true });
  await trigger.press("Enter");
  const filters = page.getByRole("group", { name: "Filtros completos", exact: true });
  await expect(filters).toBeVisible();
  if (page.viewportSize()!.width < 768) {
    await expect(filters).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Fechar filtros", exact: true })).toBeFocused();
  } else {
    await expect(trigger).toBeFocused();
    await trigger.press("Tab");
    await expect(page.getByRole("combobox", { name: "Condição", exact: true })).toBeFocused();
  }
  await page.getByRole("combobox", { name: "Condição", exact: true }).press("Escape");
  await expect(filters).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("Calçadas mobile close button returns to filters trigger without clearing choices", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 768, "Close button is mobile only; desktop uses the disclosure trigger.");
  await page.goto("/maplibre-real-map-test?vista=lista");
  const trigger = page.getByRole("button", { name: "Mais filtros", exact: true });
  await trigger.press("Enter");
  await page.getByRole("combobox", { name: "Condição", exact: true }).selectOption("bad");
  await page.getByRole("button", { name: "Fechar filtros", exact: true }).press("Enter");
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/condicao=bad/);
  await trigger.press("Enter");
  await expect(page.getByRole("combobox", { name: "Condição", exact: true })).toHaveValue("bad");
});

test("Calçadas filters do not capture Escape or steal focus outside the panel", async ({ page }) => {
  await page.goto("/maplibre-real-map-test?vista=lista");
  const trigger = page.getByRole("button", { name: "Mais filtros", exact: true });
  await trigger.press("Enter");
  const search = page.getByRole("textbox", { name: "Buscar rua, trecho ou bairro", exact: true });
  await search.press("Escape");
  await expect(page.getByRole("group", { name: "Filtros completos", exact: true })).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill("test");
  await expect(search).toBeFocused();
});

test("observatory component keeps map, selected detail and list consistent with filters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/maplibre-observatory-test");
  const map = page.getByRole("region", {
    name: observatoryMapName,
    exact: true,
  });
  const list = page.getByRole("region", {
    name: "Pontos mostrados",
    exact: true,
  });
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(2);
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(map).toContainText("OpenStreetMap");
  await page
    .getByRole("combobox", { name: "Condição", exact: true })
    .selectOption("bad");
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(1);
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await map
    .getByRole("button", {
      name: "Abrir ponto revisado com condição Ruim",
      exact: true,
    })
    .press("Enter");
  await expect(
    page.getByText("Ponto revisado selecionado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Condição", exact: true })
    .selectOption("terrible");
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(0);
  await expect(
    page.getByText("Ponto revisado selecionado", { exact: true }),
  ).toHaveCount(0);
  await expect(list).toContainText(
    "Nenhum ponto revisado corresponde aos filtros selecionados.",
  );
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(2);
  await expect(list.getByRole("listitem")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("observatory archive failure preserves the same filtered textual points", async ({
  page,
}) => {
  await page.route(`**${archive}`, (route) => route.abort("failed"));
  await page.goto("/maplibre-observatory-test");
  await expect(
    page.getByText("Mapa-base temporariamente indisponível.", { exact: true }),
  ).toBeVisible();
  const list = page.getByRole("region", {
    name: "Pontos mostrados",
    exact: true,
  });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Condição", exact: true })
    .selectOption("bad");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list.getByRole("listitem")).toContainText("Ruim");
  await expect(list.getByRole("listitem")).not.toContainText(/-44\.|-22\./);
});

test("picker keeps the latest point through movement, resize and clearing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/maplibre-picker-test");
  const map = page.getByRole("button", {
    name: "Mapa para confirmar ou ajustar o ponto",
    exact: true,
  });
  const marker = map.getByTestId("point-picker-marker");
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  await expect(marker).toHaveCount(0);

  const expectCentered = async () => {
    // Wait for the real easeTo animation to finish. A stale null/previous point
    // either removes the marker or leaves it away from the selected center.
    await page.waitForTimeout(500); // The component's easeTo duration is 350 ms.
    await expect
      .poll(async () => {
        if ((await marker.count()) !== 1) return false;
        return marker.evaluate((element) => {
          const parent = element.parentElement!.getBoundingClientRect();
          return (
            Math.abs(
              parseFloat((element as HTMLElement).style.left) -
                parent.width / 2,
            ) < 3 &&
            Math.abs(
              parseFloat((element as HTMLElement).style.top) -
                parent.height / 2,
            ) < 3
          );
        });
      })
      .toBe(true);
  };
  await map.press("Enter");
  await expectCentered();
  const initialPoint = await page
    .getByLabel("Selected test coordinate")
    .textContent();
  await map.press("Shift+ArrowRight");
  await expect(page.getByLabel("Selected test coordinate")).not.toHaveText(
    initialPoint!,
  );
  await expectCentered();
  const size = page.viewportSize()!;
  await page.setViewportSize({ width: size.width - 40, height: size.height });
  await expectCentered();
  await map.click({ position: { x: 80, y: 80 } });
  await expectCentered();
  await page
    .getByRole("button", { name: "Clear test coordinate", exact: true })
    .click();
  await expect(marker).toHaveCount(0);
  await page.setViewportSize(size);
  await expect(marker).toHaveCount(0);
  expect(errors).toEqual([]);
});

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
  await expect(page.getByTestId("sidewalk-real-map-fallback")).toHaveAttribute(
    "data-map-failure",
    "render",
  );
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("sidewalk-real-map-fallback")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Cartografia sintética");
});

test("unsupported WebGL reports a fixed category and preserves the list", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (
        this: HTMLCanvasElement,
        contextId: string,
        ...args: unknown[]
      ) {
        if (contextId === "webgl2") return null;
        return Reflect.apply(getContext, this, [contextId, ...args]);
      },
    });
  });
  await page.goto("/comun/calcadas?vista=mapa");
  const fallback = page.getByTestId("sidewalk-real-map-fallback");
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute("data-map-failure", "gpu_context");
  await expect(fallback).toContainText(
    "O mapa não pôde ser exibido neste navegador.",
  );
  await expect(fallback).toContainText(
    "Use a lista para consultar os mesmos registros.",
  );
  await expect(fallback).not.toContainText(/WebGL|GPUInitializationError/);
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lista", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(fallback).toHaveCount(0);
});

test("official health points load, select and filter in the production build", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto("/comun/observatorios/territorio");
  expect(response?.status()).toBe(200);
  const map = page.getByRole("region", {
    name: "Mapa de equipamentos públicos de Saúde com coordenadas oficiais",
    exact: true,
  });
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".maplibregl-canvas")).toBeVisible();
  const marker = map
    .getByRole("button", { name: /^Abrir equipamento público de Saúde:/ })
    .first();
  await expect(marker).toBeVisible();
  const label = await marker.getAttribute("aria-label");
  const name = label!.replace("Abrir equipamento público de Saúde: ", "");
  // Nearby official coordinates can overlap at city zoom; filter before selecting.
  await page
    .getByRole("textbox", { name: "Buscar pelo nome", exact: true })
    .fill(name);
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(1);
  await marker.click();
  await expect(
    page.getByText("Equipamento selecionado", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar pelo nome", exact: true })
    .fill("SEM_CORRESPONDENCIA_QA_LOCAL");
  await expect(
    page.getByText("Mostrando 0 equipamento(s) público(s) de Saúde.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(0);
  await expect(
    page.getByText("Equipamento selecionado", { exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("health archive failure preserves the official textual list", async ({
  page,
}) => {
  await page.route(`**${archive}`, (route) => route.abort("failed"));
  await page.goto("/comun/observatorios/territorio");
  await expect(
    page.getByText("Mapa-base temporariamente indisponível.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lista textual de Saúde", exact: true }),
  ).toBeVisible();
  await expect(page.locator("main ol li").first()).toBeVisible();
  const details = page
    .getByRole("button", { name: /^Ver detalhes de / })
    .first();
  const label = await details.getAttribute("aria-label");
  await details.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: label!.replace("Ver detalhes de ", ""),
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Detalhes do equipamento selecionado",
      exact: true,
    }),
  ).toBeFocused();
});

test("Calçadas restores URL filters and view after same-page navigation and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/comun/calcadas?condicao=bad&vista=mapa");
  const bad = page.getByRole("button", { name: "Ruim", exact: true });
  const list = page.getByRole("button", { name: "Lista", exact: true });
  const map = page.getByRole("button", { name: "Mapa", exact: true });
  await expect(bad).toHaveAttribute("aria-pressed", "true");
  await expect(map).toHaveAttribute("aria-pressed", "true");
  await list.click();
  await expect(page).toHaveURL(/condicao=bad&vista=lista$/);
  await expect(list).toHaveAttribute("aria-pressed", "true");

  await page
    .getByRole("navigation", {
      name: "Navegação do Mapa das Calçadas",
      exact: true,
    })
    .getByRole("link", { name: "Mapa", exact: true })
    .click();
  await expect(page).toHaveURL(/\/comun\/calcadas$/);
  await expect(bad).toHaveAttribute("aria-pressed", "false");
  await expect(list).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(page).toHaveURL(/condicao=bad&vista=lista$/);
  await expect(bad).toHaveAttribute("aria-pressed", "true");
  await expect(list).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(page).toHaveURL(/\/comun\/calcadas$/);
  await expect(bad).toHaveAttribute("aria-pressed", "false");
  await bad.click();
  await map.click();
  await expect(page).toHaveURL(/condicao=bad&vista=mapa$/);
  await page.reload();
  await expect(bad).toHaveAttribute("aria-pressed", "true");
  await expect(map).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});

test("Calçadas keeps rapid search input, view and clear filters in the URL", async ({
  page,
}) => {
  await page.goto("/comun/calcadas?vista=lista");
  const search = page.getByRole("textbox", {
    name: "Buscar rua, trecho ou bairro",
    exact: true,
  });
  await search.pressSequentially("Centro de Volta Redonda");
  await expect(search).toHaveValue("Centro de Volta Redonda");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("Centro de Volta Redonda");
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("Centro de Volta Redonda");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("vista"))
    .toBe("mapa");
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(page).toHaveURL(/\?vista=mapa$/);
});

test("Calçadas closes an excluded selection and does not reopen it when filters clear", async ({
  page,
}) => {
  await page.goto("/maplibre-real-map-test?vista=mapa");
  const map = page.getByRole("region", { name: mapName, exact: true });
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await map
    .getByRole("button", { name: "Abrir Trecho sintético A", exact: true })
    .press("Enter");
  const sheet = page.getByRole("complementary", {
    name: "Ficha do registro",
    exact: true,
  });
  await expect(sheet).toContainText("Resumo sintético original");
  await page
    .getByRole("button", { name: "Péssima", exact: true })
    .press("Enter");
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(0);
  await expect(sheet).toHaveCount(0);
  await page
    .getByRole("button", { name: "Limpar", exact: true })
    .press("Enter");
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(2);
  await expect(sheet).toHaveCount(0);
});

test("Calçadas preserves its loaded map when records and filters change", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/maplibre-real-map-test?vista=mapa");
  const map = page.getByRole("region", { name: mapName, exact: true });
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  const canvas = await map.locator(".maplibregl-canvas").elementHandle();
  await page.getByRole("button", { name: "Ruim", exact: true }).click();
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(1);
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(2);
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  expect(await canvas!.evaluate((element) => element.isConnected)).toBe(false);
  await page.getByRole("button", { name: "Mapa", exact: true }).click();
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("Calçadas shows current selected record data and closes removed records", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/maplibre-real-map-test?vista=mapa");
  const map = page.getByRole("region", { name: mapName, exact: true });
  await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
  await map
    .getByRole("button", { name: "Abrir Trecho sintético A", exact: true })
    .press("Enter");
  const sheet = page.getByRole("complementary", {
    name: "Ficha do registro",
    exact: true,
  });
  await expect(sheet).toContainText("Resumo sintético original");
  await page
    .getByRole("button", { name: "Atualizar registro sintético", exact: true })
    .press("Enter");
  await expect(sheet).toContainText("Resumo sintético atualizado");
  await expect(sheet).toContainText("Trecho sintético atualizado");
  await expect(
    map.getByRole("button", {
      name: "Abrir Trecho sintético atualizado",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Remover registro sintético", exact: true })
    .press("Enter");
  await expect(sheet).toHaveCount(0);
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Calçadas applies the latest filter when the initial map load finishes", async ({
  page,
}) => {
  let release: () => void = () => {};
  const allowed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**${archive}`, async (route) => {
    await allowed;
    await route.continue();
  });
  try {
    await page.goto("/maplibre-real-map-test?vista=mapa");
    const map = page.getByRole("region", { name: mapName, exact: true });
    await expect(map).toHaveAttribute("data-pmtiles-loaded", "false");
    await page.getByRole("button", { name: "Ruim", exact: true }).click();
    release();
    await expect(map).toHaveAttribute("data-pmtiles-loaded", "true");
    await expect(map.locator(".sidewalk-map-marker")).toHaveCount(1);
    await expect(
      map.getByRole("button", {
        name: "Abrir Trecho sintético A",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      map.getByRole("button", {
        name: "Abrir Trecho sintético B",
        exact: true,
      }),
    ).toHaveCount(0);
  } finally {
    release();
  }
});

test("Calçadas moves keyboard focus into the opened record sheet", async ({
  page,
}, testInfo) => {
  await page.goto("/maplibre-real-map-test?vista=mapa");
  const marker = page.getByRole("button", {
    name: "Abrir Trecho sintético A",
    exact: true,
  });
  await marker.press("Enter");
  const sheet = page.getByRole("complementary", {
    name: "Ficha do registro",
    exact: true,
  });
  await expect(sheet).toBeFocused();
  await sheet.press("Tab");
  await expect(
    sheet.getByRole("button", { name: "Fechar ficha", exact: true }),
  ).toBeFocused();
  await marker.press("Enter");
  await expect(sheet).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("focused-record-sheet.png"),
    fullPage: false,
  });
});

test("Calçadas closes a sheet with Escape and restores the current marker after a DTO update", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/maplibre-real-map-test?vista=mapa");
  await page
    .getByRole("button", { name: "Abrir Trecho sintético A", exact: true })
    .press("Enter");
  const sheet = page.getByRole("complementary", {
    name: "Ficha do registro",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Atualizar registro sintético", exact: true })
    .press("Enter");
  await expect(sheet).toContainText("Resumo sintético atualizado");
  await sheet
    .getByRole("button", { name: "Fechar ficha", exact: true })
    .press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Abrir Trecho sintético atualizado",
      exact: true,
    }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("Calçadas restores focus after explicit close without stealing it from filters", async ({
  page,
}) => {
  await page.goto("/maplibre-real-map-test?vista=mapa");
  const marker = page.getByRole("button", {
    name: "Abrir Trecho sintético A",
    exact: true,
  });
  const sheet = page.getByRole("complementary", {
    name: "Ficha do registro",
    exact: true,
  });
  await marker.press("Enter");
  await sheet
    .getByRole("button", { name: "Fechar ficha", exact: true })
    .press("Enter");
  await expect(sheet).toHaveCount(0);
  await expect(marker).toBeFocused();
  await marker.press("Enter");
  const filter = page.getByRole("button", { name: "Péssima", exact: true });
  await filter.press("Enter");
  await expect(sheet).toHaveCount(0);
  await expect(filter).toBeFocused();
  await page
    .getByRole("button", { name: "Limpar", exact: true })
    .press("Enter");
  await marker.press("Enter");
  const list = page.getByRole("button", { name: "Lista", exact: true });
  await list.press("Enter");
  await expect(sheet).toHaveCount(0);
  await expect(list).toBeFocused();
});

test("Calçadas keeps focus on the map when a background DTO removal closes its focused sheet", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/maplibre-real-map-test?vista=mapa");
  const map = page.getByRole("region", { name: mapName, exact: true });
  await page
    .getByRole("button", { name: "Abrir Trecho sintético A", exact: true })
    .press("Enter");
  const sheet = page.getByRole("complementary", {
    name: "Ficha do registro",
    exact: true,
  });
  await expect(sheet).toBeFocused();
  // Simulate a new DTO arriving without a user focus change; the button is
  // solely a disposable fixture control, not a production data mutation.
  await page
    .getByRole("button", { name: "Remover registro sintético", exact: true })
    .dispatchEvent("click");
  await expect(sheet).toHaveCount(0);
  await expect(map.locator("..")).toBeFocused();
  await expect(map.locator(".sidewalk-map-marker")).toHaveCount(1);
  expect(errors).toEqual([]);
});
