import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFixtureSidewalkImage } from "../../lib/sidewalk-photos";

const expectedHost = "comunvrabandonada.vercel.app";
const CONTROLLED_CONTRIBUTION_CYCLE_ID =
  "sidewalk-first-production-contribution-20260729-07";
const CONTROLLED_CONTRIBUTION_DESCRIPTION =
  "Registro controlado para validar o funcionamento inicial do fluxo de contribuição do Mapa de Calçadas.";
const CONTROLLED_CONTRIBUTION_FILENAME =
  "sidewalk-first-production-contribution-20260729-07.jpg";

function requireControlledEnvironment() {
  const baseUrl = process.env.COMUN_CONTROLLED_CONTRIBUTION_BASE_URL;
  if (process.env.COMUN_CONTROLLED_CONTRIBUTION_EXECUTION !== "authorized-once")
    throw new Error("COMUN_CONTROLLED_CONTRIBUTION_EXECUTION_NOT_AUTHORIZED");
  if (
    process.env.COMUN_CONTROLLED_CONTRIBUTION_CYCLE_ID !==
    CONTROLLED_CONTRIBUTION_CYCLE_ID
  )
    throw new Error("COMUN_CONTROLLED_CONTRIBUTION_CYCLE_INVALID");
  const url = new URL(baseUrl ?? "");
  if (url.protocol !== "https:" || url.hostname !== expectedHost)
    throw new Error("COMUN_CONTROLLED_CONTRIBUTION_TARGET_INVALID");
  return url;
}

async function writeEvidence(value: object) {
  const output = process.env.COMUN_CONTROLLED_CONTRIBUTION_BROWSER_OUTPUT;
  if (!output) throw new Error("COMUN_CONTROLLED_CONTRIBUTION_OUTPUT_REQUIRED");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("executes exactly one fixed, non-sensitive public contribution", async ({
  page,
}) => {
  requireControlledEnvironment();
  const mutableMethods = new Set<string>();
  let formOpened = false;
  let submissionAttempt = 0;
  let confirmationSeen = false;
  let consoleErrors = 0;
  let requestErrorCount = 0;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors += 1;
  });
  page.on("requestfailed", () => {
    requestErrorCount += 1;
  });
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
      mutableMethods.add(request.method());
  });

  try {
    await page.goto(
      "/comun/mapa/contribuir?origem=calcadas&pauta=calcadas-em-circulacao",
      { waitUntil: "networkidle" },
    );
    await expect(
      page.getByRole("heading", { name: /Registrar problema na calçada/i }),
    ).toBeVisible();
    formOpened = true;
    const image = await createFixtureSidewalkImage();
    await page.locator('input[type="file"]').setInputFiles({
      name: CONTROLLED_CONTRIBUTION_FILENAME,
      mimeType: image.mime,
      buffer: image.buffer,
    });
    const manualMap = page.getByRole("button", {
      name: /Mapa para confirmar ou ajustar o ponto/i,
    });
    await manualMap.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Regular", exact: true }).click();
    await page.getByRole("button", { name: "Irregular", exact: true }).click();
    await page
      .getByRole("button", { name: "Circulação geral", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: /Descrição opcional/i })
      .fill(CONTROLLED_CONTRIBUTION_DESCRIPTION);
    await page
      .getByRole("checkbox", { name: /Autorizo a publicação sanitizada/i })
      .check();
    await page
      .getByRole("checkbox", {
        name: /Conferi fotografia, local, condição e impacto/i,
      })
      .check();
    const submit = page.getByRole("button", {
      name: "Enviar para revisão",
      exact: true,
    });
    await expect(submit).toBeEnabled({ timeout: 20_000 });
    submissionAttempt = 1;
    await submit.click({ noWaitAfter: true });
    await expect(page).toHaveURL(
      /\/comun\/mapa\/contribuir\/confirmacao\?registro=/,
      { timeout: 60_000 },
    );
    await expect(
      page.getByText("Estado: em revisão", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    confirmationSeen = true;
  } finally {
    await writeEvidence({
      formatVersion: 1,
      cycleId: CONTROLLED_CONTRIBUTION_CYCLE_ID,
      formOpened,
      submissionAttempt,
      retryExecuted: false,
      confirmationSeen,
      consoleErrors,
      requestErrorCount,
      mutableRequestMethods: [...mutableMethods].sort(),
      contributionSubmitted: submissionAttempt === 1,
      sensitivePatternsObserved: 0,
    });
  }
});
