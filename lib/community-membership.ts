import {
  COMMUNITY_MEMBERSHIP_REVIEW_GATE,
  resolveCommunitySelfServiceState,
} from "@/lib/community-administration";
import { upsertMemberInbox } from "@/lib/community-inbox";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const collaborationChoices = [
  "circles",
  "actions",
  "research",
  "art",
  "radio",
  "communication",
  "territory",
] as const;
export const updateChoices = [
  "pautas",
  "circles",
  "activities",
  "results",
  "memory",
  "art",
  "radio",
] as const;
export type CommunityMembershipState =
  "following" | "member" | "paused" | "left" | "suspended";

const openOperationStates = [
  "pending",
  "assigned",
  "in_review",
  "blocked",
  "ready",
];

export async function getCommunityMembership(userId: string, slug: string) {
  const db = createServiceSupabaseClient();
  if (!db) return null;
  const { data } = await db
    .from("comun_community_memberships")
    .select(
      "id,state,collaboration_preferences,update_preferences,joined_at,paused_at,left_at,community:comun_communities!inner(id,slug,name)",
    )
    .eq("member_user_id", userId)
    .eq("community.slug", slug)
    .maybeSingle();
  if (!data) return null;
  const { data: request } = await db
    .from("comun_editorial_operation_items")
    .select("id,state,created_at,updated_at")
    .eq("source_id", data.id)
    .eq("human_gate", COMMUNITY_MEMBERSHIP_REVIEW_GATE)
    .in("state", openOperationStates)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { ...data, membership_request: request ?? null } as any;
}

export async function listCommunityMemberships(userId: string) {
  const db = createServiceSupabaseClient();
  if (!db) return [];
  const { data, error } = await db
    .from("comun_community_memberships")
    .select(
      "id,state,collaboration_preferences,update_preferences,joined_at,updated_at,community:comun_communities!inner(id,slug,name,short_description)",
    )
    .eq("member_user_id", userId)
    .in("state", ["following", "member", "paused"])
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return rows;
  const { data: requests } = await db
    .from("comun_editorial_operation_items")
    .select("source_id,state,created_at")
    .in(
      "source_id",
      rows.map((row: any) => row.id),
    )
    .eq("human_gate", COMMUNITY_MEMBERSHIP_REVIEW_GATE)
    .in("state", openOperationStates)
    .order("created_at", { ascending: false });
  const requestByMembership = new Map<string, any>();
  for (const request of requests ?? []) {
    if (!requestByMembership.has(request.source_id))
      requestByMembership.set(request.source_id, request);
  }
  return rows.map((row: any) => ({
    ...row,
    membership_request: requestByMembership.get(row.id) ?? null,
  }));
}

function selected(values: string[], allowed: readonly string[]) {
  return [...new Set(values)].filter((x) => allowed.includes(x));
}

async function notifyCommunityCoordinators(input: {
  communityId: string;
  communitySlug: string;
  communityName: string;
  requesterUserId: string;
  operationId: string;
}) {
  const db = createServiceSupabaseClient();
  if (!db) return;
  const { data } = await db
    .from("comun_community_role_assignments")
    .select(
      "membership:comun_community_memberships!inner(member_user_id,state,community_id)",
    )
    .eq("role", "coordinator")
    .is("revoked_at", null)
    .eq("membership.state", "member")
    .eq("membership.community_id", input.communityId);
  const recipients = new Set<string>();
  for (const assignment of data ?? []) {
    const membership = Array.isArray((assignment as any).membership)
      ? (assignment as any).membership[0]
      : (assignment as any).membership;
    if (
      membership?.member_user_id &&
      membership.member_user_id !== input.requesterUserId
    )
      recipients.add(membership.member_user_id);
  }
  await Promise.all(
    [...recipients].map((memberUserId) =>
      upsertMemberInbox({
        memberUserId,
        type: "community_membership_requested",
        title: `Nova solicitação em ${input.communityName}`,
        summary:
          "Há uma solicitação de entrada aguardando revisão da equipe responsável.",
        actionLabel: "Abrir comunidade",
        actionUrl: `/comun/c/${input.communitySlug}`,
        priority: "attention",
        dedupeKey: `community-membership-request:${input.operationId}`,
      }),
    ),
  );
}

