import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { assertSyntheticEnvironment } from "./run-soc-d08-browser-proof.mjs";

assertSyntheticEnvironment(process.env);
const output = ".ci-artifacts/soc-d08-native";
mkdirSync(output, { recursive: true });
const evidence = {
  runSha: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  contract: "STATIC_HTML_NO_PRODUCT_NO_AUTH_NO_NETWORK",
  plannedContexts: 100,
  completedContexts: 0,
  status: "NOT_RUN",
};
let browser;
try {
  browser = await chromium.launch();
  for (let index = 0; index < evidence.plannedContexts; index++) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.route("**/*", (route) => route.abort());
      await page.setContent(
        '<form><label>E-mail<input type="email"></label><label>Senha<input type="password"></label><button type="button" onclick="document.querySelector(\'output\').textContent=\'done\'">Entrar</button><output></output></form>',
      );
      await page
        .getByLabel("E-mail", { exact: true })
        .fill("synthetic@example.invalid");
      await page
        .getByLabel("Senha", { exact: true })
        .fill("synthetic-only-password");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      if ((await page.locator("output").textContent()) !== "done")
        throw new Error("ASSERTION_FAILED");
      evidence.completedContexts++;
    } finally {
      await context.close();
    }
  }
  evidence.status = "PASS";
} catch {
  evidence.status = "FAIL";
  evidence.browserConnected = browser?.isConnected() ?? false;
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  writeFileSync(
    `${output}/static-baseline.json`,
    JSON.stringify(evidence, null, 2) + "\n",
  );
  console.log(JSON.stringify(evidence));
}
