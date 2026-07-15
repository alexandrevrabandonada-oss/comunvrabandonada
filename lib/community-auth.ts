import { redirect } from "next/navigation";
import { createServiceSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCommunitySession() {
  const supabase = await createSupabaseServerClient(); if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return null;
  const service = createServiceSupabaseClient(); if (!service) return null;
  const { data: profile } = await service.from("comun_member_profiles" as never).select("user_id, display_name, status, profile_visibility, onboarding_completed_at" as never).eq("user_id" as never, user.id).maybeSingle();
  return { user, profile: profile as any };
}

export async function requireCommunitySession(returnTo = "/comun/minha-participacao") {
  const session = await getCommunitySession();
  if (!session?.user) redirect(`/comun/entrar?returnTo=${encodeURIComponent(returnTo)}`);
  if (session.profile?.status === "suspended" || session.profile?.status === "deactivated") redirect("/comun/entrar?status=indisponivel");
  return session;
}

export async function requirePautaMembership(pautaId: string) {
  const session = await requireCommunitySession(); const service = createServiceSupabaseClient();
  const { data } = service ? await service.from("comun_pauta_memberships" as never).select("id, role, status" as never).eq("pauta_id" as never, pautaId).eq("member_user_id" as never, session.user.id).eq("status" as never, "active").maybeSingle() : { data: null };
  if (!data) throw new Error("Ação permitida apenas para participantes desta pauta."); return { session, membership: data as any };
}
