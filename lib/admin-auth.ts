import { redirect } from "next/navigation";
import { createServiceSupabaseClient, createSupabaseServerClient } from "@/lib/supabase/server";

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
};

const ADMIN_LOGIN_PATH = "/comun/admin/login";

function loginRedirectPath() {
  return ADMIN_LOGIN_PATH;
}

export async function requireComunAdmin(options?: { roles?: ComunAdminRole[] }) {
  const supabase = createSupabaseServerClient();
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

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    admin,
  } satisfies ComunAdminSession;
}

export async function getComunAdminSession() {
  const supabase = createSupabaseServerClient();
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

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    admin: data as ComunAdminRecord,
  } satisfies ComunAdminSession;
}
