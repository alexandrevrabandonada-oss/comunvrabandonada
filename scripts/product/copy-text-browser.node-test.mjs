import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";
import postcss from "postcss";
import tailwind from "tailwindcss";
import loadConfig from "tailwindcss/loadConfig.js";
import AxeBuilder from "@axe-core/playwright";

// Real rendered production components, synthetic text and controlled clipboard.
// This is not an authenticated route, RLS or human/device usability proof.
const repo = fileURLToPath(new URL("../../", import.meta.url));
const text =
  "Pedido sintético\nConsultar a resposta pública e guardar o protocolo.";
let fixture, server, browser, url;
const screenshotDir = process.env.COMUN_COPY_SCREENSHOT_DIR;
async function screenshot(page, name) {
  if (!screenshotDir) return;
  await mkdir(screenshotDir, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDir, name),
    fullPage: true,
  });
}
before(async () => {
  await mkdir(path.join(repo, ".local"), { recursive: true });
  fixture = await mkdtemp(path.join(repo, ".local/copy-text-browser-"));
  const css = await postcss([
    tailwind(loadConfig(path.join(repo, "tailwind.config.ts"))),
  ]).process(await readFile(path.join(repo, "app/globals.css"), "utf8"), {
    from: path.join(repo, "app/globals.css"),
  });
  await writeFile(path.join(fixture, "style.css"), css.css);
  await writeFile(
    path.join(fixture, "index.html"),
    '<!doctype html><html lang="pt-BR"><head><title>COMUN — cópia sintética</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>',
  );
  await writeFile(
    path.join(fixture, "entry.tsx"),
    `import React from 'react'; import {createRoot} from 'react-dom/client'; import {CopyOfficialTextButton} from '@/app/comun/acompanhar/[protocol]/ouvidoria/copy-official-text-button'; import {CopyProtocolButton} from '@/app/comun/relatar/confirmacao/copy-protocol-button'; import './style.css'; const root=createRoot(document.getElementById('root')!); const render=(protocol='SYNTHETIC-123')=>root.render(<main data-protocol={protocol} className="bg-white p-4 text-comun-black"><h1>Encaminhamento sintético</h1><CopyOfficialTextButton text={${JSON.stringify(text)}}/><CopyProtocolButton protocol={protocol}/></main>); window.changeSyntheticProtocol=()=>render('SYNTHETIC-456'); render();`,
  );
  server = await createServer({
    configFile: false,
    root: fixture,
    resolve: {
      alias: {
        "@": repo,
        react: path.join(repo, "node_modules/react"),
        "react-dom": path.join(repo, "node_modules/react-dom"),
      },
    },
    css: { postcss: { plugins: [] } },
    server: { host: "127.0.0.1", port: 0, fs: { allow: [repo] } },
    optimizeDeps: { include: ["react", "react-dom/client"] },
  });
  await server.listen();
  url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await server?.close();
  if (fixture) await rm(fixture, { recursive: true });
});

async function pageFor(mode, viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [],
    mutations = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method()))
      mutations.push(request.method());
  });
  await page.addInitScript((mode) => {
    window.copyCalls = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value:
        mode === "missing"
          ? undefined
          : {
              writeText: async (value) => {
                window.copyCalls.push(value);
                if (mode === "denied")
                  throw new DOMException("Denied", "NotAllowedError");
                if (mode === "pending")
                  await new Promise((resolve) => {
                    window.finishCopy = resolve;
                  });
              },
            },
    });
  }, mode);
  await page.goto(url);
  await page
    .getByRole("button", { name: "Copiar texto", exact: true })
    .waitFor();
  return { page, context, errors, mutations };
}

test("success only after clipboard acceptance; text and context unchanged", async () => {
  const { page, context, errors, mutations } = await pageFor("success");
  try {
    await page
      .getByRole("button", { name: "Copiar texto", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Texto copiado", exact: true })
      .waitFor();
    assert.deepEqual(await page.evaluate(() => window.copyCalls), [text]);
    assert.equal(await page.getByRole("textbox").count(), 0);
    assert.equal(page.url(), url);
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
  } finally {
    await context.close();
  }
});

for (const mode of ["denied", "missing"])
  test(`${mode}: keyboard fallback selects exact text, close restores focus`, async () => {
    const { page, context, errors, mutations } = await pageFor(mode);
    try {
      const button = page.getByRole("button", {
        name: "Copiar texto",
        exact: true,
      });
      await button.focus();
      await page.keyboard.press("Enter");
      const input = page.getByRole("textbox", {
        name: "Texto para copiar manualmente",
      });
      await input.waitFor();
      if (mode === "denied") {
        await screenshot(page, "copy-manual-desktop.png");
        const audit = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(
          audit.violations.filter((item) =>
            ["serious", "critical"].includes(item.impact),
          ),
          [],
        );
      }
      assert.equal(await input.inputValue(), text);
      assert.equal(
        await input.evaluate(
          (el) =>
            el.readOnly &&
            document.activeElement === el &&
            el.selectionStart === 0 &&
            el.selectionEnd === el.value.length,
        ),
        true,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Texto copiado", exact: true })
          .count(),
        0,
      );
      await page.getByRole("button", { name: "Fechar cópia manual" }).click();
      assert.equal(
        await button.evaluate((el) => document.activeElement === el),
        true,
      );
      assert.equal(page.url(), url);
      assert.deepEqual(errors, []);
      assert.deepEqual(mutations, []);
    } finally {
      await context.close();
    }
  });

test("pending copy accepts only one operation and never announces success early", async () => {
  const { page, context, errors } = await pageFor("pending");
  try {
    await page
      .getByRole("button", { name: "Copiar texto", exact: true })
      .evaluate((el) => {
        el.click();
        el.click();
      });
    assert.deepEqual(await page.evaluate(() => window.copyCalls), [text]);
    assert.equal(
      await page
        .getByRole("button", { name: "Copiar texto", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Texto copiado", exact: true })
        .count(),
      0,
    );
    await page.evaluate(() => window.finishCopy());
    await page
      .getByRole("button", { name: "Texto copiado", exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});

test("mobile protocol fallback preserves handle and fits viewport", async () => {
  const { page, context, errors, mutations } = await pageFor("denied", {
    width: 390,
    height: 844,
  });
  try {
    await page
      .getByRole("button", { name: "Copiar protocolo", exact: true })
      .click();
    const input = page.getByRole("textbox", {
      name: "Protocolo para copiar manualmente",
    });
    await input.waitFor();
    await screenshot(page, "copy-protocol-mobile.png");
    const audit = await new AxeBuilder({ page }).analyze();
    assert.deepEqual(
      audit.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact),
      ),
      [],
    );
    assert.equal(await input.inputValue(), "SYNTHETIC-123");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.ok(
      (
        await page
          .getByRole("button", { name: "Fechar cópia manual" })
          .boundingBox()
      ).height >= 44,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(mutations, []);
  } finally {
    await context.close();
  }
});

test("changed protocol never inherits the previous copied confirmation", async () => {
  const { page, context } = await pageFor("success");
  try {
    await page
      .getByRole("button", { name: "Copiar protocolo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Protocolo copiado", exact: true })
      .waitFor();
    await page.evaluate(() => window.changeSyntheticProtocol());
    await page.waitForFunction(
      () =>
        document.querySelector("main")?.dataset.protocol === "SYNTHETIC-456",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Protocolo copiado", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Copiar protocolo", exact: true })
      .click();
    assert.deepEqual(await page.evaluate(() => window.copyCalls), [
      "SYNTHETIC-123",
      "SYNTHETIC-456",
    ]);
  } finally {
    await context.close();
  }
});
