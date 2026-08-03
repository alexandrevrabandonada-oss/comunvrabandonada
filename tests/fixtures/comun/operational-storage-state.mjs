import { access, readFile, rm } from "node:fs/promises";

function isExpired(cookie) {
  return (
    typeof cookie.expires === "number" &&
    cookie.expires > 0 &&
    cookie.expires * 1000 <= Date.now()
  );
}

async function invalidate(path, reason) {
  await rm(path, { force: true }).catch(() => {});
  throw new Error(`storageState inválido: ${reason}`);
}

// Valida o arquivo antes de reutilizá-lo e, sobretudo, em um contexto novo.
// Não inspeciona nem registra valores de cookie/tokens.
export async function validateOperationalStorageState({
  browser,
  path,
  persona,
  runId,
  baseUrl,
  protectedPath,
  heading,
  identityEmail,
}) {
  try {
    await access(path);
  } catch {
    return invalidate(path, "arquivo ausente");
  }

  let state;
  try {
    state = JSON.parse(await readFile(path, "utf8"));
  } catch {
    return invalidate(path, "JSON ilegível");
  }
  const normalizedPath = path.replaceAll("\\", "/");
  if (!normalizedPath.includes(`/${runId}/`))
    return invalidate(path, "run id incompatível");
  const cookies = state?.cookies ?? [];
  const authCookies = cookies.filter(
    (cookie) => /^sb-.*auth-token/i.test(cookie.name) && Boolean(cookie.value),
  );
  if (!authCookies.length) return invalidate(path, "cookie de sessão ausente");
  if (authCookies.some(isExpired))
    return invalidate(path, "cookie de sessão expirado");

  const context = await browser.newContext({ storageState: path });
  try {
    const page = await context.newPage();
    await page.goto(new URL(protectedPath, baseUrl).toString());
    if (
      new URL(page.url()).pathname.includes("/login") ||
      new URL(page.url()).pathname.includes("/entrar")
    ) {
      return invalidate(path, "redirect para login");
    }
    await page
      .locator("main")
      .getByRole("heading", { name: heading })
      .first()
      .waitFor({ state: "visible" });
    if (await page.getByLabel("E-mail").count())
      return invalidate(path, "formulário de login presente");
    if (identityEmail) {
      await page.goto(new URL("/comun/admin/acervo", baseUrl).toString());
      await page
        .getByText(identityEmail, { exact: true })
        .waitFor({ state: "visible" });
    }
    const currentCookies = await context.cookies();
    if (
      !currentCookies.some(
        (cookie) =>
          /^sb-.*auth-token/i.test(cookie.name) &&
          Boolean(cookie.value) &&
          !isExpired(cookie),
      )
    ) {
      return invalidate(path, `cookie ausente no contexto novo (${persona})`);
    }
  } catch (error) {
    await rm(path, { force: true }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}
