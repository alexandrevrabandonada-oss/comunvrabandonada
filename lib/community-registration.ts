export const COMMUNITY_REGISTRATION_MODE = "COMMUNITY_REGISTRATION_MODE" as const;

/** Cadastro só abre quando o ambiente declara explicitamente `open`. */
export function isCommunityRegistrationOpen(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[COMMUNITY_REGISTRATION_MODE] === "open";
}
