import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
const password = "comun-primeira-participacao-34-2",
  adminEmail = "s37-admin@comun.test";
const db = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
async function noCritical(page: any) {
  const audit = await new AxeBuilder({ page }).analyze();
  expect(
    audit.violations.filter((x: any) =>
      ["serious", "critical"].includes(x.impact ?? ""),
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
async function login(page: any, email: string, path: string, admin = false) {
  await page.context().clearCookies();
  await page.goto(
    admin
      ? `/comun/admin/login?redirectTo=${encodeURIComponent(path)}`
      : `/comun/entrar?returnTo=${encodeURIComponent(path)}`,
  );
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(
    new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
  );
}
test("jornada autenticada canônica percorre fotografia até memória", async ({
  page,
}, testInfo) => {
  const runId = `s37-${testInfo.project.name}-${Date.now().toString(36)}`,
    email = `${runId}@comun.test`,
    location = `Centro, trecho sintético ${runId}`,
    resultTitle = `Resultado parcial ${runId}`,
    memoryTitle = `Memória do ciclo ${runId}`;
  await page.goto("/comun/calcadas");
  await expect(
    page.getByRole("heading", { name: "Mapa das Calçadas" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Enviar foto e marcar local" }).click();
  await expect(page).toHaveURL(/\/comun\/entrar\?returnTo=/);
  await page.getByRole("link", { name: /Criar conta/i }).click();
  await page.getByLabel("Nome de exibição").fill(`Pessoa ${runId}`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByLabel("Confirmar senha").fill(password);
  await page.getByLabel(/Aceito os termos/).check();
  await page.getByLabel(/política de privacidade/).check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/comun\/onboarding\?returnTo=/);
  await page
    .getByRole("button", { name: /Salvar território e continuar/ })
    .click();
  await expect(page).toHaveURL(/\/comun\/mapa\/contribuir\?origem=calcadas/);
  await page.setInputFiles(
    'input[name="photo"]',
    ".local/comun-integral/calcada-fixture.jpg",
  );
  await page.getByRole("button", { name: "Continuar" }).click();
  await page
    .getByRole("button", { name: "Mapa local para marcar o ponto" })
    .click({ position: { x: 180, y: 120 } });
  await page.getByLabel("Bairro ou referência pública").fill(location);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByText("Ruim", { exact: true }).click();
  await page.getByLabel("Problema principal").selectOption("irregular");
  await page
    .getByLabel("Descrição opcional")
    .fill(`Trecho sintético ${runId} com piso irregular.`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await noCritical(page);
  await page.screenshot({
    path: `reports/screenshots/sprint-37-integral-revisao-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Enviar contribuição/ }).click();
  await expect(
    page.getByRole("heading", { name: /Recebemos seu registro/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver em Minha área" }).click();
  await expect(page.getByText(/em revisão/i).first()).toBeVisible();
  const service = db(),
    { data: users } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    }),
    user = users?.users.find((x) => x.email === email);
  expect(user).toBeTruthy();
  const { data: record } = await service
    .from("comun_sidewalk_records")
    .select(
      "id,slug,private_geometry_geojson,public_geometry_geojson,visibility,status",
    )
    .eq("member_user_id", user!.id)
    .single();
  if (!record) throw new Error("Registro participante ausente");
  expect(record.private_geometry_geojson).toBeTruthy();
  expect(record.public_geometry_geojson).toBeNull();
  expect(record.visibility).toBe("internal");
  await login(page, adminEmail, "/comun/admin/calcadas", true);
  const card = page.locator("article").filter({ hasText: location });
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: "Aprovar com local aproximado" })
    .click();
  await expect(card).toHaveCount(0);
  const { data: published } = await service
    .from("comun_sidewalk_records")
    .select(
      "slug,private_geometry_geojson,public_geometry_geojson,visibility,status",
    )
    .eq("id", record.id)
    .single();
  if (!published) throw new Error("Registro publicado ausente");
  expect(published.visibility).toBe("public");
  expect(published.public_geometry_geojson).toBeTruthy();
  expect(published.private_geometry_geojson).toBeTruthy();
  await page.goto("/comun/calcadas");
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await expect(page.getByText(location)).toBeVisible();
  await page.goto(`/comun/calcadas/registros/${published.slug}`);
  await expect(page.getByText(location)).toBeVisible();
  await login(page, email, `/comun/calcadas/registros/${published.slug}`);
  await page
    .getByLabel("Complemento privado opcional")
    .fill(`Observação ${runId}`);
  const sameObservation = page.getByRole("radio", { name: "Continua igual" });
  await sameObservation.check();
  await expect(sameObservation).toBeChecked();
  await page.getByRole("button", { name: "Enviar para revisão" }).click();
  let observation: { id: string; status: string } | null = null;
  await expect
    .poll(
      async () => {
        const { data } = await service
          .from("comun_sidewalk_observations")
          .select("id,status")
          .eq("record_id", record.id)
          .eq("status", "pending")
          .maybeSingle();
        observation = data;
        return data?.status ?? null;
      },
      { message: "observação persistida como pendente" },
    )
    .toBe("pending");
  if (!observation) throw new Error("Observação pendente ausente");
  await page.reload();
  await expect(page.getByText("Nova observação comunitária")).toHaveCount(0);
  await login(page, adminEmail, "/comun/admin/calcadas", true);
  const observationCard = page
    .locator("article")
    .filter({ hasText: `Observação ${runId}` });
  await observationCard
    .getByRole("button", { name: "Aprovar", exact: true })
    .click();
  await expect
    .poll(
      async () => {
        const { data } = await service
          .from("comun_sidewalk_observations")
          .select("status")
          .eq("id", observation!.id)
          .single();
        return data?.status ?? null;
      },
      { message: "observação moderada como aprovada" },
    )
    .toBe("approved");
  await page.goto(`/comun/calcadas/registros/${published.slug}`);
  await expect(page.getByText("Nova observação comunitária")).toBeVisible();
  await login(page, adminEmail, "/comun/admin/calcadas/prioridade", true);
  await page.locator(`input[name="record_ids"][value="${record.id}"]`).check();
  await page
    .getByRole("button", { name: "Abrir roda e publicar prioridade" })
    .click();
  await expect
    .poll(
      async () => {
        const { data } = await service
          .from("comun_sidewalk_priorities")
          .select("id")
          .eq("record_id", record.id)
          .eq("status", "approved")
          .maybeSingle();
        return data?.id ?? null;
      },
      { message: "prioridade publicada" },
    )
    .not.toBeNull();
  const { data: priority } = await service
    .from("comun_sidewalk_priorities")
    .select("id")
    .eq("record_id", record.id)
    .eq("status", "approved")
    .single();
  if (!priority) throw new Error("Prioridade ausente");
  await page.goto(`/comun/calcadas/pressao/${priority.id}`);
  await expect(
    page.getByRole("heading", { name: /Rota acessível/ }),
  ).toBeVisible();
  await noCritical(page);
  const json = await page.request.get(
      `/comun/calcadas/pressao/${priority.id}/export?formato=json`,
    ),
    markdown = await page.request.get(
      `/comun/calcadas/pressao/${priority.id}/export?formato=md`,
    );
  expect(json.ok()).toBe(true);
  const jsonBody = await json.text();
  expect(JSON.parse(jsonBody).schemaVersion).toBe("1.0");
  expect(markdown.ok()).toBe(true);
  for (const body of [jsonBody, await markdown.text()])
    expect(body).not.toMatch(
      /private_geometry|object_key|member_user_id|service_role|originals\//i,
    );
  await page.screenshot({
    path: `reports/screenshots/sprint-37-integral-pacote-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/comun/admin/calcadas/prioridade");
  const priorityCard = page
    .locator("article")
    .filter({ hasText: "Rota acessível entre o ponto de ônibus" })
    .first();
  await priorityCard
    .getByRole("button", { name: "Preparar encaminhamento" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Preparar encaminhamento" }),
  ).toBeVisible();
  await noCritical(page);
  const { data: flow } = await service
    .from("comun_sidewalk_forwardings")
    .select("id")
    .eq("priority_id", priority.id)
    .single();
  if (!flow) throw new Error("Encaminhamento ausente");
  const waitState = async (state: string) => {
    await expect
      .poll(
        async () => {
          const { data } = await service
            .from("comun_sidewalk_forwardings")
            .select("state")
            .eq("id", flow.id)
            .single();
          return data?.state;
        },
        { message: `encaminhamento em ${state}` },
      )
      .toBe(state);
    await page.reload();
  };
  await page
    .getByRole("button", {
      name: "Este encaminhamento está pronto para revisão",
    })
    .click();
  await waitState("ready_for_review");
  await expect(
    page.getByRole("heading", { name: "Revisar encaminhamento" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aprovar encaminhamento" }).click();
  await waitState("protocol_pending");
  await expect(
    page.getByRole("heading", { name: "Registrar protocolo" }),
  ).toBeVisible();
  await page.getByLabel("Instituição").fill("Ouvidoria municipal fixture");
  await page.getByLabel("Número fixture").fill(`FIX-${runId}`);
  await page.getByLabel("Data do registro").fill("2026-07-20T12:00");
  await page.getByLabel("Próximo prazo").fill("2026-08-20T12:00");
  await page
    .getByLabel("Resumo público")
    .fill("Protocolo fixture registrado sem envio externo.");
  await page
    .getByRole("button", { name: "Registrar protocolo fixture" })
    .click();
  await waitState("protocol_registered");
  await expect(
    page.getByRole("heading", { name: "Registrar resposta" }),
  ).toBeVisible();
  await page.getByLabel("Data da resposta").fill("2026-07-21T12:00");
  await page
    .getByLabel("Documento/resposta fixture privada")
    .fill(`DOCUMENTO FIXTURE PRIVADO ${runId}`);
  await page
    .getByLabel("Resumo público da resposta")
    .fill(
      "O órgão fixture reconheceu parte da demanda e informou análise futura.",
    );
  await page.getByLabel("Avaliação editorial").selectOption("partial");
  await page
    .getByRole("button", { name: "Registrar resposta fixture" })
    .click();
  await waitState("response_received");
  await expect(
    page.getByRole("heading", { name: "Registrar resultado" }),
  ).toBeVisible();
  await page.getByLabel("Título").fill(resultTitle);
  await page.getByLabel("Estado").selectOption("partial_change");
  await page
    .getByLabel("Justificativa pública")
    .fill(
      "Mudança parcial registrada; o problema não foi comprovadamente resolvido.",
    );
  await page
    .getByLabel("Evidência")
    .fill(
      "Resposta fixture vinculada ao protocolo e revisão editorial humana.",
    );
  await page
    .getByLabel("Limitações e continuidade")
    .fill("Aguardar nova observação comunitária e comprovação territorial.");
  await page
    .getByRole("button", { name: "Registrar resultado verificado" })
    .click();
  await waitState("result_recorded");
  await expect(
    page.getByRole("heading", { name: "Preservar memória do ciclo" }),
  ).toBeVisible();
  await page.getByLabel("Título").fill(memoryTitle);
  await page
    .getByRole("button", { name: "Criar memória para revisão" })
    .click();
  await waitState("memory_draft");
  await expect(
    page.getByRole("heading", { name: "Revisar e publicar memória" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Publicar memória revisada" }).click();
  await waitState("closed");
  await expect(
    page.getByRole("heading", { name: "Ciclo preservado" }),
  ).toBeVisible();
  const { data: closed } = await service
    .from("comun_sidewalk_forwardings")
    .select("id,state,protocol_id,result_id,memory_id,report_id")
    .eq("priority_id", priority.id)
    .single();
  expect(closed?.state).toBe("closed");
  expect(closed?.protocol_id).toBeTruthy();
  expect(closed?.result_id).toBeTruthy();
  expect(closed?.memory_id).toBeTruthy();
  const finalJson = await page.request.get(
      `/comun/calcadas/pressao/${priority.id}/export?formato=json`,
    ),
    finalBody = await finalJson.text();
  expect(finalJson.ok()).toBe(true);
  expect(JSON.parse(finalBody).process.state).toBe("closed");
  expect(finalBody).not.toContain(`DOCUMENTO FIXTURE PRIVADO ${runId}`);
  expect(finalBody).not.toMatch(
    /private_geometry|object_key|member_user_id|service_role|originals\//i,
  );
  await page.goto("/comun/calcadas#resultados");
  await expect(page.getByText(resultTitle)).toBeVisible();
  await expect(page.getByText(memoryTitle)).toBeVisible();
  await noCritical(page);
  await login(page, email, "/comun/minha-participacao");
  await expect(
    page.getByText(
      /Seu registro integra esta prioridade e este encaminhamento/,
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Memória do ciclo publicada", { exact: true }),
  ).toBeVisible();
});
test("retorno hostil é rejeitado", async ({ page }) => {
  await page.goto("/comun/criar-conta?returnTo=https%3A%2F%2Fevil.example");
  await expect(page.locator('input[name="returnTo"]')).toHaveValue(
    "/comun/minha-participacao",
  );
});
