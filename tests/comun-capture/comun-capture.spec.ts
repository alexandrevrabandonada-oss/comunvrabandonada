import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const captureText = (page: import("@playwright/test").Page) =>
  page.locator("#capture-text");
const saveButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Guardar", exact: true });
async function openCapture(
  page: import("@playwright/test").Page,
  path = "/comun/relatar",
) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('[data-comun-capture-hydrated="true"]'),
  ).toBeVisible();
}

test("calçada pode ser guardada sem pergunta bloqueante", async ({ page }) => {
  await openCapture(page);
  await expect(page.getByRole("heading", { name: "Vi um problema" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "O que aconteceu?" })).toBeVisible();

  await captureText(page).fill("a calçada está bloqueada por entulho");
  await expect(saveButton(page)).toBeVisible();
  await expect(page.getByText("A passagem está totalmente bloqueada?")).toHaveCount(0);
  await expect(page.getByText(/formulário detalhado/i)).toHaveCount(0);

  const violations = await new AxeBuilder({ page }).analyze();
  expect(
    violations.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("texto desconhecido não entra em loop e mantém Guardar", async ({ page }) => {
  await openCapture(page);
  await captureText(page).fill("tem uma coisa estranha acontecendo aqui");
  await expect(saveButton(page)).toBeVisible();
  await expect(page.getByText("Uma confirmação rápida")).toHaveCount(0);
  await expect(page.getByText(/formulário detalhado/i)).toHaveCount(0);
});

test("fumaça oferece pergunta tipada sem retirar Guardar", async ({ page }) => {
  await openCapture(page);
  await captureText(page).fill("há fumaça e vestígios no terreno");
  await expect(
    page.getByText("O fogo ainda está ativo ou restou apenas fumaça/vestígio?"),
  ).toBeVisible();
  await expect(saveButton(page)).toBeVisible();
  await page.getByRole("button", { name: "Ainda há fogo ou chamas" }).click();
  await expect(page.getByText("A pessoa confirmou fogo ativo.")).toBeVisible();
  await expect(saveButton(page)).toBeVisible();
});

test("luz ambígua permite guardar ou resolver uma única decisão", async ({ page }) => {
  await openCapture(page);
  await captureText(page).fill("A rua inteira está sem luz");
  await expect(
    page.getByText(
      "As casas também estão sem energia ou apenas as luminárias da rua?",
    ),
  ).toBeVisible();
  await expect(saveButton(page)).toBeVisible();
  await page
    .getByRole("button", { name: "As casas também estão sem energia" })
    .click();
  await expect(
    page.getByText(/hipótese principal é distribuição/i),
  ).toBeVisible();
  await expect(
    page.getByText(
      "As casas também estão sem energia ou apenas as luminárias da rua?",
    ),
  ).toHaveCount(0);
});

test("modo detalhado e alias antigo resolvem para o Relata canônico", async ({
  page,
}) => {
  await openCapture(page, "/comun/relatar?modo=detalhado");
  await expect(page.getByRole("heading", { name: "Vi um problema" })).toBeVisible();
  await expect(page.getByText("Relato detalhado", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Relato rápido", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Categoria rápida", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Enviar relato rápido", { exact: true })).toHaveCount(0);

  await page.goto("/comun/relata");
  await expect(page).toHaveURL(/\/comun\/relatar$/);
  await expect(page.getByRole("heading", { name: "Vi um problema" })).toBeVisible();
});

test("a captura não expõe envio automático nem categoria burocrática", async ({
  page,
}) => {
  await openCapture(page);
  await expect(page.getByText("Ainda não encaminhado")).toHaveCount(0);
  await expect(page.getByText("secretaria", { exact: false })).toHaveCount(0);
  await expect(
    page.getByText("Nenhum órgão público recebeu esta manifestação."),
  ).toBeVisible();
});
