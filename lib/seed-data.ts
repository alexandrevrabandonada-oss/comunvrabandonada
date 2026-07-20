import type { Community, Dossier, Issue } from "@/lib/types";

export const communities: Community[] = [
  {
    slug: "trabalho",
    name: "Trabalho e Burnout",
    shortDescription: "Relatos sobre adoecimento no trabalho, assedio, atraso de direitos, terceirizacao, pressao, jornada abusiva e risco.",
    fullDescription: "Espaco para organizar relatos de trabalhadores e trabalhadoras sobre pressao psicologica, adoecimento, assedio, atraso de direitos e riscos no trabalho em Volta Redonda e regiao.",
    mainCta: "Relatar situacao de trabalho",
    icon: "TB",
    accent: "yellow",
  },
  {
    slug: "escolas",
    name: "Escolas e Educacao",
    shortDescription: "Relatos de pais, estudantes e trabalhadores sobre estrutura, falta de profissionais, merenda, transporte, calor e problemas nas escolas.",
    fullDescription: "Comunidade para reunir sinais das escolas, creches e equipamentos de educacao: estrutura, profissionais, merenda, transporte, calor e condicoes de trabalho.",
    mainCta: "Relatar problema na educacao",
    icon: "EE",
    accent: "rust",
  },
  {
    slug: "saude",
    name: "Saude Publica",
    shortDescription: "Relatos sobre fila, cirurgia, exames, UBS, hospitais, falta de profissionais, terceirizacao e atendimento.",
    fullDescription: "Espaco para transformar experiencias dispersas com filas, exames, cirurgias, UBS, hospitais e atendimento em pautas acompanhaveis.",
    mainCta: "Relatar situacao da saude",
    icon: "SP",
    accent: "green",
  },
  {
    slug: "meio-ambiente",
    name: "Meio Ambiente e Poluicao",
    shortDescription: "Relatos sobre po preto, fumaca, cheiro forte, escoria, agua, barulho, queimadas e impactos ambientais.",
    fullDescription: "Comunidade para documentar percepcoes, recorrencias e impactos ambientais sem expor dados pessoais ou transformar relato em acusacao sem curadoria.",
    mainCta: "Relatar impacto ambiental",
    icon: "MA",
    accent: "concrete",
  },
  {
    slug: "cidade",
    name: "Cidade Abandonada",
    shortDescription: "DEMONSTRACAO LOCAL: sinais sinteticos sobre calcadas e servicos urbanos, sem dados ou atividade de campo reais.",
    fullDescription: "Candidata local para ensaiar o ciclo entre territorio, pauta, contribuicao, resultado e memoria com conteudo inteiramente sintetico.",
    mainCta: "Relatar problema no bairro",
    icon: "CA",
    accent: "yellow",
  },
];

