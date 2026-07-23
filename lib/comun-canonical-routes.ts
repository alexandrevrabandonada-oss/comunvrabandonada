export const comunCanonicalRoutes = {
  home: () => "/comun",
  territory: (slug: string) => `/comun/territorios/${slug}`,
  community: (slug: string) => `/comun/c/${slug}`,
  pauta: (slug: string) => `/comun/pautas/${slug}`,
  miniapp: (slug = "calcadas") => `/comun/${slug}`,
  sidewalkRecord: (slug: string) => `/comun/calcadas/registros/${slug}`,
  sidewalkPriority: (id?: string | null) =>
    `/comun/calcadas/prioridades${id ? `?prioridade=${encodeURIComponent(id)}` : ""}`,
  result: (slug?: string | null) =>
    `/comun/resultados${slug ? `?resultado=${encodeURIComponent(slug)}` : ""}`,
  sidewalkMemory: (pautaSlug: string, memorySlug: string) =>
    `/comun/pautas/${pautaSlug}/memoria/${memorySlug}`,
  inbox: () => "/comun/caixa-de-entrada",
  personalArea: () => "/comun/minha-participacao",
} as const;

export function isLegacyComunRoute(pathname: string) {
  return (
    pathname === "/comun/busca" ||
    pathname.startsWith("/comun/arte") ||
    /^\/comun\/pautas\/[^/]+\/registros\//.test(pathname)
  );
}
