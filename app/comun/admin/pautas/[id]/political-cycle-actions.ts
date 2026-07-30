"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireComunAdmin } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { requireCollectiveActionsRelease } from "@/lib/collective-actions-release";
import {
  nextPautaActionCycleStep,
  pautaActionCycleStages,
  type PautaActionCycleStage,
} from "@/lib/pauta-action-cycle";
import { sanitizeCollectivePublicText } from "@/lib/collective-actions-admin";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optional(form: FormData, key: string) {
  return value(form, key) || null;
}

function db() {
  return createServiceSupabaseClient() as any;
}

async function requirePoliticalEditor() {
  await requireCollectiveActionsRelease();
  return requireComunAdmin({ roles: ["admin", "editor"] });
}

function invalidatePauta(pautaId: string, slug?: string | null) {
  revalidatePath(`/comun/admin/pautas/${pautaId}`);
  if (slug) revalidatePath(`/comun/pautas/${slug}`);
}

async function pautaSlug(client: any, pautaId: string) {
  const { data } = await client
    .from("comun_pauta_spaces")
    .select("slug")
    .eq("id", pautaId)
    .maybeSingle();
  return data?.slug ?? null;
}

async function requireOwnedCycle(
  client: any,
  cycleId: string,
  pautaId: string,
) {
  const { data } = await client
    .from("comun_pauta_action_cycles")
    .select("id")
    .eq("id", cycleId)
    .eq("pauta_id", pautaId)
    .maybeSingle();
  if (!data) throw new Error("A esteira não pertence a esta pauta.");
}

const inboxByStage: Partial<
  Record<
    PautaActionCycleStage,
    { type: string; title: string; preference: string }
  >
> = {
  moderation: {
    type: "contribution_update",
    title: "Contribuição revisada",
    preference: "pautas",
  },
  conversation: {
    type: "community_circle_opened",
    title: "Conversa organizada",
    preference: "circles",
  },
  synthesis: {
    type: "synthesis_published",
    title: "Síntese publicada",
    preference: "pautas",
  },
  decision: {
    type: "community_pauta_stage_changed",
    title: "Decisão registrada",
    preference: "pautas",
  },
  action: {
    type: "community_pauta_stage_changed",
    title: "Ação coletiva criada",
    preference: "activities",
  },
  protocol: {
    type: "community_pauta_stage_changed",
    title: "Protocolo registrado",
    preference: "pautas",
  },
  response: {
    type: "official_response",
    title: "Resposta recebida",
    preference: "pautas",
  },
  result: {
    type: "community_result_published",
    title: "Resultado em verificação",
    preference: "results",
  },
  memory: {
    type: "community_pauta_stage_changed",
    title: "Memória do processo publicada",
    preference: "memory",
  },
  reopened: {
    type: "community_pauta_stage_changed",
    title: "Processo reaberto",
    preference: "pautas",
  },
};

