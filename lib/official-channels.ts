export type OfficialChannel = {
  id: string;
  name: string;
  agency: string;
  url: string;
  instruction: string;
};

export const officialChannels: OfficialChannel[] = [
  {
    id: "ouvidoria-municipal",
    name: "Prefeitura / Ouvidoria municipal",
    agency: "Prefeitura municipal",
    url: "https://www.voltaredonda.rj.gov.br/",
    instruction: "Abra o canal oficial da Prefeitura e cole o texto gerado. Guarde o numero oficial informado pelo atendimento.",
  },
  {
    id: "fala-br",
    name: "Fala.BR",
    agency: "Plataforma federal Fala.BR",
    url: "https://falabr.cgu.gov.br/",
    instruction: "Use quando o assunto couber em orgao federal ou quando a orientacao oficial encaminhar para a plataforma.",
  },
];

export function getOfficialChannel(id?: string | null) {
  return officialChannels.find((channel) => channel.id === id) ?? officialChannels[0];
}
