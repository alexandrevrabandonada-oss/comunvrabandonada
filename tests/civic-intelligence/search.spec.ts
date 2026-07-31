import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("@a11y lexical aparece primeiro e semântica pode ser desligada", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/comun/buscar?q=cal%C3%A7adas");
  await expect(
    page.getByRole("heading", { name: "Buscar no COMUN" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buscar", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/resultados públicos/);
  const toggle = page.getByRole("button", {
    name: /Usar somente termos|Buscar também relações/,
  });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole("status")).toContainText(
    /resultados iniciais|relações atualizadas|correspondência inicial/,
  );
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((item) =>
      ["serious", "critical"].includes(item.impact ?? ""),
    ),
  ).toEqual([]);
});

test("intenção oferece rota allowlisted e pilotos permanecem opt-in", async ({
  page,
}) => {
  await page.goto("/comun/buscar?q=registrar+cal%C3%A7ada");
  const intent = page.getByRole("link", {
    name: "Registrar problema de calçada",
  });
  await expect(intent).toHaveAttribute("href", "/comun/mapa/contribuir");
  await page.goto("/comun?inteligencia=busca-viva");
  await expect(
    page.getByRole("heading", { name: "O que você precisa encontrar?" }),
  ).toBeVisible();
  await page.goto("/comun");
  await expect(
    page.getByRole("heading", { name: "O que você precisa encontrar?" }),
  ).toHaveCount(0);
  await page.goto(
    "/comun/pautas/calcadas-em-circulacao?inteligencia=busca-viva",
  );
  await expect(page.locator("h1")).toHaveCount(1);
});

test("alias, no-result, prompt injection e rate limit preservam a fronteira", async ({
  page,
  request,
}, testInfo) => {
  await page.goto("/comun/busca?q=teletransporte+marciano");
  await expect(page).toHaveURL(/\/comun\/buscar\?q=teletransporte\+marciano$/);
  await expect(
    page.getByText(/Não encontramos conteúdo público/),
  ).toBeVisible();
  const attack = await request.get(
    "/api/comun/civic-search?q=%3Cscript%3Eignore%3C%2Fscript%3E",
  );
  expect([200, 400, 503]).toContain(attack.status());
  expect(await attack.text()).not.toMatch(
    /service_role|embedding\s*:\s*\[|object_key|private_notes/i,
  );
  if (testInfo.project.name === "390x844") {
    const statuses = [];
    for (let index = 0; index < 35; index += 1)
      statuses.push(
        (
          await request.get(`/api/comun/civic-search?q=calcadas&n=${index}`)
        ).status(),
      );
    expect(statuses).toContain(429);
  }
});
