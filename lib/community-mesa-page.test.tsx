import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import type { MesaPilotSnapshot } from "./community-mesa";

const state = vi.hoisted(() => ({
  snapshot: {} as MesaPilotSnapshot,
  school: false,
}));
vi.stubGlobal("React", React);
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/components/comun-shell", () => ({
  ComunShell: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
  Section: ({ children }: { children: React.ReactNode }) => (
    <section>{children}</section>
  ),
}));
vi.mock("@/lib/community-auth", () => ({
  requireCommunitySession: async () => ({ user: { id: "synthetic-user" } }),
}));
vi.mock("@/lib/community-mesa", () => ({
  getMesaPilotSnapshot: async () => state.snapshot,
}));
vi.mock("@/lib/learning/core", async (original) => ({
  ...(await original<typeof import("./learning/core")>()),
  isLearningEnabled: () => state.school,
}));
import Page from "../app/comun/c/[slug]/mesa/page";

beforeEach(() => {
  state.school = false;
  state.snapshot = {
    kind: "ready",
    communityName: "Comunidade sintética",
    purpose: "Cuidar de um espaço comum",
    role: "facilitator",
    tasksState: "ready",
    tasks: [
      {
        id: "own",
        title: "Conferir uma fonte pública",
        description: "Comparar a informação publicada",
        dueAt: null,
        actionSlug: "acao-sintetica",
        actionTitle: "Ação sintética",
      },
    ],
    activitiesState: "ready",
    activities: [
      {
        slug: "encontro-sintetico",
        title: "Encontro sintético",
        startsAt: "2027-01-01T12:00:00Z",
        status: "open",
      },
      {
        slug: "resultado-sintetico",
        title: "Resultado sintético",
        startsAt: null,
        status: "completed",
      },
    ],
  };
});
const render = async () =>
  renderToStaticMarkup(
    await Page({ params: Promise.resolve({ slug: "comunidade-sintetica" }) }),
  );

it("conecta ação, encontro, memória, vínculo e formação gated sem simular aceite", async () => {
  const html = await render();
  for (const text of [
    "Cuidar de um espaço comum",
    "Encontro sintético",
    "Resultado e memória",
    "não comprova aceite",
    "não escolhe automaticamente outra pessoa",
    "Escola ainda não está liberada",
  ])
    expect(html).toContain(text);
  expect(html).toContain('href="/comun/acoes/acao-sintetica"');
  expect(html).toContain("/comun/c/comunidade-sintetica/participar");
  expect(html).not.toContain("<form");
  expect(html).not.toContain("/comun/escola/missao/");
  if (process.env.COMUN_M5_RENDER_OUT)
    writeFileSync(process.env.COMUN_M5_RENDER_OUT, html);
});

it("só mostra microlições quando o gate permite, sem progresso privado", async () => {
  state.school = true;
  const html = await render();
  expect(html).toContain("/comun/escola/missao/facilite-de-verdade");
  expect(html).toContain("/comun/escola/missao/reuniao-termina-em-acao");
  expect(html).not.toContain("completed");
});

it("indisponibilidade não vira lista vazia; acesso negado não renderiza contexto", async () => {
  state.snapshot = { kind: "unavailable" };
  expect(await render()).toContain("Mesa indisponível");
  expect(await render()).not.toContain("Comunidade sintética");
  state.snapshot = { kind: "forbidden" };
  await expect(render()).rejects.toThrow("NOT_FOUND");
});

it("gates fechados distinguem dados não liberados de ausência", async () => {
  if (state.snapshot.kind !== "ready") throw new Error("fixture");
  state.snapshot.tasks = [];
  state.snapshot.activities = [];
  state.snapshot.tasksState = "not_released";
  state.snapshot.activitiesState = "not_released";
  const html = await render();
  expect(html).toContain("ações coletivas ainda não estão liberadas");
  expect(html).toContain("atividades ainda não estão liberadas");
  expect(html).not.toContain("Nenhuma atividade pública em andamento");
});
