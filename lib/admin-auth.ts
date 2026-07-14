import { redirect } from "next/navigation";
import { getAdminProfileForUser } from "@/lib/admin-profiles";
import { logComunAdminAction } from "@/lib/admin-audit";
import { createServiceSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { ComunAdminProfile } from "@/lib/types";
import type { ComunAdminProfileRole } from "@/lib/types";

export type ComunAdminRole = "admin" | "editor" | "viewer";

export type ComunAdminRecord = {
  id: string;
  user_id: string;
  email: string;
  role: ComunAdminRole;
  is_active: boolean;
};

export type ComunAdminSession = {
  user: {
    id: string;
    email: string | null;
  };
  admin: ComunAdminRecord;
  profile: ComunAdminProfile | null;
};

const ADMIN_LOGIN_PATH = "/comun/admin/login";

function loginRedirectPath() {
  return ADMIN_LOGIN_PATH;
}

export async function requireComunAdmin(options?: { roles?: ComunAdminRole[] }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect(loginRedirectPath());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(loginRedirectPath());

  const service = createServiceSupabaseClient();
  if (!service) throw new Error("Supabase service role nao configurado no servidor.");

  const { data, error } = await service
    .from("comun_admin_users")
    .select("id, user_id, email, role, is_active")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) redirect(ADMIN_LOGIN_PATH);

  const admin = data as ComunAdminRecord;
  if (options?.roles?.length && !options.roles.includes(admin.role)) {
    redirect("/comun/admin");
  }

  const profile = await getAdminProfileForUser({ authUserId: user.id, email: user.email ?? null });

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    admin,
    profile,
  } satisfies ComunAdminSession;
}

export async function getComunAdminSession() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const service = createServiceSupabaseClient();
  if (!service) return null;

  const { data } = await service
    .from("comun_admin_users")
    .select("id, user_id, email, role, is_active")
    .or(`user_id.eq.${user.id},email.eq.${user.email ?? ""}`)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  const profile = await getAdminProfileForUser({ authUserId: user.id, email: user.email ?? null });

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    admin: data as ComunAdminRecord,
    profile,
  } satisfies ComunAdminSession;
}

export async function requireComunAdminProfile() {
  const session = await requireComunAdmin();
  if (!session.profile?.active) {
    await logComunAdminAction({
      session,
      action: "admin_permission_matrix_denied",
      targetType: "admin_profile",
      metadata: { reason: "missing_active_profile" },
    });
    redirect("/comun/admin");
  }
  return { ...session, profile: session.profile };
}

export async function requireComunAdminRole(roles: ComunAdminProfileRole[]) {
  const session = await requireComunAdminProfile();
  if (!roles.includes(session.profile.role)) {
    await logComunAdminAction({
      session,
      action: roles.includes("admin") ? "admin_team_access_denied" : "admin_permission_matrix_denied",
      targetType: "admin_profile",
      targetId: session.profile.id,
      metadata: { required_roles: roles, actual_role: session.profile.role },
    });
    redirect("/comun/admin");
  }
  return session;
}
