import type { ComunAdminProfile, ComunOperationalRole } from "./types";

type Profile = Pick<
  ComunAdminProfile,
  "id" | "role" | "operational_role" | "active"
>;

export function effectiveOperationalRole(profile: Profile) {
  return profile.operational_role ?? profile.role;
}

export function canAssumeOperationalItem(
  profile: Profile | null,
  item: { requiredRole: string | null; state: string },
) {
  if (!profile?.active || ["resolved", "withdrawn"].includes(item.state))
    return false;
  if (profile.role === "admin") return true;
  return Boolean(
    profile.operational_role && item.requiredRole === profile.operational_role,
  );
}

export function requiresExplicitReassignmentConfirmation(input: {
  priority: number;
  hasActiveResponsible: boolean;
  assigningSelf: boolean;
  cancellingUnfinished: boolean;
}) {
  return (
    input.cancellingUnfinished ||
    (!input.assigningSelf && input.hasActiveResponsible) ||
    (input.priority === 1 && input.hasActiveResponsible)
  );
}

export function canReceiveOperationalAssignment(
  role: string | null,
  requiredRole: ComunOperationalRole | null,
) {
  return role === "admin" || Boolean(role && role === requiredRole);
}
