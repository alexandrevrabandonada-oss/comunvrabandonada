import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const target = "/comun/minha-participacao?secao=tarefas&experiencia=app-v2";
const projects = new Set(["390x844", "1366x768"]);

type Account = {
  project: string;
  email: string;
  password: string;
  userId: string;
};

async function checked<T>(
  request: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string,
): Promise<T> {
  const { data, error } = await request;
  if (error || !data) throw new Error(`P2_LOCAL_${label}_FAILED: ${error?.message ?? "empty"}`);
  return data;
}

test("@p2-authenticated Minha participação: provenance, next action, release and account isolation", async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  test.skip(!projects.has(testInfo.project.name), "A focused two-viewport local gate");

  // Neither a remote Supabase URL nor a real user's data is acceptable.
  if (
    process.env.ALLOW_LOCAL_TESTS !== "true" ||
    !/^https?:\/\/(?:localhost|127\.0\.0\.1):\d+/.test(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    ) ||
    process.env.COMUN_COLLECTIVE_ACTIONS_V1 !== "enabled" ||
    !/^postgres(?:ql)?:\/\/[^@]+@(?:localhost|127\.0\.0\.1):\d+\/postgres(?:[/?]|$)/.test(
      process.env.COMUN_COLLECTIVE_ACTIONS_DATABASE_URL ?? "",
    )
  )
    throw new Error("COMUN_P2_DISPOSABLE_LOCAL_ONLY_REQUIRED");

  const accounts: Account[] = JSON.parse(
    await readFile(".local/comun-community/auth.json", "utf8"),
  );
  const owner = accounts.find((a) => a.project === testInfo.project.name);
  const outsider = accounts.find((a) => a.project !== testInfo.project.name);
  if (!owner || !outsider) throw new Error("COMUN_P2_LOCAL_PERSONAS_MISSING");
  // The workflow exports a service key from the disposable loopback
  // instance. No external service credentials are ever accepted here.
  const localUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const localServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!localServiceKey) throw new Error("COMUN_P2_LOCAL_SERVICE_KEY_REQUIRED");
  const db = createClient(localUrl, localServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suffix = randomUUID().slice(0, 12);
  const pautaSlug = `p2-pauta-${suffix}`;
  const actionSlug = `p2-acao-${suffix}`;
  const pautaTitle = `Pauta pública sintética ${suffix}`;
  const followedTitle = `Atividade pública não assumida ${suffix}`;
  const assignedTitle = `Compromisso aceito ${suffix}`;
  let pautaId: string | null = null;
  let actionId: string | null = null;

  try {
    const pauta = await checked(
      db.from("comun_pauta_spaces")
        .insert({
          slug: pautaSlug, title: pautaTitle,
          summary: "Pauta descartável para prova local sem pessoas reais.",
          visibility: "public", status: "observing",
        })
        .select("id").single(),
      "PAUTA",
    ) as { id: string };
    pautaId = pauta.id;

    await checked(
      db.from("comun_pauta_memberships")
        .insert({ pauta_id: pauta.id, member_user_id: owner.userId,
          role: "participant", status: "active" }).select("id").single(),
      "MEMBERSHIP",
    );
    await checked(
      db.from("comun_pauta_tasks").insert({
        pauta_id: pauta.id, title: followedTitle,
        status: "open", visibility: "public", owner_alias: "Outra pessoa sintética",
        result_public: "Registro público ainda em preparação.",
      }).select("id").single(),
      "PUBLIC_TASK",
    );

    const action = await checked(
      db.from("comun_collective_actions").insert({
        slug: actionSlug,
        title: `Ação coletiva sintética ${suffix}`,
        summary: "Ação pública sintética para testar uma responsabilidade aceita.",
        objective: "Comprovar a diferença entre acompanhar e assumir tarefa.",
        action_type: "community_inspection",
        visibility: "public", status: "open",
      }).select("id").single(),
      "ACTION",
    ) as { id: string };
    actionId = action.id;

    await checked(
      db.from("comun_collective_action_participations").insert({
        action_id: action.id, member_user_id: owner.userId,
        status: "participating",
      }).select("id").single(),
      "PARTICIPATION",
    );
    const task = await checked(
      db.from("comun_collective_action_tasks").insert({
        action_id: action.id, title: assignedTitle,
        description: "Responsabilidade explicitamente assumida nesta prova local.",
        state: "open", desired_count: 1,
      }).select("id").single(),
      "ACTION_TASK",
    ) as { id: string };
    await checked(
      db.from("comun_collective_action_task_assignments").insert({
        task_id: task.id, member_user_id: owner.userId, status: "active",
      }).select("id").single(),
      "ASSIGNMENT",
    );

    await page.goto(target);
    await expect(page).toHaveURL(/\/comun\/entrar\?/);
    await expect(page.getByText(assignedTitle)).toHaveCount(0);
    await page.getByLabel("E-mail", { exact: true }).fill(owner.email);
    await page.getByLabel("Senha", { exact: true }).fill(owner.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/comun\/minha-participacao\?.*secao=tarefas/);
    await expect(
      page.getByRole("heading", { name: "Compromissos que assumi" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tarefas nas pautas que acompanho" }),
    ).toBeVisible();

    const assigned = page.locator('[data-comun-my-area-task-kind="assigned-action"]');
    const followed = page.locator('[data-comun-my-area-task-kind="followed-public-pauta"]');
    await expect(assigned).toHaveCount(1);
    await expect(followed).toHaveCount(1);
    await expect(assigned).toContainText(assignedTitle);
    await expect(assigned).not.toContainText(followedTitle);
    await expect(followed).toContainText(followedTitle);
    await expect(followed).not.toContainText(assignedTitle);
    await expect(followed).toContainText(pautaTitle);
    await expect(assigned.getByRole("link", { name: "Ver contexto da ação" }))
      .toHaveAttribute("href", new RegExp(`^/comun/acoes/${actionSlug}\\?`));
    await expect(followed.getByRole("link", { name: "Ver contexto da pauta" }))
      .toHaveAttribute("href", new RegExp(`^/comun/pautas/${pautaSlug}\\?`));

    // A second actual Auth identity cannot inherit the first person's records.
    const otherContext = await browser.newContext({ baseURL });
    try {
      const otherPage = await otherContext.newPage();
      await otherPage.goto(target);
      await expect(otherPage).toHaveURL(/\/comun\/entrar\?/);
      await otherPage.getByLabel("E-mail", { exact: true }).fill(outsider.email);
      await otherPage.getByLabel("Senha", { exact: true }).fill(outsider.password);
      await otherPage.getByRole("button", { name: "Entrar", exact: true }).click();
      await expect(otherPage).toHaveURL(/\/comun\/minha-participacao\?/);
      await expect(otherPage.getByText(followedTitle)).toHaveCount(0);
      await expect(otherPage.getByText(assignedTitle)).toHaveCount(0);
    } finally {
      await otherContext.close();
    }

    // The V2 action page preserves context; release belongs to the actual
    // member assignment card and must not depend on a legacy action layout.
    await assigned.getByRole("link", { name: "Ver contexto da ação" }).click();
    await expect(page).toHaveURL(new RegExp(`/comun/acoes/${actionSlug}`));
    await expect(page.getByText(assignedTitle)).toBeVisible();
    await page.goto(target);
    await expect(
      page.locator('[data-comun-my-area-task-kind="assigned-action"]'),
    ).toHaveCount(1);
    await page
      .locator('[data-comun-my-area-task-kind="assigned-action"]')
      .getByRole("button", { name: "Liberar compromisso", exact: true })
      .click();
    await expect(
      page.locator('[data-comun-my-area-task-kind="assigned-action"]'),
    ).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-comun-my-area-task-kind="assigned-action"]'))
      .toHaveCount(0);
    await expect(page.getByText("Você ainda não assumiu uma tarefa em ação coletiva."))
      .toBeVisible();
    await expect(page.locator('[data-comun-my-area-task-kind="followed-public-pauta"]'))
      .toContainText(followedTitle);
    const released = await checked(
      db.from("comun_collective_action_task_assignments")
        .select("status").eq("task_id", task.id)
        .eq("member_user_id", owner.userId).single(),
      "RELEASE_READBACK",
    ) as { status: string };
    expect(released.status).toBe("released");



    await page.goto("/comun/conta");
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await page.goto(target);
    await expect(page).toHaveURL(/\/comun\/entrar\?/);
    await expect(page.getByText(followedTitle)).toHaveCount(0);
    await expect(page.getByText(assignedTitle)).toHaveCount(0);
  } finally {
    if (actionId) {
      const result = await db.from("comun_collective_actions").delete().eq("id", actionId);
      if (result.error) throw new Error(`COMUN_P2_ACTION_CLEANUP_FAILED: ${result.error.message}`);
    }
    if (pautaId) {
      const result = await db.from("comun_pauta_spaces").delete().eq("id", pautaId);
      if (result.error) throw new Error(`COMUN_P2_PAUTA_CLEANUP_FAILED: ${result.error.message}`);
    }
  }
});
