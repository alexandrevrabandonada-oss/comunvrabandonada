import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.COMUN_BASE_URL?.replace(/\/$/, "");
if (!baseUrl || !baseUrl.startsWith("https://")) {
  throw new Error("COMUN_BASE_URL must be an https Production origin");
}

const conditionQuery = {
  good: "boa",
  regular: "regular",
  bad: "ruim",
  terrible: "muito-ruim",
  unknown: "sem-classificacao",
};

async function waitForCount(locator, expected, label) {
  const deadline = Date.now() + 20_000;
  let actual = await locator.count();
  while (actual !== expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    actual = await locator.count();
  }
  assert.equal(actual, expected, `${label}: expected ${expected}, got ${actual}`);
}

const apiResponse = await fetch(`${baseUrl}/api/comun/observatorios/calcadas`, {
  headers: { accept: "application/json" },
  redirect: "follow",
});
assert.equal(apiResponse.status, 200, "sidewalk observatory API must be available");
const payload = await apiResponse.json();
assert.ok(Array.isArray(payload.observations), "observations must be an array");
assert.ok(
  payload.observations.length > 0,
  "Production proof requires an existing reviewed public point",
);

const conditionFacet = payload.facets?.conditions?.find(
  (facet) => facet && facet.count > 0 && conditionQuery[facet.value],
);
const problemFacet = payload.facets?.problems?.find(
  (facet) => facet && facet.count > 0 && typeof facet.value === "string",
);
assert.ok(conditionFacet, "at least one public condition facet must be measurable");
assert.ok(problemFacet, "at least one allowlisted public problem facet must be measurable");

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const navigation = await page.goto(`${baseUrl}/comun/observatorios/calcadas`, {
    waitUntil: "domcontentloaded",
  });
  assert.equal(
    navigation?.status(),
    200,
    "dedicated observatory page must return 200",
  );
  await page
    .getByRole("heading", { name: "Observatório de Calçadas", level: 1 })
    .waitFor();
  await page
    .getByText(
      "Estes dados representam apenas pontos observados, revisados e publicados. Não são um levantamento completo de todas as calçadas da cidade.",
      { exact: true },
    )
    .waitFor();

  const mapRegion = page.getByRole("region", {
    name: "Mapa de pontos de calçadas revisados e publicados com localização aproximada",
  });
  await mapRegion.waitFor({ state: "visible", timeout: 20_000 });
  const condition = page.getByLabel("Condição", { exact: true });
  const problem = page.getByLabel("Problema", { exact: true });
  const recency = page.getByLabel("Recência", { exact: true });
  await condition.focus();
  assert.equal(
    await condition.evaluate((element) => element === document.activeElement),
    true,
    "condition filter must be keyboard-focusable",
  );

  const listItems = page.locator(
    'section[aria-labelledby="shown-points-title"] ol > li',
  );
  const markers = page.locator("button.sidewalk-map-marker");

  await condition.selectOption(conditionFacet.value);
  await page.waitForURL(
    new RegExp(`condicao=${conditionQuery[conditionFacet.value]}(?:&|$)`),
  );
  await waitForCount(listItems, conditionFacet.count, "condition list count");
  await waitForCount(markers, conditionFacet.count, "condition map marker count");

  await condition.selectOption("");
  await page.waitForURL((url) => !url.searchParams.has("condicao"));
  await problem.selectOption(problemFacet.value);
  await page.waitForURL(new RegExp("problema=[^&]+"));
  await waitForCount(listItems, problemFacet.count, "problem list count");
  await waitForCount(markers, problemFacet.count, "problem map marker count");

  await problem.selectOption("");
  await page.waitForURL((url) => !url.searchParams.has("problema"));
  await recency.selectOption("90d");
  await page.waitForURL(/periodo=90d(?:&|$)/);
  await waitForCount(
    listItems,
    payload.indicators.recent90d,
    "recency list count",
  );
  await waitForCount(
    markers,
    payload.indicators.recent90d,
    "recency map marker count",
  );

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
  );
  assert.equal(
    hasHorizontalOverflow,
    false,
    "mobile observatory must not overflow horizontally",
  );

  const browserText = await page.locator("body").innerText();
  for (const sentinel of [
    "PRIVATE_SIDEWALK_TEXT_SENTINEL",
    "PRIVATE_EXACT_LOCATION_SENTINEL",
    "PRIVATE_ATTACHMENT_SENTINEL",
    "PRIVATE_WALLET_SENTINEL",
  ]) {
    assert.equal(
      browserText.includes(sentinel),
      false,
      `${sentinel} must not reach browser text`,
    );
  }

  console.log(
    JSON.stringify({
      result: "COMUN_48_2_B_PRODUCTION_BROWSER_READ_ONLY_GREEN",
      condition: conditionFacet.value,
      conditionCount: conditionFacet.count,
      problem: problemFacet.value,
      problemCount: problemFacet.count,
      recent90d: payload.indicators.recent90d,
      viewport: "360x740",
      businessWrites: 0,
    }),
  );
} finally {
  await browser.close();
}
