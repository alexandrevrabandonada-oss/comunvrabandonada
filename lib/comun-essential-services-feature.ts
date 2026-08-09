import { isComunParticipationWalletEnabled } from "./comun-participation-wallet-feature";
import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";
import type { RoutingDecision } from "./comun-relata-contract";

export const COMUN_ESSENTIAL_SERVICES_FLAG =
  "COMUN_ESSENTIAL_SERVICES_ENABLED" as const;
export const COMUN_ESSENTIAL_FORWARDING_ASSISTED_FLAG =
  "COMUN_ESSENTIAL_FORWARDING_ASSISTED_ENABLED" as const;
export const COMUN_ESSENTIAL_SERVICES_PREFIX =
  "/api/comun/essential-services" as const;

export const ESSENTIAL_SERVICE_CATEGORIES = [
  "water_supply",
  "power_distribution",
  "public_lighting",
] as const;

export type EssentialServiceCategory =
  (typeof ESSENTIAL_SERVICE_CATEGORIES)[number];

export function isEssentialServiceCategory(
  value: unknown,
): value is EssentialServiceCategory {
  return (
    typeof value === "string" &&
    (ESSENTIAL_SERVICE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isComunEssentialServicesEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_ESSENTIAL_SERVICES_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env)
  );
}

export function isComunEssentialForwardingAssistedEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_ESSENTIAL_FORWARDING_ASSISTED_FLAG] === "enabled" &&
    isComunEssentialServicesEnabled(env) &&
    isComunParticipationWalletEnabled(env) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function applyComunEssentialServicesRoutingGate(
  decision: RoutingDecision,
  enabled: boolean,
): RoutingDecision {
  if (enabled || decision.category !== "water_supply") return decision;
  return {
    ...decision,
    category: "other",
    agencyKind: "community_review",
    confidence: "low",
    explanation:
      "O relato será guardado sem encaminhamento automático para revisão.",
    nextStep: "Guarde agora; você poderá completar o contexto depois.",
  };
}

export function shouldCloakComunEssentialServices(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  if (pathname === "/api/comun/relata/classification")
    return !isComunEssentialServicesEnabled(env);
  if (!pathname.startsWith(COMUN_ESSENTIAL_SERVICES_PREFIX)) return false;
  return !isComunEssentialForwardingAssistedEnabled(env);
}
