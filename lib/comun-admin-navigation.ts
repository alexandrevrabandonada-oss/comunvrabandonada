import { withComunAppV2 } from "./comun-experience";

const ADMIN_ROUTE = /^\/comun\/admin(?:\/|$)/;
const ALLOWED_FILTER_KEYS = new Set([
  "ativo",
  "busca",
  "canal",
  "compare_snapshot",
  "comunidade",
  "cursor",
  "data_ate",
  "data_de",
  "estado",
  "fila",
  "filtro",
  "minhas",
  "numero",
  "ordem",
  "page",
  "pagina",
  "papel",
  "pauta",
  "prioridade",
  "q",
  "responsavel",
  "resposta",
  "risco",
  "status",
  "tipo",
  "vencidos",
  "versao_segura",
]);

export function safeComunAdminReturn(
  value: unknown,
  fallback = "/comun/admin",
) {
  if (typeof value !== "string" || !value || value.length > 1200)
    return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const parsed = new URL(value, "http://comun.local");
    if (parsed.origin !== "http://comun.local") return fallback;
    if (!ADMIN_ROUTE.test(parsed.pathname)) return fallback;
    const safe = new URLSearchParams();
    for (const [key, filterValue] of parsed.searchParams) {
      if (key === "experiencia" && filterValue === "app-v2") {
        safe.set(key, filterValue);
      } else if (ALLOWED_FILTER_KEYS.has(key) && filterValue.length <= 160) {
        safe.append(key, filterValue);
      }
    }
    const query = safe.toString();
    return `${parsed.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return fallback;
  }
}

export function withComunAdminReturn(
  href: string,
  returnTo: string,
  appV2 = true,
) {
  const safeHref = safeComunAdminReturn(href);
  const safeReturn = safeComunAdminReturn(returnTo);
  const parsed = new URL(safeHref, "http://comun.local");
  parsed.searchParams.set("returnTo", safeReturn);
  return appV2
    ? withComunAppV2(`${parsed.pathname}${parsed.search}`)
    : `${parsed.pathname}${parsed.search}`;
}

export function adminFilterSnapshot(pathname: string, search: URLSearchParams) {
  const parsed = new URL(pathname, "http://comun.local");
  for (const [key, value] of search) {
    if (ALLOWED_FILTER_KEYS.has(key) && value.length <= 160)
      parsed.searchParams.append(key, value);
  }
  return safeComunAdminReturn(`${parsed.pathname}${parsed.search}`);
}
