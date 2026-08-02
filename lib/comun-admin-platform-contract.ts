export type ComunAdminPlatformDomain =
  | "operations"
  | "observability"
  | "audit_recovery"
  | "configuration"
  | "launch";

export type ComunAdminPlatformRouteContract = {
  route: string;
  domain: ComunAdminPlatformDomain;
  title: string;
  access: "admin_session" | "active_admin_profile" | "admin_only";
  shell: "admin_level_0" | "operational_level_0" | "capacity_redirect";
  preservesFilters: boolean;
  preservesAppV2Flag: true;
  memberBottomNavigation: false;
  publicDataOnly: false;
};

const ROUTES: readonly ComunAdminPlatformRouteContract[] = [
  {
    route: "/comun/admin",
    domain: "configuration",
    title: "Entrada administrativa por capacidade",
    access: "admin_session",
    shell: "capacity_redirect",
    preservesFilters: false,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  },
  {
    route: "/comun/admin/auditoria",
    domain: "audit_recovery",
    title: "Auditoria, segurança e recuperação",
    access: "admin_only",
    shell: "admin_level_0",
    preservesFilters: true,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  },
  {
    route: "/comun/admin/equipe",
    domain: "configuration",
    title: "Papéis e capacidade administrativa",
    access: "admin_only",
    shell: "admin_level_0",
    preservesFilters: true,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  },
  {
    route: "/comun/admin/lancamento",
    domain: "launch",
    title: "Prontidão e go/no-go",
    access: "admin_session",
    shell: "admin_level_0",
    preservesFilters: false,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  },
  {
    route: "/comun/admin/observabilidade",
    domain: "observability",
    title: "Saúde agregada da plataforma",
    access: "admin_only",
    shell: "admin_level_0",
    preservesFilters: true,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  },
  {
    route: "/comun/admin/operacao",
    domain: "operations",
    title: "Central Operacional",
    access: "active_admin_profile",
    shell: "operational_level_0",
    preservesFilters: true,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  },
  {
    route: "/comun/admin/operacao/[id]",
    domain: "operations",
    title: "Item operacional",
    access: "active_admin_profile",
    shell: "operational_level_0",
    preservesFilters: true,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  },
  {
    route: "/comun/admin/operacao/superficies/[surface]",
    domain: "operations",
    title: "Superfície operacional protegida",
    access: "active_admin_profile",
    shell: "operational_level_0",
    preservesFilters: true,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  },
  ...[
    "/comun/admin/organizacao",
    "/comun/admin/organizacao/calendario",
    "/comun/admin/organizacao/entrada",
    "/comun/admin/organizacao/entrada/vincular",
  ].map((route): ComunAdminPlatformRouteContract => ({
    route,
    domain: "operations",
    title: "Organização operacional",
    access: "admin_session",
    shell: "admin_level_0",
    preservesFilters: true,
    preservesAppV2Flag: true,
    memberBottomNavigation: false,
    publicDataOnly: false,
  })),
];

export const COMUN_ADMIN_PLATFORM_ROUTES = ROUTES;

export const COMUN_ADMIN_PLATFORM_GATES = {
  launch: {
    gate: "launch_publicly",
    state: "human_gate_closed",
    mayTriggerWithoutHuman: false,
  },
  civicIntelligence: {
    state: "COMUN_CIVIC_INTELLIGENCE_BLOCKED_PROVIDER_CAPABILITY",
    semanticPromotionAllowed: false,
  },
  durableRecovery: {
    state: "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
    promotionAllowed: false,
  },
} as const;

export function resolveComunAdminPlatformRoute(route: string) {
  const normalized = route.split(/[?#]/, 1)[0]?.replace(/\/$/, "") || "/";
  return (
    ROUTES.find(({ route: candidate }) => candidate === normalized) ??
    (normalized.startsWith("/comun/admin/operacao/superficies/")
      ? ROUTES.find(
          ({ route: candidate }) =>
            candidate === "/comun/admin/operacao/superficies/[surface]",
        )
      : normalized.startsWith("/comun/admin/operacao/")
        ? ROUTES.find(
            ({ route: candidate }) =>
              candidate === "/comun/admin/operacao/[id]",
          )
        : undefined)
  );
}

const FORBIDDEN_TELEMETRY_KEY =
  /(?:^|_)(?:raw_query|query_text|sql|secret|token|password|cookie|session|email|user_id|content|private|signed_url|object_key|latitude|longitude|geometry)(?:_|$)/i;

export function sanitizeComunPlatformTelemetry(value: unknown): unknown {
  if (Array.isArray(value))
    return value.slice(0, 100).map(sanitizeComunPlatformTelemetry);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !FORBIDDEN_TELEMETRY_KEY.test(key))
        .map(([key, item]) => [key, sanitizeComunPlatformTelemetry(item)]),
    );
  if (typeof value === "string") return value.slice(0, 160);
  return value;
}
