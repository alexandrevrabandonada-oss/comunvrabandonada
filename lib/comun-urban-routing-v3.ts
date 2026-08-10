import type {
  AdaptiveQuestion,
  RelataCategory,
  RelataInput,
  RoutingDecision,
} from "./comun-relata-contract";

export const COMUN_URBAN_ROUTING_VERSION =
  "relata-routing-v3-urban-incidents" as const;

export const FLOOD_ACTIVE_RISK_QUESTION =
  "A água está subindo ou entrando em casas agora?";
export const FLOOD_ACTIVE_RISK_ADAPTIVE_QUESTION: AdaptiveQuestion = {
  id: "flood_active_risk",
  prompt: FLOOD_ACTIVE_RISK_QUESTION,
  answerKey: "flood_active_risk",
  options: [
    { value: "sim", label: "Sim" },
    { value: "nao", label: "Não" },
    { value: "nao_sei", label: "Não sei" },
  ],
  blocking: false,
};

export const TREE_STATE_QUESTION = "A árvore ou o galho já caiu?";
export const TREE_STATE_ADAPTIVE_QUESTION: AdaptiveQuestion = {
  id: "tree_fall_state",
  prompt: TREE_STATE_QUESTION,
  answerKey: "tree_state",
  options: [
    { value: "caiu", label: "Já caiu" },
    { value: "em_pe", label: "Ainda está em pé" },
    { value: "nao_sei", label: "Não sei" },
  ],
  blocking: false,
};

type Confidence = RoutingDecision["confidence"];
export type UrbanCategoryCandidate = {
  category: RelataCategory;
  confidence: Confidence;
};
export type UrbanRoutingResult = {
  selectedCategory: RelataCategory;
  categoryCandidates: UrbanCategoryCandidate[];
  confidence: Confidence;
  urgency: RoutingDecision["urgency"];
  adaptiveQuestion: AdaptiveQuestion | null;
  requiresHumanReview: boolean;
  routingVersion: typeof COMUN_URBAN_ROUTING_VERSION;
  matchedSignals: string[];
  explanation: string;
  nextStep: string;
};

const SIGNALS = {
  flooding: [
    ["rua alagada", "flood.street_flooded"],
    ["rua esta alagada", "flood.street_flooded"],
    ["rua alagou", "flood.street_flooded"],
    ["rua esta alagando", "flood.street_flooding"],
    ["comecando a alagar", "flood.starting"],
    ["enchente", "flood.direct"],
    ["agua subindo", "flood.water_rising"],
    ["agua entrando", "flood.water_entering"],
    ["agua esta entrando", "flood.water_entering"],
    ["agua invadindo", "flood.water_entering"],
    ["correnteza na rua", "flood.current"],
    ["corrego transbordando", "flood.stream_overflow"],
    ["canal transbordando", "flood.channel_overflow"],
    ["rua debaixo d agua", "flood.street_submerged"],
    ["passagem tomada pela agua", "flood.passage_submerged"],
  ],
  drainage: [
    ["bueiro entupido", "drain.blocked_storm_drain"],
    ["bueiro esta entupido", "drain.blocked_storm_drain"],
    ["boca de lobo entupida", "drain.blocked_catch_basin"],
    ["boca de lobo bloqueada", "drain.blocked_catch_basin"],
    ["boca de lobo quebrada", "drain.broken_catch_basin"],
    ["tampa de bueiro quebrada", "drain.broken_cover"],
    ["tampa de bueiro ausente", "drain.missing_cover"],
    ["tampa de bueiro esta ausente", "drain.missing_cover"],
    ["sem tampa de bueiro", "drain.missing_cover"],
    ["canaleta obstruida", "drain.blocked_gutter"],
    ["canaleta esta obstruida", "drain.blocked_gutter"],
    ["manilha quebrada", "drain.broken_pipe"],
    ["drenagem sem funcionar", "drain.not_working"],
    ["ralo da rua entupido", "drain.blocked_street_drain"],
    ["agua parada recorrente", "drain.recurring_standing_water"],
    ["limpeza do corrego", "drain.watercourse_cleaning"],
    ["limpeza de corrego", "drain.watercourse_cleaning"],
    ["limpeza do canal", "drain.channel_cleaning"],
    ["limpeza de canal", "drain.channel_cleaning"],
  ],
  tree: [
    ["arvore caiu", "tree.fallen"],
    ["arvore caida", "tree.fallen"],
    ["galho caiu", "tree.branch_fallen"],
    ["galho caido", "tree.branch_fallen"],
    ["arvore inclinada", "tree.leaning"],
    ["parece que vai cair", "tree.may_fall"],
    ["risco de queda", "tree.fall_risk"],
    ["galho quebrado", "tree.broken_branch"],
    ["arvore bloqueando", "tree.blocking"],
    ["galho bloqueando", "tree.blocking"],
    ["arvore sobre o muro", "tree.on_structure"],
    ["arvore sobre muro", "tree.on_structure"],
    ["arvore sobre o telhado", "tree.on_structure"],
    ["arvore sobre telhado", "tree.on_structure"],
    ["galho encostando na fiacao", "tree.near_power_line"],
    ["arvore encostando na fiacao", "tree.near_power_line"],
  ],
} as const;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matched(value: string, entries: readonly (readonly [string, string])[]) {
  return entries
    .filter(([phrase]) => value.includes(phrase))
    .map(([, code]) => code);
}

function hasAny(value: string, phrases: readonly string[]) {
  return phrases.some((phrase) => value.includes(phrase));
}

function candidate(category: RelataCategory, confidence: Confidence) {
  return { category, confidence } satisfies UrbanCategoryCandidate;
}

