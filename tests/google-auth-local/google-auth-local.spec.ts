import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const appOrigin = "http://127.0.0.1:3144";
const authOrigin = "http://127.0.0.1:55498";

test("preserva e-mail e acesso anônimo e prepara somente OAuth local mínimo", async ({
  page,
}) => {
  const contactedOrigins = new Set<string>();
  page.on("request", (request) => {
    contactedOrigins.add(new URL(request.url()).origin);
  });

  await page.goto(
    "/comun/entrar?returnTo=%2Fcomun%2Fminha-participacao%3Faba%3Drelatos",
  );
  await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "E-mail", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Senha", exact: true })).toBeVisible();
  await page.getByText("Como funciona o retorno", { exact: true }).click();
  await expect(page.getByRole("link", { name: /sem entrar/i })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);

  await page.getByRole("button", { name: "Continuar com Google" }).click();
  await page.waitForURL(`${authOrigin}/auth/v1/authorize?**`);
  await expect(page.getByRole("heading", { name: /interrompido antes do Google/i })).toBeVisible();

  const authorization = new URL(page.url());
  expect(authorization.origin).toBe(authOrigin);
  expect(authorization.searchParams.get("provider")).toBe("google");
  expect(authorization.searchParams.get("scopes")).toBe("openid email profile");
  expect(authorization.searchParams.get("access_type")).toBeNull();
  expect(authorization.searchParams.get("prompt")).toBeNull();
  expect(authorization.searchParams.get("redirect_to")).toBe(
    `${appOrigin}/comun/auth/callback?returnTo=%2Fcomun%2Fminha-participacao%3Faba%3Drelatos`,
  );
  expect([...contactedOrigins].every((origin) => [appOrigin, authOrigin].includes(origin))).toBe(true);
});

test("falha fechada no callback e não aceita retorno externo", async ({ page }) => {
  await page.goto(
    "/comun/auth/callback?code=invalid-local-code&returnTo=https%3A%2F%2Fevil.example%2Fcomun",
  );
  await page.waitForURL(`${appOrigin}/comun/entrar?erro=google`);
  await expect(
    page.getByRole("alert").filter({ hasText: /não foi possível concluir o acesso com Google/i }),
  ).toBeVisible();
  expect(page.url()).not.toContain("evil.example");
});
