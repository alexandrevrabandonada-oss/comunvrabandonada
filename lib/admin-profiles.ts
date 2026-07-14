import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { ComunAdminProfile, ComunAdminProfileRole } from "@/lib/types";

export function canReviewFactual(role: ComunAdminProfileRole) {
  return ["admin", "editor", "factual_reviewer"].includes(role);
}

export function canReviewEditorial(role: ComunAdminProfileRole) {
  return ["admin", "editor", "editorial_reviewer"].includes(role);
}

export function canPublishDossier(role: ComunAdminProfileRole) {
  return ["admin", "publisher"].includes(role);
}

export function canManagePublicDossierFeatures(role: ComunAdminProfileRole) {
  return ["admin", "editor", "publisher"].includes(role);
}

export function canManageAdminTeam(role: ComunAdminProfileRole) {
  return role === "admin";
}

export function normalizeAdminProfileRole(value: string): ComunAdminProfileRole {
  const valid = ["admin", "editor", "factual_reviewer", "editorial_reviewer", "publisher", "viewer"];
  return valid.includes(value) ? (value as ComunAdminProfileRole) : "viewer";
}

export async function getAdminProfileForUser(input: { authUserId: string; email?: string | null }) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return null;
  const clauses = [`auth_user_id.eq.${input.authUserId}`];
  if (input.email) clauses.push(`email.eq.${input.email}`);
  const { data } = await supabase
    .from("comun_admin_profiles")
    .select("id, auth_user_id, display_name, email, role, active, operational_note, created_at, updated_at")
    .or(clauses.join(","))
    .eq("active", true)
    .maybeSingle();
  return (data as ComunAdminProfile | null) ?? null;
}

export async function listActiveAdminProfiles() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as ComunAdminProfile[];
  const { data } = await supabase
    .from("comun_admin_profiles")
    .select("id, auth_user_id, display_name, email, role, active, operational_note, created_at, updated_at")
    .eq("active", true)
    .order("display_name", { ascending: true });
  return (data ?? []) as ComunAdminProfile[];
}

export async function getAdminProfileById(id: string) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !id) return null;
  const { data } = await supabase
    .from("comun_admin_profiles")
    .select("id, auth_user_id, display_name, email, role, active, operational_note, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  return (data as ComunAdminProfile | null) ?? null;
}

export function profileLabel(profile: Pick<ComunAdminProfile, "display_name" | "email"> | null | undefined) {
  if (!profile) return "";
  return `${profile.display_name} <${profile.email}>`;
}

export async function listAdminProfiles(filters: { role?: string; active?: string; q?: string } = {}) {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return [] as ComunAdminProfile[];
  let query = supabase
    .from("comun_admin_profiles")
    .select("id, auth_user_id, display_name, email, role, active, operational_note, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (filters.role) query = query.eq("role", normalizeAdminProfileRole(filters.role));
  if (filters.active === "true") query = query.eq("active", true);
  if (filters.active === "false") query = query.eq("active", false);
  const { data } = await query;
  const q = filters.q?.trim().toLowerCase() ?? "";
  const rows = (data ?? []) as ComunAdminProfile[];
  if (!q) return rows;
  return rows.filter((profile) => profile.display_name.toLowerCase().includes(q) || profile.email.toLowerCase().includes(q));
}

export async function countActiveAdminProfiles() {
  const supabase = createServiceSupabaseClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("comun_admin_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("active", true);
  return count ?? 0;
}
