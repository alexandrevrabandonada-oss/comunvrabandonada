/** Synthetic identities only; invoked inside the owned M6 network. */
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

export async function openMesaBrowserProof(identity) {
  const browser = await chromium.launch({
    headless: true,
    channel: "chromium",
    // Exercise real history restoration instead of Playwright's cache opt-out.
    ignoreDefaultArgs: ["--disable-back-forward-cache"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const origin = "http://127.0.0.1:3126";
    await context.addCookies(
      [...identity.cookies].map(([name, value]) => ({
        name,
        value,
        url: origin,
        sameSite: "Lax",
      })),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", () => errors.push("browser-page-error"));
    const response = await page.goto(`${origin}/comun/c/m6-owned/mesa`);
    assert.equal(response.status(), 200);
    await page.locator('[data-comun-mesa-private="true"]').waitFor();
    assert(
      await page
        .getByRole("heading", { name: "Mesa organizativa" })
        .isVisible(),
    );
    assert.match(page.url(), /\/comun\/c\/m6-owned\/mesa$/);
    assert(await page.title());
    assert.equal(await page.locator("nextjs-portal").count(), 0);
    await page.screenshot({ path: "/tmp/comun-m6-browser.png" });
    await page.goto(`${origin}/comun/offline`);
    await page.getByRole("heading", { name: "Sem conexão agora." }).waitFor();
    await page.evaluate(() =>
      Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("M6_SERVICE_WORKER_NOT_READY")),
            15000,
          ),
        ),
      ]),
    );
    return {
      async assertRevokedHistoryAndOffline() {
        await page.goBack({ waitUntil: "domcontentloaded" });
        // Never accept a historical DOM containing a revoked private projection.
        assert.equal(
          await page.locator('[data-comun-mesa-private="true"]').count(),
          0,
        );
        const denied = await page.goto(`${origin}/comun/c/m6-owned/mesa`);
        assert.equal(denied.status(), 404);
        assert.equal(
          await page.locator('[data-comun-mesa-private="true"]').count(),
          0,
        );
        await page.goto(`${origin}/comun/offline`);
        await context.setOffline(true);
        try {
          await page.goto(`${origin}/comun/c/m6-owned/mesa`);
        } catch (error) {
          assert.match(error.message, /ERR_INTERNET_DISCONNECTED|ERR_FAILED/);
        }
        assert.equal(
          await page.locator('[data-comun-mesa-private="true"]').count(),
          0,
        );
        const cacheHasMesa = await page.evaluate(async () => {
          for (const name of await caches.keys()) {
            const keys = await (await caches.open(name)).keys();
            if (keys.some((key) => new URL(key.url).pathname.endsWith("/mesa")))
              return true;
          }
          return false;
        });
        assert.equal(cacheHasMesa, false);
        assert.deepEqual(errors, []);
      },
      close: () => browser.close(),
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}
