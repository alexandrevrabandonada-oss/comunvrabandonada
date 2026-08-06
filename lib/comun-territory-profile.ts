export const COMUN_TERRITORY_PROFILE_FLAG =
  "COMUN_TERRITORY_PROFILE_ENABLED" as const;
export const COMUN_TERRITORY_CATALOG_LOCAL_FLAG =
  "COMUN_TERRITORY_CATALOG_LOCAL" as const;

type Environment = Record<string, string | undefined>;

/**
 * Resolves the territory-profile capability once, before rendering or writing.
 * The legacy catalog alias is deliberately limited to disposable local labs.
 */
export function isComunTerritoryProfileEnabled(
  env: Environment = process.env,
): boolean {
  if (env[COMUN_TERRITORY_PROFILE_FLAG] === "enabled") return true;

  return (
    env.NODE_ENV !== "production" &&
    env.ALLOW_LOCAL_TESTS === "true" &&
    env[COMUN_TERRITORY_CATALOG_LOCAL_FLAG] === "enabled"
  );
}
