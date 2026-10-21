import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const offer =
  "/comun/cooperativas/organizacao-lab/ofertas/oferta-lab/interesse";
const need =
  "/comun/cooperativas/organizacao-lab/necessidades/necessidade-lab/ajudar";
const message = "Gostaria de conhecer esta oferta de livros.";
const prefix = "comun:solidarity-connection:";
const errors = new WeakMap<Page, string[]>();
async function login(page: Page, actor = "a", returnTo = offer) {
  await page.goto(`/comun/entrar?returnTo=${encodeURIComponent(returnTo)}`);
  await page
    .getByLabel("E-mail", { exact: true })
    .fill(`${actor}@example.invalid`);
  await page
    .getByLabel("Senha", { exact: true })
    .fill("synthetic-only-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(returnTo);
}
async function save(page: Page) {
  await page.getByLabel("Sua mensagem para a organização").fill(message);
  await page
    .getByRole("button", { name: "Salvar somente mensagem", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Somente a mensagem foi salva" }),
  ).toBeVisible();
}
async function submit(page: Page, kind = "offer") {
  await page.getByLabel("Sua mensagem para a organização").fill(message);
  await page
    .getByLabel("Contato protegido", { exact: true })
    .fill("synthetic@example.invalid");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", {
      name: kind === "offer" ? "Enviar interesse" : "Oferecer ajuda",
      exact: true,
    })
    .click();
}
test.beforeEach(async ({ page, request }) => {
  const observed: string[] = [];
  errors.set(page, observed);
  page.on("pageerror", (error) => observed.push(error.message));
  await request.post("/lab-state", { data: { reset: true } });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test("explicit restore has no contact/consent; same initial render; keyboard and axe", async ({
  page,
}) => {
  await login(page);
  await page
    .getByLabel("Contato protegido", { exact: true })
    .fill("synthetic@example.invalid");
  await page.getByRole("checkbox").check();
  await save(page);
  const raw = await page.evaluate(
    (p) =>
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(p))
        .map((key) => sessionStorage.getItem(key)),
    prefix,
  );
  expect(raw.join()).not.toMatch(/synthetic@example|consent|contact/);
  await page.reload();
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    "",
  );
  await page
    .getByRole("button", { name: "Recuperar mensagem salva", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    message,
  );
  await expect(
    page.getByLabel("Sua mensagem para a organização"),
  ).toBeFocused();
  await expect(
    page.getByLabel("Contato protegido", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("anonymous -> actual login action -> context; no anonymous draft association", async ({
  page,
}) => {
  await page.goto(offer);
  await page.getByLabel("Sua mensagem para a organização").fill(message);
  await expect(
    page.getByRole("button", { name: "Salvar somente mensagem" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Entrar antes de enviar", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Entrar para continuar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Entrar para continuar", exact: true })
    .click();
  await page.getByLabel("E-mail", { exact: true }).fill("a@example.invalid");
  await page
    .getByLabel("Senha", { exact: true })
    .fill("synthetic-only-password");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(offer);
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Contato protegido", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});

test("denied storage getter preserves memory and has no false save", async ({
  page,
}) => {
  await login(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
  });
  await page.goto(offer);
  // Explain the disabled control before the user has typed or tried to save.
  await expect(
    page.getByRole("status").filter({
      hasText: "O armazenamento local não está disponível por completo",
    }),
  ).toBeVisible();
  await page.getByLabel("Sua mensagem para a organização").fill(message);
  await expect(
    page.getByRole("button", { name: "Salvar somente mensagem", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    message,
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Alterações apenas em memória" }),
  ).toBeVisible();
});

test("legacy deletion denied is explained before typing without exposing legacy fields", async ({
  page,
}) => {
  await login(page);
  await page.evaluate((prefix) => {
    sessionStorage.setItem(
      `${prefix}v1:retained`,
      JSON.stringify({
        message: "Legacy synthetic private message",
        contact: "legacy@example.invalid",
        consent: true,
      }),
    );
  }, prefix);
  await page.addInitScript(() => {
    Storage.prototype.removeItem = () => {
      throw new DOMException("denied", "SecurityError");
    };
  });
  await page.goto(offer);
  await expect(
    page.getByRole("status").filter({
      hasText: "O armazenamento local não está disponível por completo",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Contato protegido", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(
    page.getByText("Legacy synthetic private message", { exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      (prefix) =>
        Object.keys(sessionStorage).filter((key) =>
          key.startsWith(`${prefix}v1:`),
        ).length,
      prefix,
    ),
  ).toBe(1);
});

test("failed write/removal stay honest and preserve typed message", async ({
  page,
}) => {
  await login(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("denied", "QuotaExceededError");
    };
    Storage.prototype.removeItem = () => {
      throw new DOMException("denied", "SecurityError");
    };
  });
  await page.getByLabel("Sua mensagem para a organização").fill(message);
  await page
    .getByRole("button", { name: "Salvar somente mensagem", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Não foi possível salvar" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Descartar rascunho salvo", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Não foi possível remover" }),
  ).toBeVisible();
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    message,
  );
});

for (const invalid of ["expired", "invalid", "legacy", "other-item"]) {
  test(`does not expose ${invalid} draft`, async ({ page }) => {
    await login(page);
    await save(page);
    await page.evaluate(
      ({ prefix, invalid }) => {
        const key = Object.keys(sessionStorage).find((key) =>
          key.startsWith(prefix),
        )!;
        const value = JSON.parse(sessionStorage.getItem(key)!);
        if (invalid === "expired") {
          value.savedAt = Date.now() - 30 * 60 * 1000;
          sessionStorage.setItem(key, JSON.stringify(value));
        }
        if (invalid === "invalid") sessionStorage.setItem(key, "malformed");
        if (invalid === "legacy") {
          sessionStorage.removeItem(key);
          sessionStorage.setItem(
            key.replace(":v2:", ":v1:"),
            JSON.stringify({
              message: "LEGACY MUST NOT SHOW",
              contact: "private@example.invalid",
              consent: true,
            }),
          );
        }
        if (invalid === "other-item") {
          value.subjectId = "a5000000-0000-4000-8000-000000000099";
          sessionStorage.setItem(key, JSON.stringify(value));
        }
      },
      { prefix, invalid },
    );
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "Recuperar mensagem salva",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByLabel("Sua mensagem para a organização"),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Contato protegido", { exact: true }),
    ).toHaveValue("");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
  });
}

test("two accounts on the same item cannot recover each other's message", async ({
  page,
}) => {
  await login(page);
  await save(page);
  await login(page, "b");
  await expect(
    page.getByRole("button", { name: "Recuperar mensagem salva", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Contato protegido", { exact: true }),
  ).toHaveValue("");
});

test("click Sair executes real logoutCommunity and clears all draft versions", async ({
  page,
  request,
}) => {
  await login(page);
  await save(page);
  await page.evaluate(() =>
    sessionStorage.setItem(
      "comun:solidarity-connection:v1:old",
      "legacy-never-read",
    ),
  );
  await page.goto("/comun/conta");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL("/comun/entrar");
  expect((await (await request.get("/lab-state")).json()).logouts).toBe(1);
  expect(
    await page.evaluate(
      (p) => Object.keys(sessionStorage).filter((key) => key.startsWith(p)),
      prefix,
    ),
  ).toEqual([]);
  await login(page, "b");
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    "",
  );
});

for (const unavailable of ["published", "eligible"]) {
  test(`actual create action revalidates ${unavailable} after page was opened`, async ({
    page,
    request,
  }) => {
    await login(page);
    await request.post("/lab-state", { data: { [unavailable]: false } });
    await submit(page);
    await expect(page.locator("#connection-feedback")).toContainText(
      "não está disponível",
    );
    expect((await (await request.get("/lab-state")).json()).rows).toBe(0);
  });
}

for (const kind of ["offer", "need"]) {
  test(`real actions: ${kind} submit, duplicate, follow, editor accept and member withdraw`, async ({
    page,
    request,
  }) => {
    const item = kind === "offer" ? offer : need;
    await login(page, "a", item);
    await submit(page, kind);
    await expect(
      page.getByRole("heading", { name: "Conexão enviada", exact: true }),
    ).toBeVisible();
    await page.goto(item);
    await submit(page, kind);
    await expect(
      page.getByRole("heading", { name: "Conexão já registrada", exact: true }),
    ).toBeVisible();
    expect((await (await request.get("/lab-state")).json()).rows).toBe(1);
    await page
      .getByRole("link", {
        name: "Acompanhar em Minha participação",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Aguardando resposta", { exact: true }),
    ).toBeVisible();
    await login(page, "editor", "/comun/cooperativas/organizacao-lab");
    await page
      .getByRole("button", { name: "Aceitar conexão", exact: true })
      .click();
    await expect(page).toHaveURL(/conexao=aceita/);
    await login(page, "a", "/comun/minha-participacao?secao=acompanhando");
    await expect(
      page.getByText("Conexão aceita", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Retirar conexão", exact: true })
      .click();
    await expect(
      page.getByText("Você retirou esta conexão", { exact: true }),
    ).toBeVisible();
  });
}

test("B cannot review A; editor rejection is reflected without a withdrawal invitation", async ({
  page,
}) => {
  await login(page);
  await submit(page);
  await expect(
    page.getByRole("heading", { name: "Conexão enviada", exact: true }),
  ).toBeVisible();
  await login(page, "b", "/comun/minha-participacao?secao=acompanhando");
  await expect(
    page.getByText("Oferta sintética de livros", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/comun/cooperativas/organizacao-lab");
  await page
    .getByRole("button", { name: "Recusar conexão", exact: true })
    .click();
  await expect(page).toHaveURL(/conexao=erro/);
  await login(page, "a", "/comun/minha-participacao?secao=acompanhando");
  await expect(
    page.getByText("Aguardando resposta", { exact: true }),
  ).toBeVisible();
  await login(page, "editor", "/comun/cooperativas/organizacao-lab");
  await page
    .getByRole("button", { name: "Recusar conexão", exact: true })
    .click();
  await expect(page).toHaveURL(/conexao=recusada/);
  await login(page, "a", "/comun/minha-participacao?secao=acompanhando");
  await expect(
    page.getByText("A organização não seguiu com esta conexão", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retirar conexão", exact: true }),
  ).toHaveCount(0);
});

test("logout still signs out when deletion fails; another account and new login cannot recover", async ({
  page,
  request,
}) => {
  await login(page);
  await save(page);
  await page.addInitScript(() => {
    Storage.prototype.removeItem = () => {
      throw new DOMException("denied", "SecurityError");
    };
  });
  await page.goto("/comun/conta");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL("/comun/entrar");
  expect((await (await request.get("/lab-state")).json()).logouts).toBe(1);
  expect(
    await page.evaluate(
      (p) => Object.keys(sessionStorage).some((key) => key.startsWith(p)),
      prefix,
    ),
  ).toBe(true);
  await login(page, "b");
  await expect(
    page.getByRole("button", { name: "Recuperar mensagem salva", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    "",
  );
  await login(page, "a");
  await expect(
    page.getByRole("button", { name: "Recuperar mensagem salva", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    "",
  );
});

test("legacy form keeps readable contrast and keyboard controls", async ({
  page,
}) => {
  await login(page);
  await page.goto(`${offer}?experiencia=legacy`);
  await expect(
    page.getByLabel("Sua mensagem para a organização"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Selecionar texto para copiar", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Sua mensagem para a organização"),
  ).toBeFocused();
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Sair failure stays explicit and permits another actual logout attempt", async ({
  page,
  request,
}) => {
  await login(page);
  await save(page);
  await request.post("/lab-state", { data: { logoutFails: true } });
  await page.goto("/comun/conta");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL("/comun/conta?status=saida-nao-confirmada");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Não foi possível confirmar a saída" }),
  ).toContainText("Não foi possível confirmar a saída");
  await request.post("/lab-state", { data: { logoutFails: false } });
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL("/comun/entrar");
  expect((await (await request.get("/lab-state")).json()).logouts).toBe(2);
});

for (const kind of ["offer", "need"] as const) {
  test(`public card -> ${kind} -> login -> safe contextual return`, async ({
    page,
  }, testInfo) => {
    await page.goto(
      "/comun/cooperativas?experiencia=legacy&token=PRIVATE_SENTINEL",
    );
    const card = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        name:
          kind === "offer"
            ? "Oferta sintética de livros"
            : "Ajuda sintética com livros",
        exact: true,
      }),
    });
    const link = card.getByRole("link", {
      name: kind === "offer" ? /^Tenho interesse/ : /^Posso ajudar/,
    });
    const href = await link.getAttribute("href");
    expect(href).toBe(
      `${kind === "offer" ? offer : need}?origem=feirinha&experiencia=legacy`,
    );
    if (kind === "offer") {
      const audit = await new AxeBuilder({ page }).analyze();
      expect(
        audit.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("public-directory.png"),
        fullPage: true,
      });
    }
    await link.focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Sua mensagem para a organização").fill(message);
    await page
      .getByRole("button", {
        name: "Entrar antes de enviar",
        exact: true,
      })
      .click();
    await page
      .getByRole("link", { name: "Entrar para continuar", exact: true })
      .click();
    await page.getByLabel("E-mail", { exact: true }).fill("a@example.invalid");
    await page
      .getByLabel("Senha", { exact: true })
      .fill("synthetic-only-password");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(href!);
    await expect(
      page.getByLabel("Sua mensagem para a organização"),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Contato protegido", { exact: true }),
    ).toHaveValue("");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    await page.getByRole("link", { name: "Voltar à Feirinha" }).click();
    await expect(page).toHaveURL("/comun/cooperativas?experiencia=legacy");
    expect(page.url()).not.toContain("PRIVATE_SENTINEL");
  });
}

test("another tab changing identity cannot expose the previous tab message", async ({
  page,
}) => {
  await login(page);
  await save(page);
  await page
    .getByLabel("Contato protegido", { exact: true })
    .fill("synthetic@example.invalid");
  await page.getByRole("checkbox").check();
  const second = await page.context().newPage();
  const secondErrors: string[] = [];
  second.on("pageerror", (error) => secondErrors.push(error.message));
  try {
    await login(second, "b");
    await page.bringToFront();
    await expect(
      page.getByLabel("Sua mensagem para a organização"),
    ).toHaveValue("");
    await expect(
      page.getByLabel("Contato protegido", { exact: true }),
    ).toHaveValue("");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    expect(secondErrors).toEqual([]);
  } finally {
    await second.close();
  }
});

test("another tab with the same validated login preserves the in-memory message", async ({
  page,
}) => {
  await login(page);
  await save(page);
  const second = await page.context().newPage();
  const secondErrors: string[] = [];
  second.on("pageerror", (error) => secondErrors.push(error.message));
  try {
    await second.goto(offer);
    await expect(
      second.getByLabel("Sua mensagem para a organização"),
    ).toHaveValue("");
    await page.bringToFront();
    await expect(
      page.getByLabel("Sua mensagem para a organização"),
    ).toHaveValue(message);
    expect(secondErrors).toEqual([]);
  } finally {
    await second.close();
  }
});

test("server rejects stale form when cross-tab notifications are denied", async ({
  page,
  request,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "BroadcastChannel", {
      configurable: true,
      value: class {
        constructor() {
          throw new DOMException("Unavailable", "SecurityError");
        }
      },
    }),
  );
  await login(page);
  await save(page);
  await page
    .getByLabel("Contato protegido", { exact: true })
    .fill("synthetic@example.invalid");
  await page.getByRole("checkbox").check();
  const second = await page.context().newPage();
  const secondErrors: string[] = [];
  second.on("pageerror", (error) => secondErrors.push(error.message));
  try {
    await login(second, "b");
    await page
      .getByRole("button", { name: "Enviar interesse", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Sua sessão mudou" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Sua mensagem para a organização"),
    ).toHaveCount(0);
    expect((await (await request.get("/lab-state")).json()).rows).toBe(0);
    expect(secondErrors).toEqual([]);
  } finally {
    await second.close();
  }
});
test("synthetic window blur/focus fallback rechecks same login without restoring contact", async ({
  page,
}) => {
  await login(page);
  await save(page);
  await page
    .getByLabel("Contato protegido", { exact: true })
    .fill("synthetic@example.invalid");
  await page.getByRole("checkbox").check();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveCount(
    0,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByLabel("Sua mensagem para a organização")).toHaveValue(
    message,
  );
  await expect(
    page.getByLabel("Contato protegido", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
});

test("Sair in another tab masks this form and clears its draft", async ({
  page,
  request,
}) => {
  await login(page);
  await save(page);
  const second = await page.context().newPage();
  const secondErrors: string[] = [];
  second.on("pageerror", (error) => secondErrors.push(error.message));
  try {
    await second.goto("/comun/conta");
    await second.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(second).toHaveURL("/comun/entrar");
    await expect(
      page.getByLabel("Sua mensagem para a organização"),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        (p) =>
          Object.keys(sessionStorage).filter((key) => key.startsWith(p)).length,
        prefix,
      ),
    ).toBe(0);
    expect((await (await request.get("/lab-state")).json()).logouts).toBe(1);
    expect(secondErrors).toEqual([]);
  } finally {
    await second.close();
  }
});
