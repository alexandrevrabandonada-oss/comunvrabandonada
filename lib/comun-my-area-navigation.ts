/**
 * Navigation contract only. These labels and hrefs expose section choices,
 * never membership, private records or authorization decisions.
 */
export const COMUN_MY_AREA_PRIMARY_SECTIONS = [
  ["contribuicoes", "Meus registros"],
  ["acompanhando", "Estou acompanhando"],
  ["conversas", "Minhas conversas"],
  ["acoes", "Ações em que estou"],
  ["tarefas", "Meus compromissos"],
] as const;

export const COMUN_MY_AREA_SECONDARY_SECTIONS = [
  ["comunidades", "Minhas comunidades"],
  ["resultados", "Resultados"],
  ["cultura", "Cultura"],
  ["configuracoes", "Configurações"],
] as const;

export const COMUN_MY_AREA_LEGACY_SECTIONS = [
  "contribuicoes",
  "acompanhando",
  "tarefas",
  "resultados",
] as const;

export const COMUN_MY_AREA_V2_SECTIONS = [
  ...COMUN_MY_AREA_PRIMARY_SECTIONS.map(([value]) => value),
  ...COMUN_MY_AREA_SECONDARY_SECTIONS.map(([value]) => value),
] as const;

export function resolveComunMyAreaSection(
  requested: unknown,
  appV2: boolean,
): string {
  const allowed: readonly string[] = appV2
    ? COMUN_MY_AREA_V2_SECTIONS
    : COMUN_MY_AREA_LEGACY_SECTIONS;
  return typeof requested === "string" && allowed.includes(requested)
    ? requested
    : "contribuicoes";
}

export function comunMyAreaSectionHref(value: string): string {
  if (!COMUN_MY_AREA_V2_SECTIONS.some((section) => section === value))
    return "/comun/minha-participacao";
  return `/comun/minha-participacao?secao=${value}`;
}
