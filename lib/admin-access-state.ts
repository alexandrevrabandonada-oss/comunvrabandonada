export type ComunAdminAccessKind =
  "signed_out" | "authenticated_not_authorized" | "authorized";

export function resolveComunAdminAccessKind(input: {
  hasUser: boolean;
  hasActiveAdmin: boolean;
}): ComunAdminAccessKind {
  if (!input.hasUser) return "signed_out";
  return input.hasActiveAdmin ? "authorized" : "authenticated_not_authorized";
}
