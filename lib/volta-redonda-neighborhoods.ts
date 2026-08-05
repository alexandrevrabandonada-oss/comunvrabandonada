export type NeighborhoodOption = {
  value: string;
  label: string;
  aliases?: string[];
};

/**
 * Snapshot textual do cadastro público de bairros de Volta Redonda.
 *
 * A geometria oficial permanece fora do onboarding: este catálogo serve
 * apenas para seleção territorial ampla e pode ser atualizado sem alterar
 * coordenadas privadas ou a localização de relatos.
 */
export const VOLTA_REDONDA_NEIGHBORHOODS: readonly NeighborhoodOption[] = [
  "Água Limpa", "Aero Clube", "Açude", "Aterrado", "Barreira Cravo",
  "Bela Vista", "Belmonte", "Belo Horizonte", "Brasilândia", "Candelária",
  "Casa de Pedra", "Centro", "Conforto", "Duzentos e Quarenta e Nove",
  "Dom Bosco", "Eucaliptal", "Jardim Amália", "Jardim Belmonte",
  "Jardim Belvedere", "Jardim Europa", "Jardim Paraíba",
  "Jardim Padre Josimo Tavares", "Jardim Suíça", "Laranjal", "Minerlândia",
  "Monte Castelo", "Niterói", "Nossa Senhora das Graças", "Pinto da Serra",
  "Ponte Alta", "Retiro", "Roma", "Rústico", "Santa Cruz", "Santa Cruz II",
  "Santa Inês", "Santa Rita de Cássia", "Santa Rita do Zarur", "São Cristóvão",
  "São João", "São João Batista", "São Lucas", "São Luiz", "São Geraldo",
  "Sessenta", "Siderlândia", "Siderópolis", "Santo Agostinho", "Três Poços",
  "Vila Americana", "Vila Brasília", "Vila Mury", "Vila Rica", "Vila Santa Cecília",
  "Vila São Geraldo", "Voldac",
].map((label) => ({ value: label, label }));

export const VOLTA_REDONDA_NEIGHBORHOOD_SOURCE = {
  sourceUrl:
    "https://www2.voltaredonda.rj.gov.br/smp/index.php?catid=10&id=15&option=com_content&view=article",
  registerUrl:
    "https://www2.voltaredonda.rj.gov.br/ippu/mod/informacoes/logradouros.php",
  snapshotVersion: "2026-08-04-textual-preliminary",
  status: "official_public_snapshot_pending_geometry_validation",
} as const;
