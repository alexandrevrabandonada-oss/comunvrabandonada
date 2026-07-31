export type CivicIntentContext = {
  pautaSlug?: string;
  territorySlug?: string;
  authenticated?: boolean;
};
export type CivicIntentDefinition = {
  id: string;
  label: string;
  examples: string[];
  allowedAction: "navigate" | "prefill_filters" | "open_help";
  routeResolver: (context: CivicIntentContext) => string;
  requiresAuthentication: boolean;
  minimumConfidence: number;
};

export type CivicIntentMatch = {
  intentId: string;
  label: string;
  route: string;
  action: CivicIntentDefinition["allowedAction"];
  confidenceBand: "low" | "medium" | "high";
  requiresAuthentication: boolean;
  requiresConfirmation: boolean;
};

const intents: CivicIntentDefinition[] = [
  {
    id: "submit_sidewalk_report",
    label: "Registrar problema de calçada",
    examples: [
      "registrar calçada",
      "relatar barreira na calçada",
      "calçada quebrada",
    ],
    allowedAction: "navigate",
    routeResolver: () => "/comun/mapa/contribuir",
    requiresAuthentication: false,
    minimumConfidence: 0.9,
  },
  {
    id: "follow_participation",
    label: "Acompanhar minha participação",
    examples: ["acompanhar participação", "ver minhas contribuições"],
    allowedAction: "navigate",
    routeResolver: () => "/comun/minha-participacao",
    requiresAuthentication: true,
    minimumConfidence: 0.9,
  },
  {
    id: "contribute_pauta",
    label: "Contribuir com uma pauta",
    examples: ["contribuir com pauta", "participar da pauta"],
    allowedAction: "navigate",
    routeResolver: (c) =>
      c.pautaSlug
        ? `/comun/pautas/${encodeURIComponent(c.pautaSlug)}#participar`
        : "/comun/pautas",
    requiresAuthentication: false,
    minimumConfidence: 0.9,
  },
  {
    id: "find_task",
    label: "Encontrar uma tarefa",
    examples: ["encontrar tarefa", "assumir uma tarefa"],
    allowedAction: "navigate",
    routeResolver: () => "/comun/minha-participacao?secao=tarefas",
    requiresAuthentication: true,
    minimumConfidence: 0.9,
  },
  {
    id: "join_community",
    label: "Solicitar entrada em comunidade",
    examples: ["entrar em comunidade", "solicitar entrada"],
    allowedAction: "navigate",
    routeResolver: () => "/comun/comunidades",
    requiresAuthentication: true,
    minimumConfidence: 0.9,
  },
  {
    id: "submit_archive_photo",
    label: "Enviar fotografia histórica",
    examples: ["enviar foto histórica", "fotografia para o acervo"],
    allowedAction: "navigate",
    routeResolver: () => "/comun/acervo/contribuir",
    requiresAuthentication: false,
    minimumConfidence: 0.9,
  },
  {
    id: "propose_radio",
    label: "Propor conteúdo para a Rádio",
    examples: ["propor programa de rádio", "enviar áudio para rádio"],
    allowedAction: "navigate",
    routeResolver: () => "/comun/radio/contribuir",
    requiresAuthentication: false,
    minimumConfidence: 0.9,
  },
  {
    id: "submit_artwork",
    label: "Enviar obra territorial",
    examples: ["enviar obra", "propor arte territorial"],
    allowedAction: "navigate",
    routeResolver: () => "/comun/acervo/arte/contribuir",
    requiresAuthentication: false,
    minimumConfidence: 0.9,
  },
  {
    id: "register_official_response",
    label: "Registrar resposta institucional",
    examples: [
      "registrar resposta institucional",
      "adicionar resposta oficial",
    ],
    allowedAction: "navigate",
    routeResolver: () => "/comun/admin/protocolos-oficiais",
    requiresAuthentication: true,
    minimumConfidence: 0.95,
  },
  {
    id: "find_result",
    label: "Encontrar resultado",
    examples: ["encontrar resultado", "o que foi resolvido"],
    allowedAction: "navigate",
    routeResolver: () => "/comun/resultados",
    requiresAuthentication: false,
    minimumConfidence: 0.9,
  },
  {
    id: "request_correction",
    label: "Pedir correção",
    examples: ["pedir correção", "corrigir informação"],
    allowedAction: "open_help",
    routeResolver: () => "/comun/acervo/direitos-e-remocao",
    requiresAuthentication: false,
    minimumConfidence: 0.9,
  },
  {
    id: "request_withdrawal",
    label: "Pedir retirada",
    examples: ["pedir retirada", "remover meu conteúdo"],
    allowedAction: "open_help",
    routeResolver: () => "/comun/acervo/direitos-e-remocao",
    requiresAuthentication: false,
    minimumConfidence: 0.9,
  },
  {
    id: "find_help",
    label: "Encontrar ajuda",
    examples: ["preciso de ajuda", "como usar o comun"],
    allowedAction: "open_help",
    routeResolver: () => "/comun/participar",
    requiresAuthentication: false,
    minimumConfidence: 0.85,
  },
];

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function resolveCivicIntents(
  query: string,
  context: CivicIntentContext = {},
): CivicIntentMatch[] {
  const normalized = normalize(query).slice(0, 120);
  if (
    normalized.length < 3 ||
    /https?:|javascript:|data:|\.\.|[<>]/i.test(query)
  )
    return [];
  const matches = intents.flatMap((definition) => {
    const exact = definition.examples.some(
      (example) => normalize(example) === normalized,
    );
    const contained = definition.examples.some(
      (example) =>
        normalized.includes(normalize(example)) ||
        normalize(example).includes(normalized),
    );
    if (!exact && !contained) return [];
    const confidence = exact ? 1 : 0.91;
    if (confidence < definition.minimumConfidence) return [];
    const route = definition.routeResolver(context);
    if (!route.startsWith("/comun") || route.includes("://")) return [];
    return [
      {
        intentId: definition.id,
        label: definition.label,
        route,
        action: definition.allowedAction,
        confidenceBand: (exact ? "high" : "medium") as "high" | "medium",
        requiresAuthentication: definition.requiresAuthentication,
        requiresConfirmation:
          !exact ||
          (definition.requiresAuthentication && !context.authenticated),
      },
    ];
  });
  return matches.slice(0, 3);
}

export const civicIntentCatalog = intents;
