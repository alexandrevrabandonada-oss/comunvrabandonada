export type ComunShellMode =
  | "public_web"
  | "member_root"
  | "member_nested"
  | "admin"
  | "immersive"
  | "auth"
  | "institutional";

export type ComunRootTab =
  "inicio" | "explorar" | "participar" | "caixa" | "minha_area";

export type ComunShellContract = {
  mode: ComunShellMode;
  appBar: "brand" | "root" | "contextual" | "admin" | "none";
  bottomNavigation: "full" | "none";
  footer: "institutional" | "desktop_only" | "none";
  width: "wide" | "reading" | "full";
  background:
    "surface_base" | "surface_paper" | "surface_tool" | "surface_operation";
  padding: "page" | "task" | "none";
  back: "none" | "history_or_parent" | "admin_home";
  safeArea: "all" | "top" | "bottom" | "none";
  scroll: "document" | "contained" | "immersive";
};

export type ComunShellRoute = {
  mode: ComunShellMode;
  title: string;
  context: string;
  parentHref: string;
  rootTab?: ComunRootTab;
  routeGroup: string;
};

export const COMUN_APP_V2_EXPERIENCE = "app-v2" as const;
export const COMUN_APP_V2_QUERY = `experiencia=${COMUN_APP_V2_EXPERIENCE}`;

export const COMUN_ROOT_TABS: Record<
  ComunRootTab,
  { href: string; label: string }
> = {
  inicio: { href: "/comun", label: "Início" },
  explorar: { href: "/comun/explorar", label: "Explorar" },
  participar: { href: "/comun/participar", label: "Participar" },
  caixa: { href: "/comun/caixa-de-entrada", label: "Caixa" },
  minha_area: { href: "/comun/minha-participacao", label: "Minha área" },
};

export const COMUN_SHELL_CONTRACTS: Record<ComunShellMode, ComunShellContract> =
  {
    public_web: {
      mode: "public_web",
      appBar: "brand",
      bottomNavigation: "none",
      footer: "institutional",
      width: "wide",
      background: "surface_base",
      padding: "page",
      back: "none",
      safeArea: "all",
      scroll: "document",
    },
    member_root: {
      mode: "member_root",
      appBar: "root",
      bottomNavigation: "full",
      footer: "none",
      width: "wide",
      background: "surface_paper",
      padding: "page",
      back: "none",
      safeArea: "all",
      scroll: "document",
    },
    member_nested: {
      mode: "member_nested",
      appBar: "contextual",
      bottomNavigation: "none",
      footer: "none",
      width: "reading",
      background: "surface_base",
      padding: "task",
      back: "history_or_parent",
      safeArea: "all",
      scroll: "document",
    },
    admin: {
      mode: "admin",
      appBar: "admin",
      bottomNavigation: "none",
      footer: "none",
      width: "full",
      background: "surface_operation",
      padding: "task",
      back: "admin_home",
      safeArea: "all",
      scroll: "contained",
    },
    immersive: {
      mode: "immersive",
      appBar: "contextual",
      bottomNavigation: "none",
      footer: "none",
      width: "full",
      background: "surface_tool",
      padding: "none",
      back: "history_or_parent",
      safeArea: "all",
      scroll: "immersive",
    },
    auth: {
      mode: "auth",
      appBar: "brand",
      bottomNavigation: "none",
      footer: "none",
      width: "reading",
      background: "surface_paper",
      padding: "task",
      back: "history_or_parent",
      safeArea: "all",
      scroll: "document",
    },
    institutional: {
      mode: "institutional",
      appBar: "brand",
      bottomNavigation: "none",
      footer: "institutional",
      width: "reading",
      background: "surface_base",
      padding: "page",
      back: "none",
      safeArea: "all",
      scroll: "document",
    },
  };

const ROOT_ROUTES = new Map<string, ComunRootTab>(
  Object.entries(COMUN_ROOT_TABS).map(([key, value]) => [
    value.href,
    key as ComunRootTab,
  ]),
);

const AUTH_ROUTES = new Set([
  "/comun/entrar",
  "/comun/criar-conta",
  "/comun/recuperar-acesso",
  "/comun/redefinir-acesso",
  "/comun/onboarding",
  "/comun/admin/login",
]);

const INSTITUTIONAL_ROUTES = new Set([
  "/comun/ajuda",
  "/comun/seguranca",
  "/comun/territorio-tomado",
  "/comun/offline",
]);

const IMMERSIVE_PREFIXES = [
  "/comun/calcadas",
  "/comun/mapa",
  "/comun/campo/turno",
  "/comun/preview",
] as const;

