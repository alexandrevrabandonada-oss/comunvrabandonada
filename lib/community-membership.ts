import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { upsertMemberInbox } from "@/lib/community-inbox";

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
  return data as any;
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
  return data ?? [];
}
function selected(values: string[], allowed: readonly string[]) {
  return [...new Set(values)].filter((x) => allowed.includes(x));
}
export async function updateCommunityMembership(input: {
  userId: string;
  slug: string;
  intent: "follow" | "join" | "save" | "pause" | "resume" | "leave";
  collaboration?: string[];
  updates?: string[];
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
  const state: CommunityMembershipState =
    input.intent === "join"
      ? "member"
      : input.intent === "pause"
        ? "paused"
        : input.intent === "leave"
          ? "left"
          : input.intent === "resume"
            ? prior?.joined_at
              ? "member"
              : "following"
            : prior?.state === "member"
              ? "member"
              : "following";
  const now = new Date().toISOString(),
    row = {
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
  const { data, error } = await db
    .from("comun_community_memberships")
    .upsert(row, { onConflict: "community_id,member_user_id" })
    .select("id,state,collaboration_preferences,update_preferences")
    .single();
  if (error) throw error;
  const event =
    input.intent === "save"
      ? "preferences_changed"
      : input.intent === "join"
        ? "membership_approved"
        : input.intent === "follow"
          ? "followed"
          : input.intent;
  await db
    .from("comun_community_audit_log")
    .insert({
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
  return data;
}
