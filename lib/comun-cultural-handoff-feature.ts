export const COMUN_CULTURAL_SPECIALIZED_HANDOFF_FLAG =
  "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED" as const;

export function isComunCulturalSpecializedHandoffEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_CULTURAL_SPECIALIZED_HANDOFF_FLAG] === "enabled";
}

export const specializedHandoffPaths = {
  photo_or_document: "/comun/acervo/contribuir",
  art: "/comun/acervo/arte/contribuir",
  oral_history: "/comun/acervo/historias-orais/contribuir",
  radio: "/comun/radio/contribuir",
} as const;

export function specializedHandoffPath(routeKind: string, protocol: string) {
  const base = specializedHandoffPaths[routeKind as keyof typeof specializedHandoffPaths];
  if (!base) return null;
  const query = routeKind === "photo_or_document" ? "specialized=photo&" : "";
  return `${base}?${query}intake=${encodeURIComponent(protocol)}`;
}