const CONTEXT_ROUTES: Array<{
  pattern: RegExp;
  title: string;
  context: string;
  parentHref: string;
  routeGroup: string;
}> = [
  {
    pattern: /^\/comun\/pautas\/[^/]+/,
    title: "Pauta",
    context: "Processo comunitário",
    parentHref: "/comun/pautas",
    routeGroup: "pauta_detail",
  },
  {
    pattern: /^\/comun\/c\/[^/]+/,
    title: "Comunidade",
    context: "Quem organiza",
    parentHref: "/comun/comunidades",
    routeGroup: "community_detail",
  },
  {
    pattern: /^\/comun\/territorios\/[^/]+/,
    title: "Território",
    context: "Onde acontece",
    parentHref: "/comun/explorar",
    routeGroup: "territory_detail",
  },
  {
    pattern: /^\/comun\/calcadas\/registros\/[^/]+/,
    title: "Registro de calçada",
    context: "Mapa das Calçadas",
    parentHref: "/comun/calcadas",
    routeGroup: "sidewalk_record",
  },
  {
    pattern: /^\/comun\/calcadas/,
    title: "Mapa das Calçadas",
    context: "Ferramenta · Volta Redonda",
    parentHref: "/comun/pautas/calcadas-em-circulacao",
    routeGroup: "sidewalk_miniapp",
  },
  {
    pattern: /^\/comun\/mapa/,
    title: "Mapa",
    context: "Território e registros",
    parentHref: "/comun/explorar",
    routeGroup: "map",
  },
  {
    pattern: /^\/comun\/acervo/,
    title: "Acervo",
    context: "Memória coletiva",
    parentHref: "/comun/explorar",
    routeGroup: "archive",
  },
  {
    pattern: /^\/comun\/radio/,
    title: "Rádio",
    context: "Escuta e participação",
    parentHref: "/comun/explorar",
    routeGroup: "radio",
  },
  {
    pattern: /^\/comun\/acoes\/[^/]+/,
    title: "Ação",
    context: "Próximo passo coletivo",
    parentHref: "/comun/acoes",
    routeGroup: "action_detail",
  },
];

export function isComunAppV2(
  value: string | string[] | null | undefined,
): boolean {
  return value === COMUN_APP_V2_EXPERIENCE;
}

export function withComunAppV2(href: string, active = true): string {
  if (!active || !href.startsWith("/")) return href;
  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const [path, query = ""] = pathAndQuery.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("experiencia", COMUN_APP_V2_EXPERIENCE);
  return `${path}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

export function sanitizeComunBadge(value: number | string | null | undefined) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed > 99 ? "99+" : String(parsed);
}

export function resolveComunShellRoute(pathname: string): ComunShellRoute {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const rootTab = ROOT_ROUTES.get(normalized);
  if (rootTab) {
    const tab = COMUN_ROOT_TABS[rootTab];
    return {
      mode: "member_root",
      title: tab.label,
      context:
        rootTab === "inicio"
          ? "Organização comunitária"
          : rootTab === "caixa"
            ? "Mudanças que pedem atenção"
            : rootTab === "minha_area"
              ? "Sua relação com os processos"
              : rootTab === "participar"
                ? "Escolha uma intenção"
                : "Territórios, comunidades e pautas",
      parentHref: "/comun",
      rootTab,
      routeGroup: `member_root:${rootTab}`,
    };
  }
  if (AUTH_ROUTES.has(normalized))
    return {
      mode: "auth",
      title: normalized.includes("admin") ? "Acesso administrativo" : "Acesso",
      context: "Conta e segurança",
      parentHref: "/comun",
      routeGroup: "auth",
    };
  if (normalized.startsWith("/comun/admin"))
    return {
      mode: "admin",
      title:
        normalized === "/comun/admin/operacao"
          ? "Central Operacional"
          : "Administração",
      context: "Área interna · dados sensíveis",
      parentHref: "/comun/admin",
      routeGroup: "admin",
    };
  if (INSTITUTIONAL_ROUTES.has(normalized))
    return {
      mode: "institutional",
      title: normalized === "/comun/ajuda" ? "Ajuda" : "Sobre o COMUN",
      context: "Informação pública",
      parentHref: "/comun",
      routeGroup: "institutional",
    };
  const contextual = CONTEXT_ROUTES.find(({ pattern }) =>
    pattern.test(normalized),
  );
  if (contextual) {
    const mode = IMMERSIVE_PREFIXES.some((prefix) =>
      normalized.startsWith(prefix),
    )
      ? "immersive"
      : "member_nested";
    return { mode, ...contextual };
  }
  if (IMMERSIVE_PREFIXES.some((prefix) => normalized.startsWith(prefix)))
    return {
      mode: "immersive",
      title: "Ferramenta",
      context: "Modo imersivo",
      parentHref: "/comun/explorar",
      routeGroup: "immersive",
    };
  if (normalized === "/" || !normalized.startsWith("/comun"))
    return {
      mode: "public_web",
      title: "COMUN",
      context: "Território e comunidade",
      parentHref: "/",
      routeGroup: "public_web",
    };
  return {
    mode: "member_nested",
    title: "COMUN",
    context: "Processo comunitário",
    parentHref: "/comun/explorar",
    routeGroup: "member_nested",
  };
}

export function resolveComunShellContract(pathname: string) {
  const route = resolveComunShellRoute(pathname);
  return { route, contract: COMUN_SHELL_CONTRACTS[route.mode] };
}
