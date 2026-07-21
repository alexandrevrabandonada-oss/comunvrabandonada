export type SidewalkBasemapProvider = {
  id: "localSynthetic" | "realBasemapProvider";
  kind: "synthetic" | "remote";
  attribution: string;
  cachePolicy: string;
  style: {background: string; water?: string; styleUrl?: string};
  fallback: "neutral-grid-and-list" | "localSynthetic";
  enabled: boolean;
};

export const localSynthetic: SidewalkBasemapProvider = {
  id: "localSynthetic",
  kind: "synthetic",
  attribution: "Cartografia sintética local · não representa levantamento viário real",
  cachePolicy: "Somente arquivos locais versionados; nenhuma requisição de tiles.",
  style: {background: "#e8ece5", water: "#9fcbd3"},
  fallback: "neutral-grid-and-list",
  enabled: true,
};

export const realBasemapProvider: SidewalkBasemapProvider = {
  id: "realBasemapProvider",
  kind: "remote",
  attribution: "Fornecedor ainda não escolhido",
  cachePolicy: "Pendente de decisão de fornecedor, licença e privacidade.",
  style: {background: "#ecebe5"},
  fallback: "localSynthetic",
  enabled: false,
};

export function resolveSidewalkBasemapProvider(requested?: string) {
  if (requested === realBasemapProvider.id && realBasemapProvider.enabled) return realBasemapProvider;
  return localSynthetic;
}