async function notifyPautaMembers(
  client: any,
  input: {
    pautaId: string;
    cycleId: string;
    target: PautaActionCycleStage;
    version: number;
    summary: string;
  },
) {
  const notification = inboxByStage[input.target];
  if (!notification) return;
  const { data: pauta } = await client
    .from("comun_pauta_spaces")
    .select("slug,community")
    .eq("id", input.pautaId)
    .maybeSingle();
  if (!pauta?.community) return;
  const { data: community } = await client
    .from("comun_communities")
    .select("id")
    .eq("slug", pauta.community)
    .maybeSingle();
  if (!community) return;
  const { data: memberships } = await client
    .from("comun_community_memberships")
    .select("member_user_id,update_preferences")
    .eq("community_id", community.id)
    .in("state", ["following", "member"]);
  const recipients = (memberships ?? []).filter((membership: any) =>
    (membership.update_preferences ?? []).includes(notification.preference),
  );
  for (const membership of recipients) {
    const { error } = await client.from("comun_member_inbox").upsert(
      {
        member_user_id: membership.member_user_id,
        pauta_id: input.pautaId,
        notification_type: notification.type,
        title: notification.title,
        summary: input.summary.slice(0, 500),
        action_label: "Acompanhar pauta",
        action_url: `/comun/pautas/${pauta.slug}`,
        priority: "normal",
        dedupe_key: `pauta-cycle:${input.cycleId}:${input.target}:${input.version}:${membership.member_user_id}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_user_id,dedupe_key" },
    );
    if (error) throw new Error("Não foi possível publicar a notificação.");
  }
}

export async function initializePautaActionCycle(form: FormData) {
  const session = await requirePoliticalEditor();
  const pautaId = value(form, "pauta_id");
  const client = db();
  if (!client || !pautaId) throw new Error("Pauta inválida.");
  const { data, error } = await client
    .from("comun_pauta_action_cycles")
    .upsert(
      {
        pauta_id: pautaId,
        current_stage: "contribution",
        next_action_public: nextPautaActionCycleStep("contribution"),
        responsible_role: "editor",
        public_visible: value(form, "public_visible") === "on",
        cycle_scope: "production",
      },
      { onConflict: "pauta_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Não foi possível iniciar a esteira política.");
  await logComunAdminAction({
    session,
    action: "pauta_action_cycle_initialized",
    targetType: "pauta_action_cycle",
    targetId: data?.id ?? pautaId,
    metadata: { pauta_id: pautaId },
  });
  invalidatePauta(pautaId, await pautaSlug(client, pautaId));
}

export async function createPautaDecisionDraft(form: FormData) {
  const session = await requirePoliticalEditor();
  const client = db();
  const pautaId = value(form, "pauta_id");
  const synthesisVersionId = value(form, "synthesis_version_id");
  if (!client || !pautaId || !synthesisVersionId)
    throw new Error("Selecione a síntese que sustenta a decisão.");
  const { data: synthesis } = await client
    .from("comun_pauta_synthesis_versions")
    .select("id")
    .eq("id", synthesisVersionId)
    .eq("pauta_id", pautaId)
    .maybeSingle();
  if (!synthesis) throw new Error("A síntese não pertence a esta pauta.");

  const title = sanitizeCollectivePublicText(value(form, "public_title"), 180);
  const summary = sanitizeCollectivePublicText(
    value(form, "public_summary"),
    2_000,
  );
  const justification = sanitizeCollectivePublicText(
    value(form, "public_justification"),
    2_000,
  );
  if (title.length < 3 || summary.length < 10 || justification.length < 10)
    throw new Error("Registre decisão, resumo e justificativa revisados.");

  const { data, error } = await client
    .from("comun_pauta_decisions")
    .insert({
      pauta_id: pautaId,
      synthesis_version_id: synthesisVersionId,
      circle_id: optional(form, "circle_id"),
      public_title: title,
      public_summary: summary,
      public_justification: justification,
      status: "draft",
      created_by_admin_id: session.admin.id,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Não foi possível registrar a decisão.");
  await client
    .from("comun_pauta_action_cycles")
    .update({ decision_id: data.id, updated_at: new Date().toISOString() })
    .eq("pauta_id", pautaId);
  await logComunAdminAction({
    session,
    action: "pauta_decision_draft_created",
    targetType: "pauta_decision",
    targetId: data.id,
    metadata: { pauta_id: pautaId, synthesis_version_id: synthesisVersionId },
  });
  invalidatePauta(pautaId, await pautaSlug(client, pautaId));
}

export async function publishPautaDecision(form: FormData) {
  const session = await requirePoliticalEditor();
  const client = db();
  const pautaId = value(form, "pauta_id");
  const decisionId = value(form, "decision_id");
  if (!client || !pautaId || !decisionId) throw new Error("Decisão inválida.");
  const { data: decision } = await client
    .from("comun_pauta_decisions")
    .select("id,created_by_admin_id,status")
    .eq("id", decisionId)
    .eq("pauta_id", pautaId)
    .maybeSingle();
  if (!decision || decision.status !== "draft")
    throw new Error("Somente uma decisão em rascunho pode ser publicada.");
  if (decision.created_by_admin_id === session.admin.id)
    throw new Error("A decisão exige revisão por outra pessoa autorizada.");
  const now = new Date().toISOString();
  const { error } = await client
    .from("comun_pauta_decisions")
    .update({
      status: "published",
      published_by_admin_id: session.admin.id,
      decided_at: now,
      published_at: now,
      updated_at: now,
    })
    .eq("id", decisionId)
    .eq("status", "draft");
  if (error) throw new Error("Não foi possível publicar a decisão.");
  await logComunAdminAction({
    session,
    action: "pauta_decision_published",
    targetType: "pauta_decision",
    targetId: decisionId,
    metadata: { pauta_id: pautaId },
  });
  invalidatePauta(pautaId, await pautaSlug(client, pautaId));
}

export async function linkPautaActionCycleEntities(form: FormData) {
  const session = await requirePoliticalEditor();
  const client = db();
  const pautaId = value(form, "pauta_id");
  const cycleId = value(form, "cycle_id");
  if (!client || !pautaId || !cycleId) throw new Error("Esteira inválida.");
  await requireOwnedCycle(client, cycleId, pautaId);
  const links = {
    decision_id: optional(form, "decision_id"),
    collective_action_id: optional(form, "collective_action_id"),
    forwarding_id: optional(form, "forwarding_id"),
    official_protocol_id: optional(form, "official_protocol_id"),
    result_id: optional(form, "result_id"),
  };

  if (links.decision_id) {
    const { data } = await client
      .from("comun_pauta_decisions")
      .select("id")
      .eq("id", links.decision_id)
      .eq("pauta_id", pautaId)
      .maybeSingle();
    if (!data) throw new Error("A decisão não pertence a esta pauta.");
  }
  if (links.collective_action_id) {
    const { data } = await client
      .from("comun_collective_actions")
      .select("id")
      .eq("id", links.collective_action_id)
      .eq("pauta_id", pautaId)
      .maybeSingle();
    if (!data) throw new Error("A ação não pertence a esta pauta.");
  }
  if (links.forwarding_id && !links.collective_action_id)
    throw new Error("O encaminhamento exige uma ação vinculada.");
  if (links.forwarding_id) {
    const { data } = await client
      .from("comun_collective_action_forwardings")
      .select("id")
      .eq("id", links.forwarding_id)
      .eq("action_id", links.collective_action_id)
      .maybeSingle();
    if (!data) throw new Error("O encaminhamento não pertence à ação.");
  }
  if (links.official_protocol_id) {
    const { data } = await client
      .from("comun_pauta_evidence_items")
      .select("id")
      .eq("pauta_id", pautaId)
      .eq("source_type", "official_protocol")
      .eq("source_id", links.official_protocol_id)
      .maybeSingle();
    if (!data)
      throw new Error(
        "O protocolo precisa estar revisado e vinculado como evidência da pauta.",
      );
  }
  if (links.result_id) {
    const { data } = await client
      .from("comun_hub_results")
      .select("id")
      .eq("id", links.result_id)
      .eq("pauta_id", pautaId)
      .maybeSingle();
    if (!data) throw new Error("O resultado não pertence a esta pauta.");
  }

  const { error } = await client
    .from("comun_pauta_action_cycles")
    .update({
      ...links,
      public_visible: value(form, "public_visible") === "on",
      responsible_role: value(form, "responsible_role") || "editor",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cycleId)
    .eq("pauta_id", pautaId);
  if (error) throw new Error("Não foi possível vincular a esteira.");
  await logComunAdminAction({
    session,
    action: "pauta_action_cycle_links_updated",
    targetType: "pauta_action_cycle",
    targetId: cycleId,
    metadata: { pauta_id: pautaId, linked_fields: Object.keys(links) },
  });
  invalidatePauta(pautaId, await pautaSlug(client, pautaId));
}

export async function transitionPautaActionCycle(form: FormData) {
  const session = await requirePoliticalEditor();
  const client = db();
  const pautaId = value(form, "pauta_id");
  const cycleId = value(form, "cycle_id");
  const target = value(form, "to_stage") as PautaActionCycleStage;
  const expectedVersion = Number(value(form, "expected_version"));
  if (
    !client ||
    !pautaId ||
    !cycleId ||
    !pautaActionCycleStages.includes(target) ||
    !Number.isInteger(expectedVersion)
  )
    throw new Error("Transição inválida.");
  await requireOwnedCycle(client, cycleId, pautaId);
  const summary = sanitizeCollectivePublicText(
    value(form, "public_summary"),
    2_000,
  );
  if (summary.length < 3)
    throw new Error("Escreva um resumo público da mudança.");
  const stableKey = createHash("sha256")
    .update(`${cycleId}\n${expectedVersion}\n${target}`)
    .digest("hex")
    .slice(0, 48);
  const { data, error } = await client.rpc(
    "comun_transition_pauta_action_cycle",
    {
      p_cycle_id: cycleId,
      p_expected_version: expectedVersion,
      p_idempotency_key: stableKey,
      p_to_stage: target,
      p_actor_admin_id: session.admin.id,
      p_actor_role: session.admin.role,
      p_public_summary: summary,
      p_private_note: optional(form, "private_note"),
    },
  );
  if (error) throw new Error(error.message);
  await client
    .from("comun_pauta_action_cycles")
    .update({
      next_action_public: nextPautaActionCycleStep(target),
      updated_at: new Date().toISOString(),
    })
    .eq("id", cycleId);
  await notifyPautaMembers(client, {
    pautaId,
    cycleId,
    target,
    version: Number(data?.[0]?.state_version ?? expectedVersion + 1),
    summary,
  });
  await logComunAdminAction({
    session,
    action: "pauta_action_cycle_transitioned",
    targetType: "pauta_action_cycle",
    targetId: cycleId,
    metadata: {
      pauta_id: pautaId,
      to_stage: target,
      state_version: data?.[0]?.state_version,
      replayed: data?.[0]?.replayed === true,
    },
  });
  invalidatePauta(pautaId, await pautaSlug(client, pautaId));
}
