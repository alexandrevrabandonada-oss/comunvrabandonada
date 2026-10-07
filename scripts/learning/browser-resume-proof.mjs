import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

export function sessionCookies(header, origin) {
  assert.equal(origin, "http://localhost:3017");
  return header.split("; ").map((entry) => {
    const separator = entry.indexOf("=");
    assert.ok(separator > 0);
    const name = entry.slice(0, separator);
    assert.match(name, /^sb-[a-zA-Z0-9_.-]+$/);
    return { name, value: entry.slice(separator + 1), url: origin };
  });
}

// Browser plugin not available: use the project's pinned Playwright and full
// Chromium. Real application, real Auth cookies, no route/API interception.
export async function proveBrowserResume({
  actors,
  mission,
  origin,
  directory,
}) {
  mkdirSync(directory, { recursive: true });
  const browser = await chromium.launch({ channel: "chromium" });
  let cases = 0;
  try {
    for (const width of [390, 1366]) {
      for (const actor of actors) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
        });
        try {
          await context.addCookies(sessionCookies(actor.cookie, origin));
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (error) => errors.push(error.name));
          const snapshot = () =>
            page.waitForResponse(
              (response) =>
                new URL(response.url()).pathname === "/api/comun/escola" &&
                response.request().method() === "GET",
              { timeout: 90000 },
            );
          async function verify(response) {
            assert.equal(
              response.status(),
              200,
              "real browser must retain authenticated API session",
            );
            assert.equal(
              response.headers()["cache-control"],
              "private, no-store",
            );
            const body = await response.json();
            const progress = body.progress.find(
              (entry) => entry.mission_id === mission.id,
            );
            assert.equal(progress.step, actor.step);
            assert.equal(progress.revision, actor.revision);
          }
          let response = snapshot();
          await page.goto(`${origin}/comun/escola`, { timeout: 90000 });
          await verify(await response);
          const next = page.getByRole("region", { name: "Próxima atividade" });
          await expect(
            next.getByRole("heading", {
              name: `${mission.number} · ${mission.title}`,
              exact: true,
            }),
          ).toBeVisible({ timeout: 30000 });
          await expect(
            next.getByText("Continue de onde parou", { exact: true }),
          ).toBeVisible();
          response = snapshot();
          await next
            .getByRole("link", { name: "Continuar", exact: true })
            .click();
          await verify(await response);
          await expect(
            page.getByRole("heading", { name: mission.title, exact: true }),
          ).toBeVisible();
          const stage =
            actor.step === 2 ? "Entenda a ferramenta" : "Teste sua leitura";
          await expect(
            page.getByRole("heading", { name: stage, exact: true }),
          ).toBeVisible();
          response = snapshot();
          await page.reload();
          await verify(await response);
          await expect(
            page.getByRole("heading", { name: stage, exact: true }),
          ).toBeVisible();
          assert.equal(
            new URL(page.url()).search,
            "",
            "private state must not move into query parameters",
          );
          assert.deepEqual(errors, [], "browser runtime errors");
          if (actor.label === "a")
            await page.screenshot({
              path: fileURLToPath(
                new URL(`escola-auth-${width}.png`, directory),
              ),
            });
          cases += 1;
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  assert.equal(cases, 4);
  return {
    cases,
    widths: [390, 1366],
    apiInterception: false,
    auth: "REAL_SSR_COOKIES",
    reload: "PERSISTED_DATABASE_STATE",
    screenshots: 2,
  };
}
