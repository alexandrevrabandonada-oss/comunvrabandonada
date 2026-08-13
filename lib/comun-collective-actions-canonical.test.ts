import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServiceSupabaseClient: () => null,
}));

import {
  projectPublicCollectiveActionDetail,
  projectPublicCollectiveActionSummary,
  sortPublicCollectiveActions,
} from "./comun-collective-actions-canonical";
import { isComunCollectiveActionsCanonicalExperienceEnabled } from "./comun-collective-actions-canonical-feature";

const action = {
  id: "action-1",
  slug: "mutirao-seguro",
  title: "Mutirão seguro",
  summary: "Organização pública para uma tarefa delimitada.",
  objective: "Realizar uma ação concreta e guardar seu resultado.",
  action_type: "mutual_aid",
  status: "open",
  visibility: "public",
  territory_label: "Volta Redonda",
  meeting_place: "Praça pública",
  starts_at: "2026-08-20T12:00:00Z",
  ends_at: "2026-08-20T16:00:00Z",
  participation_mode: "in_person",
  pauta: { slug: "pauta-segura", title: "Pauta segura" },
  community: { slug: "comunidade-segura", name: "Comunidade segura" },
};

describe("COMUN 48.3-C1 canonical collective action projection", () => {
  it("is fail closed behind the exact feature flag", () => {
    expect(isComunCollectiveActionsCanonicalExperienceEnabled({})).toBe(false);
    expect(
      isComunCollectiveActionsCanonicalExperienceEnabled({
        COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_ENABLED: "enabled",
      }),
    ).toBe(true);
    expect(
      isComunCollectiveActionsCanonicalExperienceEnabled({
        COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_ENABLED: "true",
      }),
    ).toBe(false);
  });

  it.each(["draft", "preparing", "cancelled", "archived"])(
    "hides %s actions",
    (status) => {
      expect(
        projectPublicCollectiveActionSummary({ ...action, status }),
      ).toBeNull();
    },
  );

  it.each(["open", "active", "awaiting_result", "completed"])(
    "shows %s actions",
    (status) => {
      expect(
        projectPublicCollectiveActionSummary({ ...action, status })?.status,
      ).toBe(status);
    },
  );

  it("orders by process state and then time without popularity", () => {
    const rows = [
      { ...action, id: "completed", slug: "completed", status: "completed" },
      { ...action, id: "active-late", slug: "active-late", status: "active" },
      {
        ...action,
        id: "active-early",
        slug: "active-early",
        status: "active",
        starts_at: "2026-08-19T12:00:00Z",
      },
      { ...action, id: "open", slug: "open" },
    ].flatMap((item) => projectPublicCollectiveActionSummary(item) ?? []);
    expect(sortPublicCollectiveActions(rows).map((item) => item.id)).toEqual([
      "open",
      "active-early",
      "active-late",
      "completed",
    ]);
  });

  it("allowlists detail, task, update, forwarding and reviewed memory fields", () => {
    const detail = projectPublicCollectiveActionDetail({
      ...action,
      created_by_admin_id: "PRIVATE_ADMIN_SENTINEL",
      member_user_id: "PRIVATE_MEMBER_SENTINEL",
      contribution_note_private: "PRIVATE_NOTE_SENTINEL",
      counts: {
        interested: 3,
        participating: 2,
        tasksAssumed: 1,
        updates: 1,
        results: 0,
        memberRows: ["PRIVATE_ROW_SENTINEL"],
      },
      tasks: [
        {
          id: "task-open",
          title: "Separar materiais",
          description: "Organizar materiais públicos.",
          desired_count: 2,
          assumed_count: 1,
          due_at: "2099-08-20T12:00:00Z",
          state: "open",
          effort_level: "small",
          participation_mode: "in_person",
          member_user_id: "PRIVATE_TASK_MEMBER_SENTINEL",
        },
        {
          id: "task-draft",
          title: "Privada",
          description: "PRIVATE_DRAFT_TASK_SENTINEL",
          desired_count: 1,
          assumed_count: 0,
          state: "draft",
          effort_level: "small",
          participation_mode: "remote",
        },
      ],
      updates: [
        {
          id: "update-public",
          update_type: "progress",
          title: "Trabalho iniciado",
          public_summary: "Etapa pública concluída.",
          occurred_at: "2026-08-20T13:00:00Z",
          visibility: "public",
          created_by_admin_id: "PRIVATE_UPDATE_ADMIN_SENTINEL",
        },
        {
          id: "update-internal-kind",
          update_type: "internal",
          title: "Interna",
          public_summary: "PRIVATE_INTERNAL_UPDATE_SENTINEL",
          occurred_at: "2026-08-20T14:00:00Z",
          visibility: "internal",
        },
      ],
      forwarding: {
        recipient_name: "Órgão público",
        public_summary: "Encaminhamento público revisado.",
        state: "sent",
        public_visible: true,
        private_note: "PRIVATE_FORWARDING_SENTINEL",
      },
      memoryAssets: [
        {
          id: "asset-public",
          title: "Memória pública",
          public_url: "https://example.org/memoria.pdf",
          asset_kind: "document",
          public_visible: true,
          reviewed_at: "2026-08-20T15:00:00Z",
          storage_path: "PRIVATE_STORAGE_SENTINEL",
        },
      ],
      result_summary: "Resultado público.",
      memory_summary: "Memória pública.",
      learned_summary: "Aprendizado público.",
      next_steps_summary: "Próximo passo público.",
    });
    expect(detail?.tasks).toHaveLength(1);
    expect(detail?.tasks[0].availability).toBe("available");
    expect(detail?.publicUpdates).toHaveLength(1);
    expect(detail?.aggregateCounts.participating).toBe(2);
    const serialized = JSON.stringify(detail);
    for (const forbidden of [
      "PRIVATE_ADMIN_SENTINEL",
      "PRIVATE_MEMBER_SENTINEL",
      "PRIVATE_NOTE_SENTINEL",
      "PRIVATE_ROW_SENTINEL",
      "PRIVATE_TASK_MEMBER_SENTINEL",
      "PRIVATE_DRAFT_TASK_SENTINEL",
      "PRIVATE_UPDATE_ADMIN_SENTINEL",
      "PRIVATE_INTERNAL_UPDATE_SENTINEL",
      "PRIVATE_FORWARDING_SENTINEL",
      "PRIVATE_STORAGE_SENTINEL",
      "member_user_id",
      "contribution_note_private",
      "created_by_admin_id",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("fails closed for non-public updates, forwarding, and unreviewed memory", () => {
    const detail = projectPublicCollectiveActionDetail({
      ...action,
      updates: [
        {
          id: "private-update",
          update_type: "progress",
          title: "Interna",
          public_summary: "PRIVATE_UPDATE_SENTINEL",
          occurred_at: "2026-08-20T13:00:00Z",
          visibility: "internal",
        },
      ],
      forwarding: {
        public_summary: "PRIVATE_FORWARDING_SENTINEL",
        state: "preparing",
        public_visible: false,
      },
      memoryAssets: [
        {
          id: "unreviewed",
          title: "Não revisado",
          public_url: "https://example.org/unreviewed.pdf",
          asset_kind: "document",
          public_visible: true,
          reviewed_at: null,
        },
      ],
    });
    expect(detail?.publicUpdates).toEqual([]);
    expect(detail?.publicForwarding).toBeNull();
    expect(detail?.publicMemory.assets).toEqual([]);
    expect(JSON.stringify(detail)).not.toContain("PRIVATE_");
  });

  it("marks full, expired and completed tasks unavailable", () => {
    const detail = projectPublicCollectiveActionDetail({
      ...action,
      tasks: [
        {
          id: "full",
          title: "Lotada",
          description: "Sem vagas.",
          desired_count: 1,
          assumed_count: 1,
          state: "open",
          effort_level: "small",
          participation_mode: "remote",
        },
        {
          id: "expired",
          title: "Vencida",
          description: "Prazo encerrado.",
          desired_count: 2,
          assumed_count: 0,
          due_at: "2020-01-01T00:00:00Z",
          state: "open",
          effort_level: "small",
          participation_mode: "remote",
        },
        {
          id: "done",
          title: "Concluída",
          description: "Trabalho feito.",
          desired_count: 1,
          assumed_count: 1,
          state: "done",
          effort_level: "small",
          participation_mode: "remote",
        },
      ],
    });
    expect(detail?.tasks.map((task) => task.availability)).toEqual([
      "full",
      "expired",
      "closed",
    ]);
  });
});
