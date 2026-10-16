import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const mode of ["legacy", "app-v2"]) {
  test(`publication date stays truthful through ${mode} detail and return`, async ({
    page,
    context,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const route = `/comun/radio/episodios/escuta-local?origem=descoberta&categoria=radio&experiencia=${mode}`;
    for (const [state, label] of [
      ["date-utc", "Publicação: 02/10/2026"],
      ["date-missing", "Data de publicação não informada."],
      ["date-invalid", "Data de publicação inválida."],
    ]) {
      await context.addCookies([
        { name: "discovery-lab", value: state, url: "http://127.0.0.1:3150" },
      ]);
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`experiencia=${mode}`));
      await expect(page).toHaveTitle(/COMUN/);
      await expect(
        page.getByRole("heading", {
          name: "Escuta da praça — laboratório",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.locator('[data-comun-app-v2-page="radio-episode"]'),
      ).toHaveCount(mode === "app-v2" ? 1 : 0);
      const date = page.locator("[data-comun-radio-publication]:visible");
      await expect(date).toHaveCount(1);
      await expect(date).toHaveText(label);
      if (state === "date-utc") {
        await expect(date.locator("time")).toHaveAttribute(
          "datetime",
          "2026-10-02T02:30:00.000Z",
        );
      } else {
        await expect(date.locator("time")).toHaveCount(0);
      }
      await expect(page.getByText("Invalid Date", { exact: true })).toHaveCount(
        0,
      );
      await expect(page.locator("nextjs-portal")).toHaveCount(0);
      expect(
        (
          await new AxeBuilder({ page })
            .include("[data-comun-radio-rights]")
            .analyze()
        ).violations,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (state === "date-utc") {
        await page.screenshot({
          path: testInfo.outputPath(`radio-date-${mode}.png`),
          fullPage: true,
        });
      }
      await page.getByRole("link", { name: "Voltar à descoberta" }).click();
      await expect(page).toHaveURL(/\/comun\/explorar\?.*categoria=radio/);
    }
    expect(errors).toEqual([]);
  });
}