function result(
  selectedCategory: RelataCategory,
  values: Omit<UrbanRoutingResult, "selectedCategory" | "routingVersion">,
): UrbanRoutingResult {
  return {
    selectedCategory,
    routingVersion: COMUN_URBAN_ROUTING_VERSION,
    ...values,
  };
}

export function routeUrbanIncidentV3(
  input: RelataInput,
): UrbanRoutingResult | null {
  const value = normalize(input.text);
  const floodAnswer = input.answers?.flood_active_risk;
  const treeAnswer = input.answers?.tree_state;
  const floodAbsent = hasAny(value, [
    "nao alagou",
    "nao esta alagada",
    "nao esta alagando",
    "sem alagamento",
    "sem enchente",
  ]);
  const drainageAbsent = hasAny(value, [
    "bueiro nao esta entupido",
    "bueiro nao esta bloqueado",
    "boca de lobo nao esta entupida",
    "drenagem esta funcionando",
  ]);
  const routinePruningWithoutRisk =
    hasAny(value, ["podar", "poda", "cortar a arvore", "corte da arvore"]) &&
    hasAny(value, ["sem risco", "nao ha risco", "nao tem risco"]);

  const floodSignals = floodAbsent ? [] : matched(value, SIGNALS.flooding);
  const drainageSignals = drainageAbsent ? [] : matched(value, SIGNALS.drainage);
  const treeSignals = routinePruningWithoutRisk ? [] : matched(value, SIGNALS.tree);

  if (floodSignals.length > 0) {
    const emergency =
      floodAnswer === "sim" ||
      hasAny(value, [
        "agua entrando em casa",
        "agua entrando nas casas",
        "agua esta entrando em casa",
        "agua esta entrando nas casas",
        "agua invadindo a casa",
        "agua invadindo as casas",
        "subindo rapidamente",
        "pessoa isolada",
        "pessoa presa",
        "correnteza",
        "risco imediato",
      ]);
    const urgent =
      emergency ||
      hasAny(value, [
        "agua esta subindo",
        "agua subindo",
        "via totalmente intransitavel",
        "rua totalmente intransitavel",
        "rua debaixo d agua",
      ]);
    const ambiguous =
      floodAnswer === undefined &&
      !emergency &&
      hasAny(value, ["comecando a alagar", "esta alagando"]);
    const candidates = [candidate("urban_flooding", emergency ? "high" : "medium")];
    if (drainageSignals.length > 0)
      candidates.push(candidate("stormwater_drainage", "high"));
    return result("urban_flooding", {
      categoryCandidates: candidates,
      confidence:
        floodAnswer === "nao_sei" ? "medium" : emergency ? "high" : "medium",
      urgency: emergency ? "emergency" : urgent ? "urgent" : "attention",
      adaptiveQuestion:
        ambiguous && floodAnswer === undefined
          ? FLOOD_ACTIVE_RISK_ADAPTIVE_QUESTION
          : null,
      requiresHumanReview: ambiguous || floodAnswer === "nao_sei",
      matchedSignals: [
        ...floodSignals,
        ...drainageSignals,
        ...(floodAnswer === "sim" ? ["person.confirmed_active_flood_risk"] : []),
      ],
      explanation: emergency
        ? "A descrição indica alagamento com risco imediato."
        : "A descrição indica alagamento ou enchente.",
      nextStep: emergency
        ? "Procure um local seguro e acione a Defesa Civil pelo canal de emergência. O COMUN não faz esse acionamento."
        : "O relato pode ser guardado agora; informar se a água sobe é opcional.",
    });
  }

  if (treeSignals.length > 0) {
    const fallen =
      treeAnswer === "caiu" ||
      hasAny(value, ["arvore caiu", "arvore caida", "galho caiu", "galho caido"]);
    const immediateRisk = hasAny(value, [
      "caindo agora",
      "atingiu uma pessoa",
      "atingiu pessoa",
      "atingiu um veiculo",
      "atingiu veiculo",
      "bloqueio total",
      "bloqueando toda",
      "sobre residencia",
      "sobre a casa",
      "galho grande suspenso",
      "risco imediato",
      "parece que vai cair",
      "tempestade",
    ]);
    const ambiguous =
      treeAnswer === undefined &&
      !fallen &&
      !hasAny(value, ["arvore inclinada", "parece que vai cair", "risco de queda"]);
    return result("tree_hazard", {
      categoryCandidates: [candidate("tree_hazard", "high")],
      confidence: treeAnswer === "nao_sei" ? "medium" : "high",
      urgency: immediateRisk ? "urgent" : fallen ? "attention" : "attention",
      adaptiveQuestion:
        ambiguous && treeAnswer === undefined ? TREE_STATE_ADAPTIVE_QUESTION : null,
      requiresHumanReview: ambiguous || treeAnswer === "nao_sei",
      matchedSignals: treeSignals,
      explanation: immediateRisk
        ? "A descrição indica árvore ou galho com risco imediato."
        : "A descrição indica árvore ou galho caído ou com risco de queda.",
      nextStep: immediateRisk
        ? "Mantenha distância e procure o serviço de emergência. O COMUN não faz esse acionamento."
        : "O relato pode ser guardado agora; o estado da árvore pode ser completado depois.",
    });
  }

  if (drainageSignals.length > 0) {
    return result("stormwater_drainage", {
      categoryCandidates: [candidate("stormwater_drainage", "high")],
      confidence: "high",
      urgency: "attention",
      adaptiveQuestion: null,
      requiresHumanReview: false,
      matchedSignals: drainageSignals,
      explanation: "A descrição indica problema de drenagem, bueiro ou canal.",
      nextStep: "O relato pode ser guardado agora.",
    });
  }

  return null;
}

export function hasTreeHazardSignal(text: string) {
  const value = normalize(text);
  return matched(value, SIGNALS.tree).length > 0;
}
