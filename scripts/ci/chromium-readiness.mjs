/**
 * Probe the exact Chromium selected by the installed Playwright package.
 * A cache hit alone is never proof that Chromium can actually launch.
 * No network destination or user account is involved in this smoke test.
 */
export async function probeChromiumReadiness(chromium) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, timeout: 30_000 });
    const page = await browser.newPage();
    await page.goto("about:blank");
    return (await page.evaluate(() => document.readyState)) === "complete";
  } catch {
    return false;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
