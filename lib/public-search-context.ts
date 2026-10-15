import { isPublicContentDeliverable } from "./public-content-readiness";
import type { SearchResult } from "./unified-search";
export const PUBLIC_SEARCH_TYPES = [
  "ferramenta",
  "comunidade",
  "pauta",
  "território",
  "ação",
  "resultado",
  "documento",
  "calçada",
  "memória",
  "obra",
  "programa",
  "episódio",
  "coleção",
] as const;
export type SearchAvailability = "ready" | "empty" | "partial" | "unavailable";
export type PublicSearchState = {
  q: string;
  tipo?: string;
  pauta?: string;
  territorio?: string;
  experiencia?: "legacy";
  semantic?: "0";
};
const sensitive =
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){8,}|[a-f0-9]{8}-[a-f0-9-]{27,}|(?:access_token|refresh_token|service_role|object_key|password|senha|token|api_key)\s*[:=]|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./i;
export function publicQuery(value: unknown) {
  return typeof value === "string" &&
    value.length <= 120 &&
    !sensitive.test(value) &&
    !/[\u0000-\u001f\u007f]/.test(value)
    ? value.trim()
    : null;
}
export function publicSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 120 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    !/[a-f0-9]{8}-[a-f0-9-]{27,}/i.test(value)
  );
}
export function normalizeSearchState(
  p: Record<string, unknown>,
): PublicSearchState | null {
  const q = publicQuery(p.q ?? "");
  if (q === null) return null;
  if (p.tipo && !(PUBLIC_SEARCH_TYPES as readonly unknown[]).includes(p.tipo))
    return null;
  for (const k of ["pauta", "territorio"])
    if (p[k] && !publicSlug(p[k])) return null;
  return {
    q,
    ...(p.tipo ? { tipo: String(p.tipo) } : {}),
    ...(p.pauta ? { pauta: String(p.pauta) } : {}),
    ...(p.territorio ? { territorio: String(p.territorio) } : {}),
    ...(p.experiencia === "legacy" ? { experiencia: "legacy" as const } : {}),
    ...(p.semantic === "0" ? { semantic: "0" as const } : {}),
  };
}
export function searchHref(state: PublicSearchState) {
  const p = new URLSearchParams();
  for (const key of [
    "q",
    "tipo",
    "pauta",
    "territorio",
    "experiencia",
    "semantic",
  ] as const)
    if (state[key]) p.set(key, state[key]!);
  return `/comun/buscar${p.size ? `?${p}` : ""}`;
}
export function searchReturnHref(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length > 1600 ||
    !value.startsWith("/comun/buscar?") ||
    value.includes("\\")
  )
    return null;
  try {
    const u = new URL(value, "https://local.invalid");
    if (u.origin !== "https://local.invalid" || u.pathname !== "/comun/buscar")
      return null;
    const allowed = [
      "q",
      "tipo",
      "pauta",
      "territorio",
      "experiencia",
      "semantic",
    ];
    for (const key of u.searchParams.keys())
      if (!allowed.includes(key) || u.searchParams.getAll(key).length !== 1)
        return null;
    const state = normalizeSearchState(Object.fromEntries(u.searchParams));
    if (
      !state ||
      state.q.length < 2 ||
      (u.hash && !/^#resultado-[a-f0-9]{8}$/.test(u.hash))
    )
      return null;
    return searchHref(state) + u.hash;
  } catch {
    return null;
  }
}
export function safeSearchDestination(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/comun/") ||
    value.includes("\\")
  )
    return null;
  try {
    const u = new URL(value, "https://local.invalid");
    if (
      u.pathname === "/comun/resultados" &&
      publicSlug(u.searchParams.get("resultado"))
    )
      return `/comun/resultados?resultado=${u.searchParams.get("resultado")}`;
    return (u.origin === "https://local.invalid" &&
      /^\/comun\/(?:c|pautas|territorios|acoes|dossies|calcadas\/registros|acervo(?:\/arte|\/colecoes)?|radio\/(?:programas|episodios))\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/memoria\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(
        u.pathname,
      )) ||
      (u.origin === "https://local.invalid" &&
        ["/comun/calcadas", "/comun/mapa"].includes(u.pathname))
      ? u.pathname
      : null;
  } catch {
    return null;
  }
}
export function searchAnchor(href: string) {
  let n = 2166136261;
  for (const c of href) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return `resultado-${(n >>> 0).toString(16).padStart(8, "0")}`;
}
export function contextualSearchHref(href: string, state: PublicSearchState) {
  const target = safeSearchDestination(href);
  if (!target) return null;
  const p = new URLSearchParams({
    busca: searchHref(state) + `#${searchAnchor(target)}`,
  });
  if (state.experiencia) p.set("experiencia", state.experiencia);
  return `${target}${target.includes("?") ? "&" : "?"}${p}`;
}
export function safeSearchResults(rows: SearchResult[]) {
  return rows.flatMap((row) => {
    const href = safeSearchDestination(row.href);
    if (
      !href ||
      !row.title ||
      !isPublicContentDeliverable({
        slug: href,
        title: row.title,
        summary: row.summary,
      }) ||
      sensitive.test(row.title) ||
      (row.summary && sensitive.test(row.summary))
    )
      return [];
    return [
      {
        type: row.type,
        title: row.title,
        summary: row.summary,
        href,
        origin: row.origin,
        updatedAt: row.updatedAt,
        score: row.score,
      },
    ];
  });
}