export const issues: Issue[] = [
  {
    slug: "trabalho-burnout-volta-redonda",
    communitySlug: "trabalho",
    title: "Trabalho e Burnout em Volta Redonda",
    summary: "Espaco para reunir relatos sobre adoecimento no trabalho, pressao psicologica, assedio, jornada abusiva, terceirizacao e atraso de direitos em Volta Redonda e regiao.",
    status: "receiving_reports",
    timeline: ["Recebendo relatos", "Agrupando padroes recorrentes"],
    usefulMaterials: ["Guarde registros com seguranca", "Evite publicar dados pessoais de terceiros"],
    nextSteps: "Reunir relatos sanitizados e identificar padroes por setor e territorio.",
  },
  {
    slug: "falta-profissionais-escolas",
    communitySlug: "escolas",
    title: "Falta de profissionais nas escolas",
    summary: "Pauta para reunir relatos sobre falta de professores, inspetores, apoio, merenda, transporte e estrutura nas escolas.",
    status: "receiving_reports",
    timeline: ["Pauta aberta para relatos"],
    usefulMaterials: ["Informe bairro, escola aproximada e periodo quando for seguro"],
    nextSteps: "Organizar recorrencias por bairro e tipo de problema.",
  },
  {
    slug: "fila-cirurgias-exames",
    communitySlug: "saude",
    title: "Fila de cirurgias e exames",
    summary: "Relatos sobre espera, cancelamentos, falta de retorno, exames, cirurgias e consultas na rede publica.",
    status: "receiving_reports",
    timeline: ["Recebendo casos"],
    usefulMaterials: ["Nao envie numero de documentos ou prontuario pelo formulario"],
    nextSteps: "Separar relatos por tipo de atendimento e tempo de espera.",
  },
  {
    slug: "po-preto-fumaca-cheiro-forte",
    communitySlug: "meio-ambiente",
    title: "Po preto, fumaca e cheiro forte",
    summary: "Registro comunitario de recorrencias percebidas envolvendo po preto, fumaca, cheiro forte, barulho e impactos ambientais.",
    status: "monitoring",
    timeline: ["Monitoramento comunitario iniciado"],
    usefulMaterials: ["Anote data, horario aproximado e bairro"],
    nextSteps: "Cruzar relatos por periodo, bairro e tipo de ocorrencia.",
  },
  {
    slug: "buracos-calcadas-abandono-bairros",
    communitySlug: "cidade",
    title: "Buracos, calcadas e abandono dos bairros",
    summary: "Pauta sobre buracos, calcadas ruins, iluminacao, lixo, enchentes, transporte e obras paradas.",
    status: "receiving_reports",
    timeline: ["Pauta aberta"],
    usefulMaterials: ["Descreva o local de forma aproximada, sem endereco completo"],
    nextSteps: "Montar mapa-lista textual por bairro, sem precisao geografica.",
  },
];

export const dossiers: Dossier[] = [
  {
    slug: "burnout-e-pressao-no-trabalho",
    issueSlug: "trabalho-burnout-volta-redonda",
    title: "Mini-dossie: burnout e pressao no trabalho",
    executiveSummary: "Primeiro esqueleto de dossie para organizar relatos sanitizados sobre adoecimento, pressao e jornada abusiva.",
    contextText: "Este dossie comeca como estrutura de memoria coletiva. Ele so deve usar relatos sanitizados e padroes, nunca contato privado ou relato bruto.",
    timeline: [
      "Pauta aberta para relatos sobre adoecimento no trabalho",
      "Primeiros relatos sanitizados publicados na pauta de Trabalho e Burnout",
      "Padroes iniciais reunidos para acompanhamento publico",
    ],
    patterns: ["Pressao por metas", "Medo de retalhacao", "Adoecimento emocional"],
    relatedReports: [
      {
        protocol: "COMUN-20260525-979842",
        title: "Pressao e atraso de direitos em fabrica",
        publicText: "Relato aponta pressao no ambiente de trabalho e possivel atraso de direitos. A pessoa preferiu nao se identificar. O caso segue em acompanhamento.",
      },
    ],
    sources: [
      "Relatos sanitizados publicados na pauta Trabalho e Burnout em Volta Redonda",
      "Memorias de trabalhadores e trabalhadoras enviadas ao COMUN",
      "Registros guardados de forma interna pela curadoria",
    ],
    forwardingLog: [
      "Organizar recorrencias por setor, turno e tipo de adoecimento",
      "Avaliar necessidade de transformar o material em pauta recorrente e post publico",
    ],
    openQuestions: [
      "Quais setores concentram mais relatos de pressao e burnout?",
      "Ha recorrencia de atraso de direitos em empresas terceirizadas?",
      "Os relatos apontam medo de denunciar por risco de retaliacao?",
    ],
    status: "published",
  },
];

export function getCommunity(slug: string) {
  return communities.find((community) => community.slug === slug);
}

export function getIssue(slug: string) {
  return issues.find((issue) => issue.slug === slug);
}

export function getDossier(slug: string) {
  return dossiers.find((dossier) => dossier.slug === slug);
}
