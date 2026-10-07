import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const record = {
  item_id: "00000000-0000-4000-8000-000000000001",
  item_type: "relata_report",
  title_template: "Registro sintético",
  category: "other",
  presentation_state: "waiting_response",
  action_required: null,
  protocol_masked: "COMUN-****",
  source_domain: "relata",
  metadata: {},
  created_at: "2026-10-06T12:00:00Z",
  updated_at: "2026-10-06T12:00:00Z",
};

for (const experience of ["", "?experiencia=legacy"]) {
  test(`record → guidance → private return ${experience || "canonical"}`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const writes: string[] = [];
    await page.route("**/api/comun/participation-wallet**", async (route) => {
      if (route.request().method() !== "GET")
        writes.push(route.request().method());
      await route.fulfill({
        json: { wallet: { present: true }, items: [record] },
      });
    });
    await page.goto(`/comun/minha-participacao${experience}`);
    const wallet = page.locator("[data-comun-participation-wallet]");
    await expect(
      wallet.getByRole("button", { name: "Retomar meu registro", exact: true }),
    ).toBeVisible();
    await wallet
      .getByRole("button", { name: "Retomar meu registro", exact: true })
      .click();
    await expect(page.locator("[data-wallet-item-id]")).toBeFocused();
    const guidance = wallet.locator("[data-comun-record-guidance]");
    await expect(guidance).toBeVisible();
    await expect(guidance).toHaveAttribute(
      "href",
      `/comun/ajuda/primeira-acao?etapa=acompanhamento${experience ? "&experiencia=legacy" : ""}`,
    );
    await guidance.click();
    await expect(
      page.locator("[data-comun-practice-guidance=acompanhamento]"),
    ).toBeVisible();
    expect(page.url()).not.toContain(record.item_id);
    await expect(page.locator("h1")).toHaveCount(1);
    await page
      .getByRole("link", { name: "Voltar aos meus registros", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(
        `/comun/minha-participacao${experience ? "\\?experiencia=legacy" : ""}#meus-registros$`,
      ),
    );
    await expect(
      wallet.getByRole("button", { name: "Retomar meu registro", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      wallet.getByRole("button", { name: "Retomar meu registro", exact: true }),
    ).toBeVisible();
    await expect(
      wallet.getByRole("link", {
        name: "Se quiser contribuir, conheça ações e condições",
      }),
    ).toHaveAttribute("href", `/comun/acoes${experience}`);
    expect(writes).toEqual([]);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .include("[data-comun-participation-wallet]")
      .analyze();
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    if (process.env.COMUN_QA_SCREENSHOT_DIR && !experience)
      await page.screenshot({
        path: `${process.env.COMUN_QA_SCREENSHOT_DIR}/continuity-${info.project.name}.png`,
      });
  });
}

test("loading and failed reads never become empty success; retry recovers", async ({
  page,
}) => {
  let releaseRead!: () => void;
  const barrier = new Promise<void>((resolve) => {
    releaseRead = resolve;
  });
  let available = false;
  await page.route("**/api/comun/participation-wallet", async (route) => {
    await barrier;
    if (!available) {
      await route.fulfill({ status: 503, json: { code: "unavailable" } });
    } else
      await route.fulfill({
        json: { wallet: { present: true }, items: [record] },
      });
  });
  await page.goto("/comun/minha-participacao");
  await expect(page.getByText("Consultando seus registros…")).toBeVisible();
  await expect(
    page.getByText("Você ainda não tem registros neste navegador."),
  ).toHaveCount(0);
  releaseRead();
  await expect(
    page.locator("[data-comun-participation-wallet]").getByRole("alert"),
  ).toContainText("Não foi possível consultar seus registros");
  await expect(
    page.getByText("Nada precisa da sua atenção agora."),
  ).toHaveCount(0);
  available = true;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("button", { name: "Retomar meu registro", exact: true }),
  ).toBeVisible();
});

test("actual empty wallet offers guidance without creating progress or a task", async ({
  page,
}) => {
  const methods: string[] = [];
  await page.route("**/api/comun/participation-wallet", async (route) => {
    methods.push(route.request().method());
    await route.fulfill({ json: { wallet: { present: true }, items: [] } });
  });
  await page.goto("/comun/minha-participacao");
  await expect(
    page.getByRole("button", { name: "Retomar meu registro" }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Escolher uma primeira prática" })
    .click();
  await expect(
    page.locator("[data-comun-practice-guidance=registro]"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Abrir um relato", exact: true }),
  ).toHaveAttribute("href", "/comun/relatar");
  expect(methods.length).toBeGreaterThan(0);
  expect([...new Set(methods)]).toEqual(["GET"]);
});

test("invalid response fails closed instead of claiming a new wallet", async ({
  page,
}) => {
  await page.route("**/api/comun/participation-wallet", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.goto("/comun/minha-participacao");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Começar meus registros" }),
  ).toHaveCount(0);
});

test("withdrawn record does not generate an invitation to resume", async ({
  page,
}) => {
  await page.route("**/api/comun/participation-wallet", (route) =>
    route.fulfill({
      json: {
        wallet: { present: true },
        items: [{ ...record, presentation_state: "withdrawn" }],
      },
    }),
  );
  await page.goto("/comun/minha-participacao");
  await expect(
    page.getByRole("button", { name: "Retomar meu registro" }),
  ).toHaveCount(0);
  await expect(page.locator("[data-comun-record-guidance]")).toHaveCount(0);
});
