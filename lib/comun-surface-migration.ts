import type { ComunShellMode } from "./comun-shell-contract";

export type ComunSurfaceMigrationDecisionName =
  | "migrate_v2"
  | "redirect_canonical"
  | "compatibility_v2"
  | "retain_v2"
  | "not_user_surface";

export type ComunSurfaceMigrationDecision = {
  route: string;
  shellMode: ComunShellMode;
  family: string;
  decision: ComunSurfaceMigrationDecisionName;
  legacyImports: string[];
  primaryAction?: string;
  contextualTitle: string;
  contextLabel: string;
  parentHref: string;
  requiresEntityContext: boolean;
  wave: 1 | 2 | 3 | 4;
};

export type ComunSurfaceSourceFacts = {
  redirects?: boolean;
  explicitV2?: boolean;
  notUserSurface?: boolean;
  legacyImports?: string[];
};

const MEMBER_ROOTS: Record<
  string,
  Pick<ComunSurfaceMigrationDecision, "contextualTitle" | "contextLabel">
> = {
  "/comun": {
    contextualTitle: "Início",
    contextLabel: "Organização comunitária",
  },
  "/comun/explorar": {
    contextualTitle: "Explorar",
    contextLabel: "Territórios, comunidades e pautas",
  },
  "/comun/participar": {
    contextualTitle: "Participar",
    contextLabel: "Escolha uma intenção",
  },
  "/comun/caixa-de-entrada": {
    contextualTitle: "Caixa",
    contextLabel: "Mudanças que pedem atenção",
  },
  "/comun/minha-participacao": {
    contextualTitle: "Minha participação",
    contextLabel: "Continue de onde parou",
  },
};

const AUTH_TITLES: Record<string, string> = {
  "/comun/entrar": "Entrar",
  "/comun/criar-conta": "Criar conta",
  "/comun/onboarding": "Preparar sua participação",
  "/comun/recuperar-acesso": "Recuperar acesso",
  "/comun/redefinir-acesso": "Redefinir acesso",
  "/comun/admin/login": "Acesso administrativo",
};

const INSTITUTIONAL_TITLES: Record<string, string> = {
  "/comun/ajuda": "Ajuda",
  "/comun/seguranca": "Segurança e privacidade",
  "/comun/territorio-tomado": "Sobre o COMUN",
  "/comun/offline": "Acesso offline",
  "/comun/acervo/direitos-e-remocao": "Direitos e remoção",
  "/comun/acervo/arte/direitos-e-retirada": "Direitos e retirada",
  "/comun/acervo/historias-orais/direitos-e-retirada": "Direitos e retirada",
  "/comun/radio/direitos-e-consentimento": "Direitos e consentimento",
};

const PUBLIC_WEB_PREFIXES = [
  "/comun/acervo",
  "/comun/arte",
  "/comun/radio",
  "/comun/dossies",
  "/comun/observatorios",
  "/comun/projetos",
  "/comun/cooperativas",
  "/comun/reciclagem",
  "/comun/buscar",
  "/comun/busca",
] as const;

const IMMERSIVE_PREFIXES = [
  "/comun/calcadas",
  "/comun/mapa",
  "/comun/campo",
  "/comun/preview",
] as const;

const ADMIN_CIVIC_PREFIXES = [
  "/comun/admin/acervo",
  "/comun/admin/acoes",
  "/comun/admin/alertas",
  "/comun/admin/anexos",
  "/comun/admin/calcadas",
  "/comun/admin/comunidades",
  "/comun/admin/curadoria",
  "/comun/admin/dossies",
  "/comun/admin/notificacoes",
  "/comun/admin/observatorios",
  "/comun/admin/pautas",
  "/comun/admin/protocolos-oficiais",
  "/comun/admin/radio",
  "/comun/admin/relatos",
  "/comun/admin/rodas",
  "/comun/admin/territorio",
] as const;

const FAMILY_LABELS: Record<string, string> = {
  acervo: "Acervo",
  acoes: "Ações",
  acompanhar: "Acompanhamentos",
  ajuda: "Ajuda",
  arte: "Arte",
  buscar: "Busca",
  busca: "Busca",
  calcadas: "Calçadas",
  campo: "Modo de campo",
  comunidades: "Comunidades",
  conta: "Conta",
  cooperativas: "Cooperativas",
  dossies: "Dossiês",
  mapa: "Mapa",
  observatorios: "Observatórios",
  pautas: "Pautas",
  projetos: "Projetos",
  protocolo: "Protocolo Popular",
  "protocolo-popular": "Protocolo Popular",
  radio: "Rádio",
  reciclagem: "Reciclagem",
  relatar: "Relatar",
  resultados: "Resultados",
  territorios: "Territórios",
};

const ENTITY_FAMILIES = new Set([
  "acervo",
  "acoes",
  "arte",
  "calcadas",
  "comunidades",
  "dossies",
  "mapa",
  "observatorios",
  "pautas",
  "projetos",
  "radio",
  "resultados",
  "territorios",
]);

