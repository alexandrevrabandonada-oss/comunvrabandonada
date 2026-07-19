import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { requireCommunitySession } from "@/lib/community-auth";
export type CommunityRole =
  | "coordinator"
  | "facilitator"
  | "curator"
  | "community_editor"
  | "field_observer";
export type CommunityCapability =
  | "manage_membership"
  | "facilitate_circle"
  | "curate_evidence"
  | "edit_community"
  | "record_field_observation"
  | "manage_work_group";
const roleCapabilities: Record<CommunityRole, readonly CommunityCapability[]> =
  {
    coordinator: ["manage_membership", "manage_work_group"],
    facilitator: ["facilitate_circle"],
    curator: ["curate_evidence"],
    community_editor: ["edit_community"],
    field_observer: ["record_field_observation"],
  };
export function communityRoleCapabilities(role: CommunityRole) {
  return roleCapabilities[role] ?? [];
}
export async function requireCommunityCapability(
  slug: string,
  capability: CommunityCapability,
) {
  const { user } = await requireCommunitySession(`/comun/c/${slug}`),
    db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponível.");
  const { data } = await db
    .from("comun_community_role_assignments")
    .select(
      "role,membership:comun_community_memberships!inner(member_user_id,state,community:comun_communities!inner(slug))",
    )
    .is("revoked_at", null)
    .eq("membership.member_user_id", user.id)
    .eq("membership.state", "member")
    .eq("membership.community.slug", slug);
  const assignment = (data ?? []).find((x: any) =>
    communityRoleCapabilities(x.role).includes(capability),
  );
  if (!assignment) throw new Error("Capacidade comunitária não autorizada.");
  return { user, assignment };
}
