import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const COMUN_ENTITY_REVIEWER_PROFILE_ROLES = [
  "admin",
  "editor",
  "factual_reviewer",
] as const;

export type ComunCollectiveEntityRoleReadiness = {
  activeAdminUsers: number;
  reviewerCapable: number;
  publisherCapable: number;
  distinctReviewerCapacity: boolean;
  publisherCapacity: boolean;
  operational: boolean;
};

export async function getCollectiveEntityRoleReadiness(): Promise<ComunCollectiveEntityRoleReadiness> {
  const service = createServiceSupabaseClient();
  if (!service)
    return {
      activeAdminUsers: 0,
      reviewerCapable: 0,
      publisherCapable: 0,
      distinctReviewerCapacity: false,
      publisherCapacity: false,
      operational: false,
    };

  const [profilesResult, usersResult] = await Promise.all([
    service
      .from("comun_admin_profiles")
      .select("auth_user_id, role, active")
      .eq("active", true),
    service
      .from("comun_admin_users")
      .select("user_id, is_active")
      .eq("is_active", true),
  ]);

  if (profilesResult.error) throw new Error(profilesResult.error.message);
  if (usersResult.error) throw new Error(usersResult.error.message);

  const activeUsers = new Set(
    (usersResult.data ?? []).map((row: any) => String(row.user_id)),
  );
  const operationalProfiles = (profilesResult.data ?? []).filter(
    (profile: any) =>
      profile.auth_user_id && activeUsers.has(String(profile.auth_user_id)),
  );

  const reviewerCapable = operationalProfiles.filter((profile: any) =>
    COMUN_ENTITY_REVIEWER_PROFILE_ROLES.includes(profile.role as any),
  ).length;
  const publisherCapable = operationalProfiles.filter(
    (profile: any) => profile.role === "publisher",
  ).length;

  return {
    activeAdminUsers: activeUsers.size,
    reviewerCapable,
    publisherCapable,
    distinctReviewerCapacity: reviewerCapable >= 2,
    publisherCapacity: publisherCapable >= 1,
    operational: reviewerCapable >= 2 && publisherCapable >= 1,
  };
}

export async function isActiveAdminAccessUser(userId: string | null | undefined) {
  if (!userId) return false;
  const service = createServiceSupabaseClient();
  if (!service) return false;
  const { data, error } = await service
    .from("comun_admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
