import { resolveComunSurfaceMigration } from "./comun-surface-migration";
export {
  COMUN_APP_V2_EXPERIENCE,
  COMUN_COHERENCE_EXPERIENCE,
  isComunAppV2,
  resolveComunExperience,
  withComunAppV2,
  withComunExperience,
} from "./comun-experience";

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

export const COMUN_APP_V2_QUERY = "experiencia=app-v2";

export const COMUN_ROOT_TABS: Record<
  ComunRootTab,
  { href: string; label: string }
> = {
  inicio: { href: "/comun", label: "Início" },
  explorar: { href: "/comun/observatorios/panorama", label: "Entender" },
  participar: { href: "/comun/pautas", label: "Participar" },
  caixa: { href: "/comun/caixa-de-entrada", label: "Caixa" },
  minha_area: {
    href: "/comun/minha-participacao",
    label: "Minha participação",
  },
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
      background: "surface_paper",
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
      background: "surface_paper",
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

export function sanitizeComunBadge(value: number | string | null | undefined) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed > 99 ? "99+" : String(parsed);
}

export function resolveComunShellRoute(pathname: string): ComunShellRoute {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (normalized === "/" || !normalized.startsWith("/comun"))
    return {
      mode: "public_web",
      title: "COMUN",
      context: "Território e comunidade",
      parentHref: "/",
      routeGroup: "public_web",
    };
  const migration = resolveComunSurfaceMigration(normalized);
  const rootTab = ROOT_ROUTES.get(normalized);
  return {
    mode: migration.shellMode,
    title: migration.contextualTitle,
    context: migration.contextLabel,
    parentHref: migration.parentHref,
    rootTab,
    routeGroup: rootTab ? `member_root:${rootTab}` : migration.family,
  };
}

export function resolveComunShellContract(pathname: string) {
  const route = resolveComunShellRoute(pathname);
  return { route, contract: COMUN_SHELL_CONTRACTS[route.mode] };
}
