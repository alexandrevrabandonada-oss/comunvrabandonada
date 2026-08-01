import qualityBudgets from "@/config/comun-quality-budgets.json";

export const COMUN_WEB_VITAL_NAMES = [
  "LCP",
  "INP",
  "CLS",
  "FCP",
  "TTFB",
] as const;
export type ComunWebVitalName = (typeof COMUN_WEB_VITAL_NAMES)[number];
export type ComunWebVitalRating = "good" | "needs-improvement" | "poor";
export type ComunDeviceClass = "mobile" | "desktop";

export const COMUN_ROUTE_CLASSES = [
  "home",
  "discovery",
  "search",
  "process",
  "territory",
  "community",
  "action",
  "result",
  "sidewalks",
  "culture",
  "help_security",
  "auth",
  "personal",
  "admin",
  "offline",
  "other",
] as const;
export type ComunRouteClass = (typeof COMUN_ROUTE_CLASSES)[number];

export type ComunRouteBudgetClass = "simple" | "visual" | "rich" | "media";

export const COMUN_ROUTE_BUDGETS = qualityBudgets satisfies Record<
  ComunRouteBudgetClass,
  {
    initialJsKb: number;
    cssKb: number;
    imagesKb: number;
    fontsKb: number;
    requests: number;
    heapMb: number;
    lcpMs: number;
    longTasks: number;
  }
>;

export function classifyComunRoute(pathname: string): ComunRouteClass {
  if (pathname === "/comun" || pathname === "/comun/") return "home";
  if (pathname.startsWith("/comun/admin")) return "admin";
  if (
    /^\/comun\/(entrar|criar-conta|recuperar-acesso|redefinir-acesso)/.test(
      pathname,
    )
  )
    return "auth";
  if (
    /^\/comun\/(minha-participacao|caixa-de-entrada|conta|onboarding)/.test(
      pathname,
    )
  )
    return "personal";
  if (pathname.startsWith("/comun/offline")) return "offline";
  if (/^\/comun\/(ajuda|seguranca)/.test(pathname)) return "help_security";
  if (pathname.startsWith("/comun/buscar")) return "search";
  if (
    pathname.startsWith("/comun/calcadas") ||
    pathname.startsWith("/comun/mapa")
  )
    return "sidewalks";
  if (/^\/comun\/(acervo|radio|arte)/.test(pathname)) return "culture";
  if (pathname.startsWith("/comun/resultados")) return "result";
  if (pathname.startsWith("/comun/acoes")) return "action";
  if (pathname.startsWith("/comun/pautas")) return "process";
  if (/^\/comun\/(territorios|territorio-tomado)/.test(pathname))
    return "territory";
  if (/^\/comun\/(comunidades|c\/)/.test(pathname)) return "community";
  if (/^\/comun\/(explorar|participar)/.test(pathname)) return "discovery";
  return "other";
}

export function metricValueBucket(name: ComunWebVitalName, value: number) {
  if (name === "CLS")
    return Math.max(0, Math.min(10_000, Math.round(value * 1000)));
  const interval = name === "INP" ? 25 : 100;
  return Math.max(
    0,
    Math.min(120_000, Math.round(value / interval) * interval),
  );
}

export function metricBucketValue(name: ComunWebVitalName, bucket: number) {
  return name === "CLS" ? bucket / 1000 : bucket;
}

export function routeBudgetClass(
  routeClass: ComunRouteClass,
): ComunRouteBudgetClass {
  if (routeClass === "culture") return "visual";
  if (["sidewalks", "search", "admin"].includes(routeClass)) return "rich";
  return "simple";
}
