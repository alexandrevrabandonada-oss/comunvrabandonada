"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireComunAdminRole } from "@/lib/admin-auth";
import { logComunAdminAction } from "@/lib/admin-audit";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { ComunAdminProfileRole } from "@/lib/types";

const SPECIALIST_ROLES = [
  "factual_reviewer",
  "editorial_reviewer",
  "publisher",
  "viewer",
] as const satisfies readonly ComunAdminProfileRole[];

type ServiceClient = NonNullable<ReturnType<typeof createServiceSupabaseClient>>;

function redirectError(code: string): never {
  redirect(`/comun/admin/equipe?especialista_erro=${encodeURIComponent(code)}`);
}

async function findAuthUserByExactEmail(
  service: ServiceClient,
  email: string,
) {
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error("AUTH_DIRECTORY_LOOKUP_FAILED");
    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === email,
    );
    if (match) return match;
    if (data.users.length < perPage) break;
  }
  return null;
}

async function findExistingProfile(service: ServiceClient, input: {
  userId: string;
  email: string;
}) {
  const [byUser, byEmail] = await Promise.all([
    service
      .from("comun_admin_profiles")
      .select("id, auth_user_id, email, role, active, display_name")
      .eq("auth_user_id", input.userId)
      .maybeSingle(),
    service
      .from("comun_admin_profiles")
      .select("id, auth_user_id, email, role, active, display_name")
      .eq("email", input.email)
      .maybeSingle(),
  ]);
  if (byUser.error) throw new Error("PROFILE_LOOKUP_FAILED");
  if (byEmail.error) throw new Error("PROFILE_LOOKUP_FAILED");
  if (byUser.data && byEmail.data && byUser.data.id !== byEmail.data.id)
    throw new Error("PROFILE_IDENTITY_CONFLICT");
  return byUser.data ?? byEmail.data ?? null;
}

async function findExistingAdminAccess(service: ServiceClient, input: {
  userId: string;
  email: string;
}) {
  const [byUser, byEmail] = await Promise.all([
    service
      .from("comun_admin_users")
      .select("id, user_id, email, role, is_active")
      .eq("user_id", input.userId)
      .maybeSingle(),
    service
      .from("comun_admin_users")
      .select("id, user_id, email, role, is_active")
      .eq("email", input.email)
      .maybeSingle(),
  ]);
  if (byUser.error) throw new Error("ADMIN_ACCESS_LOOKUP_FAILED");
  if (byEmail.error) throw new Error("ADMIN_ACCESS_LOOKUP_FAILED");
  if (byUser.data && byEmail.data && byUser.data.id !== byEmail.data.id)
    throw new Error("ADMIN_ACCESS_IDENTITY_CONFLICT");
  return byUser.data ?? byEmail.data ?? null;
}

