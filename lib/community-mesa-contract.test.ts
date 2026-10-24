import { describe, expect, it } from "vitest";
import {
  canReadMesaPilot,
  ownPublicMesaTasks,
} from "./community-mesa-contract";

const base = {
  id: "assignment-1",
  member_user_id: "user-1",
  status: "active",
  task: {
    title: "Ler documentos",
    description: "Conferir uma fonte pública.",
    due_at: null,
    state: "open",
    action: {
      community_id: "comunidade-1",
      slug: "acao-de-estudo",
      title: "Ação de estudo",
      visibility: "public",
      published_at: "2026-10-01T00:00:00Z",
      status: "active",
    },
  },
};

describe("Mesa do Núcleo M3 — read-only, fail closed", () => {
  it("não admite visitante, seguidor, pausa, saída ou suspensão", () => {
    for (const membershipState of [
      null,
      "following",
      "paused",
      "left",
      "suspended",
    ]) {
      expect(
        canReadMesaPilot({ membershipState, roles: ["coordinator"] }),
      ).toBe(false);
    }
  });

  it("membro sem papel autorizado não recebe Mesa", () => {
    expect(canReadMesaPilot({ membershipState: "member", roles: [] })).toBe(
      false,
    );
    expect(
      canReadMesaPilot({ membershipState: "member", roles: ["curator"] }),
    ).toBe(false);
    expect(
      canReadMesaPilot({
        membershipState: "member",
        roles: ["field_observer"],
      }),
    ).toBe(false);
  });

  it("só habilita os papéis de coordenação e facilitação já existentes", () => {
    expect(
      canReadMesaPilot({ membershipState: "member", roles: ["coordinator"] }),
    ).toBe(true);
    expect(
      canReadMesaPilot({ membershipState: "member", roles: ["facilitator"] }),
    ).toBe(true);
  });

  it("mostra apenas as próprias atribuições da comunidade certa", () => {
    const rows = [
      base,
      { ...base, id: "assignment-2", member_user_id: "user-2" },
      {
        ...base,
        id: "assignment-3",
        task: {
          ...base.task,
          action: { ...base.task.action, community_id: "outra-comunidade" },
        },
      },
    ];
    expect(ownPublicMesaTasks(rows, "user-1", "comunidade-1")).toEqual([
      {
        id: "assignment-1",
        title: "Ler documentos",
        description: "Conferir uma fonte pública.",
        dueAt: null,
        actionTitle: "Ação de estudo",
        actionSlug: "acao-de-estudo",
      },
    ]);
  });

  it("não expõe tarefas liberadas, privadas, canceladas ou concluídas", () => {
    const rows = [
      { ...base, status: "released" },
      { ...base, task: { ...base.task, state: "done" } },
      {
        ...base,
        task: {
          ...base.task,
          action: { ...base.task.action, visibility: "internal" },
        },
      },
      {
        ...base,
        task: {
          ...base.task,
          action: { ...base.task.action, status: "cancelled" },
        },
      },
    ];
    expect(ownPublicMesaTasks(rows, "user-1", "comunidade-1")).toEqual([]);
  });
});

it("M5 mantém publicação e destino canônico das responsabilidades", () => {
  expect(
    ownPublicMesaTasks(
      [
        {
          ...base,
          task: {
            ...base.task,
            action: { ...base.task.action, published_at: null },
          },
        },
      ],
      "user-1",
      "comunidade-1",
    ),
  ).toEqual([]);
  expect(
    ownPublicMesaTasks(
      [
        {
          ...base,
          task: {
            ...base.task,
            action: { ...base.task.action, slug: "../../privado" },
          },
        },
      ],
      "user-1",
      "comunidade-1",
    ),
  ).toEqual([]);
});