export async function updateCommunityMembership(input: {
  userId: string;
  slug: string;
  intent: "follow" | "join" | "save" | "pause" | "resume" | "leave";
  collaboration?: string[];
  updates?: string[];
  requestMessage?: string;
}) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco local indisponível.");
  const { data: community, error: communityError } = await db
    .from("comun_communities")
    .select("id,slug,name")
    .eq("slug", input.slug)
    .eq("is_active", true)
    .single();
  if (communityError || !community)
    throw new Error("Comunidade não encontrada.");
  const { data: prior } = await db
    .from("comun_community_memberships")
    .select("id,state,joined_at")
    .eq("community_id", community.id)
    .eq("member_user_id", input.userId)
    .maybeSingle();
  if (prior?.state === "suspended")
    throw new Error(
      "Vínculo suspenso. Solicite revisão pelos canais de segurança.",
    );

  const state: CommunityMembershipState = resolveCommunitySelfServiceState({
    priorState: prior?.state,
    priorJoinedAt: prior?.joined_at,
    intent: input.intent,
  });
  const now = new Date().toISOString();
  const row = {
    community_id: community.id,
    member_user_id: input.userId,
    state,
    collaboration_preferences: selected(
      input.collaboration ?? [],
      collaborationChoices,
    ),
    update_preferences: selected(input.updates ?? [], updateChoices),
    joined_at: state === "member" ? (prior?.joined_at ?? now) : null,
    paused_at: state === "paused" ? now : null,
    left_at: state === "left" ? now : null,
    updated_at: now,
  };
  const { data: membership, error } = await db
    .from("comun_community_memberships")
    .upsert(row, { onConflict: "community_id,member_user_id" })
    .select("id,state,collaboration_preferences,update_preferences")
    .single();
  if (error) throw error;

  if (input.intent === "join" && membership.state !== "member") {
    const existing = await db
      .from("comun_editorial_operation_items")
      .select("id,state")
      .eq("source_id", membership.id)
      .eq("human_gate", COMMUNITY_MEMBERSHIP_REVIEW_GATE)
      .in("state", openOperationStates)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let operation = existing.data;
    if (!operation) {
      const dueAt = new Date(Date.now() + 48 * 3_600_000).toISOString();
      const created = await db
        .from("comun_editorial_operation_items")
        .insert({
          source_type: "contribution",
          source_id: membership.id,
          queue: "entry",
          state: "pending",
          title: `Solicitação de entrada · ${community.name}`,
          public_reason: null,
          next_action: "Revisar vínculo e decidir entrada como membro.",
          priority: 2,
          indicative_due_at: dueAt,
          human_gate: COMMUNITY_MEMBERSHIP_REVIEW_GATE,
        })
        .select("id,state")
        .single();
      if (created.error || !created.data)
        throw new Error("Não foi possível registrar a solicitação.");
      operation = created.data;
      await db.from("comun_editorial_operation_events").insert({
        item_id: operation.id,
        event_type: "community_membership_requested",
        payload: {
          community_id: community.id,
          request_message: String(input.requestMessage ?? "").slice(0, 800),
        },
      });
      await db.from("comun_community_audit_log").insert({
        community_id: community.id,
        member_user_id: input.userId,
        actor_user_id: input.userId,
        event_type: "membership_requested",
        prior_state: prior?.state ?? null,
        next_state: membership.state,
        metadata: {
          source: "community_self_service",
          operation_id: operation.id,
        },
      });
      await notifyCommunityCoordinators({
        communityId: community.id,
        communitySlug: community.slug,
        communityName: community.name,
        requesterUserId: input.userId,
        operationId: operation.id,
      });
    }
    await upsertMemberInbox({
      memberUserId: input.userId,
      type: "community_membership_requested",
      title: `Solicitação recebida por ${community.name}`,
      summary:
        "Você continua acompanhando a comunidade enquanto a entrada como membro é revisada.",
      actionLabel: "Acompanhar solicitação",
      actionUrl: `/comun/c/${community.slug}/participar`,
      priority: "attention",
      dedupeKey: `community-membership-request:${operation.id}`,
    });
    return { ...membership, membership_request: operation };
  }

  const event =
    input.intent === "save"
      ? "preferences_changed"
      : input.intent === "follow"
        ? "followed"
        : input.intent === "pause"
          ? "paused"
          : input.intent === "resume"
            ? "resumed"
            : input.intent === "leave"
              ? "left"
              : input.intent;
  await db.from("comun_community_audit_log").insert({
    community_id: community.id,
    member_user_id: input.userId,
    actor_user_id: input.userId,
    event_type: event,
    prior_state: prior?.state ?? null,
    next_state: state,
    metadata: { source: "community_self_service" },
  });
  await upsertMemberInbox({
    memberUserId: input.userId,
    type:
      input.intent === "leave"
        ? "community_withdrawal_completed"
        : "community_followed",
    title:
      input.intent === "leave"
        ? `Você deixou ${community.name}`
        : `Agora você acompanha ${community.name}`,
    summary:
      input.intent === "leave"
        ? "O acesso futuro e as atualizações foram encerrados. Seu histórico público permanece."
        : "Preferências podem ser alteradas a qualquer momento. Acompanhar não concede papel.",
    actionLabel:
      input.intent === "leave" ? "Ver comunidades" : "Abrir comunidade",
    actionUrl:
      input.intent === "leave"
        ? "/comun/comunidades"
        : `/comun/c/${community.slug}`,
    dedupeKey: `community:${community.id}:${input.intent === "leave" ? "left" : "followed"}`,
    resolved: input.intent === "leave",
  });
  return membership;
}