async function ensureSpecialistProfile(service: ServiceClient, input: {
  userId: string;
  email: string;
  displayName: string;
  role: (typeof SPECIALIST_ROLES)[number];
}) {
  const existing = await findExistingProfile(service, input);
  if (existing) {
    if (
      existing.auth_user_id !== input.userId ||
      existing.email !== input.email ||
      existing.role !== input.role
    ) {
      throw new Error("SPECIALIST_PROFILE_ALREADY_EXISTS_DIFFERENT");
    }
    if (!existing.active) {
      const { error } = await service
        .from("comun_admin_profiles")
        .update({ active: true, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error("PROFILE_REACTIVATION_FAILED");
    }
    return existing.id as string;
  }

  const { data, error } = await service
    .from("comun_admin_profiles")
    .insert({
      auth_user_id: input.userId,
      display_name: input.displayName,
      email: input.email,
      role: input.role,
      active: true,
      operational_note: "Vinculo operacional criado a partir de conta COMUN existente.",
    })
    .select("id")
    .single();
  if (error || !data?.id) throw new Error("PROFILE_CREATE_FAILED");
  return data.id as string;
}

async function ensureBaseAdminAccess(service: ServiceClient, input: {
  userId: string;
  email: string;
}) {
  const existing = await findExistingAdminAccess(service, input);
  if (existing) {
    if (
      existing.user_id !== input.userId ||
      existing.email !== input.email ||
      existing.role !== "viewer"
    ) {
      throw new Error("SPECIALIST_ADMIN_ACCESS_ALREADY_EXISTS");
    }
    if (!existing.is_active) {
      const { error } = await service
        .from("comun_admin_users")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error("ADMIN_ACCESS_REACTIVATION_FAILED");
    }
    return;
  }

  const { error } = await service.from("comun_admin_users").insert({
    user_id: input.userId,
    email: input.email,
    role: "viewer",
    is_active: true,
  });
  if (error) throw new Error("ADMIN_ACCESS_CREATE_FAILED");
}

export async function provisionExistingSpecialistRoleAction(formData: FormData) {
  const session = await requireComunAdminRole(["admin"]);
  const email = String(formData.get("account_email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("specialist_role") ?? "publisher").trim();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !SPECIALIST_ROLES.includes(role as any) ||
    formData.get("confirm_operational_access") !== "on"
  ) {
    redirectError("entrada-invalida");
  }

  const service = createServiceSupabaseClient();
  if (!service) redirectError("runtime-indisponivel");

  let authUser;
  try {
    authUser = await findAuthUserByExactEmail(service, email);
  } catch {
    redirectError("diretorio-indisponivel");
  }
  if (!authUser) redirectError("conta-nao-encontrada");

  const { data: memberProfile, error: memberError } = await service
    .from("comun_member_profiles")
    .select("display_name, status")
    .eq("user_id", authUser.id)
    .maybeSingle();
  if (memberError) redirectError("conta-indisponivel");
  if (
    !memberProfile ||
    ["suspended", "deactivation_requested", "deactivated", "archived"].includes(
      String(memberProfile.status ?? ""),
    )
  ) {
    redirectError("conta-indisponivel");
  }

  const displayName =
    String(memberProfile.display_name ?? "").trim() ||
    email.split("@", 1)[0] ||
    "Pessoa da equipe";

  let profileId: string;
  try {
    const existingAdmin = await findExistingAdminAccess(service, {
      userId: authUser.id,
      email,
    });
    if (existingAdmin && existingAdmin.role !== "viewer")
      redirectError("acesso-admin-existente");

    // Safe order: a profile alone grants no admin session. Base access is
    // activated only after the specialist profile exists successfully.
    profileId = await ensureSpecialistProfile(service, {
      userId: authUser.id,
      email,
      displayName,
      role: role as (typeof SPECIALIST_ROLES)[number],
    });
    await ensureBaseAdminAccess(service, {
      userId: authUser.id,
      email,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        ["PROFILE_IDENTITY_CONFLICT", "ADMIN_ACCESS_IDENTITY_CONFLICT"].includes(
          error.message,
        )
      ) {
        redirectError("identidade-conflitante");
      }
      if (error.message === "SPECIALIST_PROFILE_ALREADY_EXISTS_DIFFERENT") {
        redirectError("perfil-existente");
      }
      if (error.message === "SPECIALIST_ADMIN_ACCESS_ALREADY_EXISTS") {
        redirectError("acesso-admin-existente");
      }
    }
    redirectError("falha-provisionamento");
  }

  await logComunAdminAction({
    session,
    action: "admin_specialist_access_provisioned",
    targetType: "admin_profile",
    targetId: profileId,
    metadata: {
      role,
      source: "existing_comun_account_exact_email",
      base_admin_role: "viewer",
    },
  });

  revalidatePath("/comun/admin/equipe");
  redirect(
    `/comun/admin/equipe?especialista=vinculado&papel=${encodeURIComponent(role)}`,
  );
}
