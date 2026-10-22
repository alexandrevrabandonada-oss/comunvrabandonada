import { beforeEach, describe, expect, it, vi } from "vitest";

type Reply = { data: unknown; error: unknown };

const fake = vi.hoisted(() => ({
  dbAvailable: true,
  releaseEnabled: false,
  calls: [] as Array<{ table: string; operation: string; args: unknown[] }>,
  replies: {} as Record<string, { data: unknown; error: unknown }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/collective-actions-release", () => ({
  getCollectiveActionsRelease: async () => ({ enabled: fake.releaseEnabled }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => {
    if (!fake.dbAvailable) return null;
    return {
      from: (table: string) => {
        const record = (operation: string, ...args: unknown[]) => {
          fake.calls.push({ table, operation, args });
          return query;
        };
        const result = (): Reply =>
          fake.replies[table] ?? { data: null, error: null };
        const query = {
          select: (...args: unknown[]) => record("select", ...args),
          eq: (...args: unknown[]) => record("eq", ...args),
          is: (...args: unknown[]) => record("is", ...args),
          lte: (...args: unknown[]) => record("lte", ...args),
          in: (...args: unknown[]) => record("in", ...args),
          order: (...args: unknown[]) => record("order", ...args),
          limit: (...args: unknown[]) => record("limit", ...args),
          maybeSingle: async () => result(),
          then: (
            resolve: (value: Reply) => unknown,
            reject?: (error: unknown) => unknown,
          ) => Promise.resolve(result()).then(resolve, reject),
        };
        return query;
      },
    };
  },
}));

import { getMesaPilotSnapshot } from "./community-mesa";

const community = "comun_communities";
const memberships = "comun_community_memberships";
const roles = "comun_community_role_assignments";
const assignments = "comun_collective_action_task_assignments";

beforeEach(() => {
  fake.dbAvailable = true;
  fake.releaseEnabled = false;
  fake.calls.length = 0;
  fake.replies = {
    [community]: { data: { id: "community-a", name: "Comunidade A" }, error: null },
    [memberships]: { data: { id: "membership-a", state: "member" }, error: null },
    [roles]: { data: [{ role: "facilitator" }], error: null },
    [assignments]: { data: [], error: null },
  };
});

describe("SOC-D10.M4 — fronteira server-side da Mesa", () => {
  it("falha fechado se o banco estiver indisponível", async () => {
    fake.dbAvailable = false;
    expect(await getMesaPilotSnapshot("comunidade-a", "user-a")).toEqual({
      kind: "unavailable",
    });
    expect(fake.calls).toHaveLength(0);
  });

  it("não consulta papel ou tarefas para visitante ou vínculo pausado", async () => {
    fake.replies[memberships] = {
      data: { id: "membership-a", state: "paused" },
      error: null,
    };
    expect(await getMesaPilotSnapshot("comunidade-a", "user-a")).toEqual({
      kind: "forbidden",
    });
    expect(fake.calls.some((call) => call.table === roles)).toBe(false);
    expect(fake.calls.some((call) => call.table === assignments)).toBe(false);
  });

  it("nega acesso sem papel vigente, com escopo e comunidade filtrados", async () => {
    fake.replies[roles] = { data: [], error: null };
    expect(await getMesaPilotSnapshot("comunidade-a", "user-a")).toEqual({
      kind: "forbidden",
    });
    expect(fake.calls).toContainEqual({
      table: memberships,
      operation: "eq",
      args: ["member_user_id", "user-a"],
    });
    expect(fake.calls).toContainEqual({
      table: memberships,
      operation: "eq",
      args: ["community_id", "community-a"],
    });
    expect(fake.calls).toContainEqual({
      table: roles,
      operation: "eq",
      args: ["membership_id", "membership-a"],
    });
    expect(fake.calls).toContainEqual({
      table: roles,
      operation: "eq",
      args: ["scope", "community"],
    });
    expect(fake.calls).toContainEqual({
      table: roles,
      operation: "is",
      args: ["revoked_at", null],
    });
    expect(fake.calls.some((call) =>
      call.table === roles &&
      call.operation === "lte" &&
      call.args[0] === "starts_at",
    )).toBe(true);
    expect(fake.calls.some((call) => call.table === assignments)).toBe(false);
  });

  it("não trata gate fechado como tarefas inexistentes", async () => {
    const result = await getMesaPilotSnapshot("comunidade-a", "user-a");
    expect(result).toMatchObject({
      kind: "ready",
      role: "facilitator",
      tasksState: "not_released",
      tasks: [],
    });
    expect(fake.calls.some((call) => call.table === assignments)).toBe(false);
  });

  it("consulta por identidade real, recorta só tarefas públicas próprias e oculta campos privados", async () => {
    fake.releaseEnabled = true;
    fake.replies[assignments] = {
      error: null,
      data: [
        {
          id: "own-a",
          member_user_id: "user-a",
          status: "active",
          contact_private: "nao-expor",
          task: {
            title: "Estudar documento",
            description: "Verificar uma fonte",
            due_at: null,
            state: "open",
            action: {
              community_id: "community-a",
              slug: "estudar-documento",
              title: "Estudo público",
              visibility: "public",
              status: "active",
              private_notes: "segredo",
            },
          },
        },
        {
          id: "other-community",
          member_user_id: "user-a",
          status: "active",
          task: {
            title: "Outra comunidade",
            description: "Sem permissão neste contexto",
            due_at: null,
            state: "open",
            action: {
              community_id: "community-b",
              slug: "outra",
              title: "Outra",
              visibility: "public",
              status: "active",
            },
          },
        },
      ],
    };
    const result = await getMesaPilotSnapshot("comunidade-a", "user-a");
    expect(result).toMatchObject({
      kind: "ready",
      tasksState: "ready",
      tasks: [
        {
          id: "own-a",
          title: "Estudar documento",
          actionSlug: "estudar-documento",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("nao-expor");
    expect(JSON.stringify(result)).not.toContain("segredo");
    expect(JSON.stringify(result)).not.toContain("Outra comunidade");
    expect(fake.calls).toContainEqual({
      table: assignments,
      operation: "eq",
      args: ["member_user_id", "user-a"],
    });
  });

  it("erro na leitura das tarefas não é apresentado como ausência de compromissos", async () => {
    fake.releaseEnabled = true;
    fake.replies[assignments] = {
      data: null,
      error: { message: "database-error" },
    };
    expect(await getMesaPilotSnapshot("comunidade-a", "user-a")).toMatchObject({
      kind: "ready",
      tasksState: "unavailable",
      tasks: [],
    });
  });
});