function normalizeRoute(route: string) {
  const path = route.split(/[?#]/, 1)[0] || "/";
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

function routeSegments(route: string) {
  return normalizeRoute(route).split("/").filter(Boolean);
}

function startsWithRoute(route: string, prefix: string) {
  return route === prefix || route.startsWith(`${prefix}/`);
}

function familyFor(route: string) {
  const segments = routeSegments(route);
  const start = segments[1] === "admin" ? 2 : 1;
  const family = segments[start] ?? "home";
  return family === "c" ? "comunidades" : family;
}

function titleFor(route: string, family: string) {
  const segments = routeSegments(route);
  const last = segments.at(-1) ?? family;
  if (last.startsWith("[")) {
    const label = FAMILY_LABELS[family] ?? "Detalhe";
    return `Detalhe · ${label}`;
  }
  return (
    FAMILY_LABELS[last] ??
    FAMILY_LABELS[family] ??
    last.replace(/-/g, " ").replace(/^./, (letter) => letter.toUpperCase())
  );
}

function parentFor(route: string, shellMode: ComunShellMode) {
  if (shellMode === "admin") {
    const segments = routeSegments(route);
    return segments.length <= 3
      ? "/comun/admin"
      : `/${segments.slice(0, -1).join("/")}`;
  }
  if (shellMode === "auth" || shellMode === "institutional") return "/comun";
  const segments = routeSegments(route);
  if (route === "/comun/pautas") return "/comun";
  if (route === "/comun/acoes") return "/comun/pautas";
  if (route === "/comun/observatorios")
    return "/comun/observatorios/panorama";
  if (segments.length <= 2) return "/comun/explorar";
  if (segments[1] === "c") return "/comun/comunidades";
  if (segments[1] === "pautas" && segments[3] === "rodas")
    return `/${segments.slice(0, 3).join("/")}`;
  if (segments[1] === "acoes") return "/comun/pautas";
  if (segments[1] === "observatorios")
    return segments.length > 3
      ? `/${segments.slice(0, -1).join("/")}`
      : "/comun/observatorios/panorama";
  return `/${segments.slice(0, -1).join("/")}`;
}

function primaryActionFor(route: string, shellMode: ComunShellMode) {
  if (shellMode === "admin") return "/comun/admin";
  if (shellMode === "auth") return "/comun/entrar";
  if (shellMode === "institutional") return "/comun/ajuda";
  if (shellMode === "immersive") return parentFor(route, shellMode);
  if (shellMode === "public_web") return "/comun/explorar";
  if (route === "/comun/participar") return "/comun/participar";
  return "/comun/participar";
}

function resolveModeAndWave(route: string): {
  shellMode: ComunShellMode;
  wave: 1 | 2 | 3 | 4;
} {
  if (AUTH_TITLES[route]) return { shellMode: "auth", wave: 2 };
  if (INSTITUTIONAL_TITLES[route])
    return { shellMode: "institutional", wave: 2 };
  if (route.startsWith("/comun/admin")) {
    const wave = ADMIN_CIVIC_PREFIXES.some((prefix) =>
      startsWithRoute(route, prefix),
    )
      ? 3
      : 4;
    return { shellMode: "admin", wave };
  }
  if (MEMBER_ROOTS[route]) return { shellMode: "member_root", wave: 1 };
  if (IMMERSIVE_PREFIXES.some((prefix) => startsWithRoute(route, prefix)))
    return { shellMode: "immersive", wave: 2 };
  if (/\/observatorios\/[^/]+\/(mapa|campo|registrar|dados)(\/|$)/.test(route))
    return { shellMode: "immersive", wave: 2 };
  if (PUBLIC_WEB_PREFIXES.some((prefix) => startsWithRoute(route, prefix)))
    return { shellMode: "public_web", wave: 1 };
  return { shellMode: "member_nested", wave: 1 };
}

export function resolveComunSurfaceMigration(
  rawRoute: string,
  facts: ComunSurfaceSourceFacts = {},
): ComunSurfaceMigrationDecision {
  const route = normalizeRoute(rawRoute);
  const { shellMode, wave } = resolveModeAndWave(route);
  const family = familyFor(route);
  const root = MEMBER_ROOTS[route];
  const contextualTitle =
    root?.contextualTitle ??
    AUTH_TITLES[route] ??
    INSTITUTIONAL_TITLES[route] ??
    titleFor(route, family);
  const contextLabel =
    root?.contextLabel ??
    (shellMode === "admin"
      ? "Área interna · acesso controlado"
      : shellMode === "auth"
        ? "Conta e segurança"
        : shellMode === "institutional"
          ? "Informação pública"
          : shellMode === "immersive"
            ? "Ferramenta em primeiro plano"
            : shellMode === "public_web"
              ? "Descoberta e leitura pública"
              : "Processo comunitário");
  const segments = routeSegments(route);
  const dynamicOrDetail =
    segments.some((segment) => segment.startsWith("[")) || segments.length > 3;
  const decision: ComunSurfaceMigrationDecisionName = facts.notUserSurface
    ? "not_user_surface"
    : facts.redirects
      ? "redirect_canonical"
      : facts.explicitV2
        ? "retain_v2"
        : "compatibility_v2";

  return {
    route,
    shellMode,
    family,
    decision,
    legacyImports: [...new Set(facts.legacyImports ?? [])].sort(),
    primaryAction: primaryActionFor(route, shellMode),
    contextualTitle,
    contextLabel,
    parentHref: parentFor(route, shellMode),
    requiresEntityContext: ENTITY_FAMILIES.has(family) && dynamicOrDetail,
    wave,
  };
}

export const COMUN_SURFACE_SHELL_MODES = [
  "public_web",
  "member_root",
  "member_nested",
  "auth",
  "institutional",
  "immersive",
  "admin",
] as const satisfies readonly ComunShellMode[];
