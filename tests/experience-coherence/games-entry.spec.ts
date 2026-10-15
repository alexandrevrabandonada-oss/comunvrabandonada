import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("@a11y Jogos oferece beta real sem carregar Unity no COMUN", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const hostname = new URL(request.url()).hostname;
    if (
      hostname === "alexandrevrabandonada.online" ||
      hostname.endsWith(".alexandrevrabandonada.online")
    ) {
      externalRequests.push(request.url());
    }
  });

  await page.goto("/comun/jogos");
  await expect(
    page.getByRole("heading", { name: "Jogos", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "VR: Cidade em Disputa" }),
  ).toBeVisible();

  const play = page.getByRole("link", {
    name: /Jogar Cidade em Disputa/,
  });
  await expect(play).toHaveAttribute(
    "href",
    "https://www.alexandrevrabandonada.online/jogar/cidade-em-disputa",
  );
  await expect(play).toHaveAttribute("target", "_blank");
  await expect(play).toHaveAttribute("rel", /noopener noreferrer/);
  await expect(
    page.locator("[data-comun-games-catalog] iframe"),
  ).toHaveCount(0);
  expect(externalRequests).toEqual([]);

  await expect(
    page.getByRole("link", { name: /Voltar a Explorar/ }),
  ).toHaveAttribute("href", "/comun/explorar");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("Explorar preserva Jogos na experiência App V2", async ({
  page,
}) => {
  await page.goto("/comun/explorar?experiencia=app-v2&categoria=jogos");
  const category = page.getByRole("link", { name: "Jogos" });
  await expect(category).toHaveAttribute(
    "href",
    "/comun/jogos?experiencia=app-v2",
  );
  await category.click();
  await expect(page).toHaveURL(/\/comun\/jogos\?experiencia=app-v2$/);
  await expect(
    page.getByRole("link", { name: /Voltar a Explorar/ }),
  ).toHaveAttribute("href", "/comun/explorar?experiencia=app-v2");
});
