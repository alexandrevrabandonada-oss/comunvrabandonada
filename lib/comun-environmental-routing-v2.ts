import type {
  AdaptiveQuestion,
  RelataCategory,
  RelataInput,
  RoutingDecision,
} from "./comun-relata-contract";

export const COMUN_ENVIRONMENTAL_ROUTING_VERSION =
  "relata-routing-v2-environmental" as const;
export const SMOKE_ACTIVE_QUESTION = "Você consegue ver chamas agora?";
export const SMOKE_ACTIVE_ADAPTIVE_QUESTION: AdaptiveQuestion = {
  id: "smoke_active_state",
  prompt: SMOKE_ACTIVE_QUESTION,
  answerKey: "smoke_active",
  options: [
    { value: "sim", label: "Sim, há chamas" },
    { value: "nao", label: "Não vejo chamas" },
    { value: "nao_sei", label: "Não sei" },
  ],
  blocking: false,
};

type Confidence = RoutingDecision["confidence"];
export type EnvironmentalCategoryCandidate = {
  category: RelataCategory;
  confidence: Confidence;
};
export type EnvironmentalRoutingResult = {
  selectedCategory: RelataCategory;
  categoryCandidates: EnvironmentalCategoryCandidate[];
  confidence: Confidence;
  urgency: RoutingDecision["urgency"];
  adaptiveQuestion: AdaptiveQuestion | null;
  requiresHumanReview: boolean;
  routingVersion: typeof COMUN_ENVIRONMENTAL_ROUTING_VERSION;
  matchedSignals: string[];
  explanation: string;
  nextStep: string;
};

const SIGNALS = {
  activeFire: [
    ["pegando fogo", "fire.active_burning"],
    ["com chamas", "fire.visible_flames"],
    ["queimada ativa", "fire.active_burn"],
    ["incendio", "fire.incident"],
    ["fogo no mato", "fire.vegetation"],
    ["fogo no morro", "fire.hillside"],
  ],
  smoke: [
    ["fumaca", "trace.smoke"],
    ["cheiro de queimado", "trace.burnt_odor"],
    ["fuligem", "trace.soot"],
    ["cinza", "trace.ash"],
    ["vestigio", "trace.evidence"],
  ],
  pollution: [
    ["po preto", "pollution.black_dust"],
    ["poeira", "pollution.dust"],
    ["cheiro quimico", "pollution.chemical_odor"],
    ["odor ambiental", "pollution.environmental_odor"],
    ["odor forte", "pollution.strong_odor"],
    ["emissao", "pollution.emission"],
    ["fumaca industrial", "pollution.industrial_smoke"],
    ["agua contaminada", "pollution.contaminated_water"],
    ["descarte no rio", "pollution.river_discharge"],
    ["rio poluido", "pollution.polluted_river"],
    ["poluicao", "pollution.direct"],
    ["esgoto", "pollution.sewage"],
  ],
  waste: [
    ["lixo", "waste.trash"],
    ["entulho", "waste.debris"],
    ["descarte irregular", "waste.illegal_dumping"],
    ["moveis abandonados", "waste.abandoned_furniture"],
    ["resto de obra", "waste.construction_debris"],
    ["restos de obra", "waste.construction_debris"],
    ["acumulo de residuos", "waste.accumulated_residue"],
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
  return { category, confidence } satisfies EnvironmentalCategoryCandidate;
}
function result(
  selectedCategory: RelataCategory,
  values: Omit<EnvironmentalRoutingResult, "selectedCategory" | "routingVersion">,
): EnvironmentalRoutingResult {
  return {
    selectedCategory,
    routingVersion: COMUN_ENVIRONMENTAL_ROUTING_VERSION,
    ...values,
  };
}

export function routeEnvironmentalIncidentV2(
  input: RelataInput,
): EnvironmentalRoutingResult | null {
  const value = normalize(input.text);
  const answer = input.answers?.smoke_active;
  const activeSignals = matched(value, SIGNALS.activeFire);
  const smokeSignals = matched(value, SIGNALS.smoke);
  const pollutionSignals = matched(value, SIGNALS.pollution);
  const wasteSignals = matched(value, SIGNALS.waste);
  const noSmokeNorFire = hasAny(value, [
    "nao tem fumaca nem fogo",
    "nao ha fumaca nem fogo",
    "sem fumaca nem fogo",
  ]);
  const fireExplicitlyInactive = noSmokeNorFire || hasAny(value, [
    "sem fogo ativo",
    "sem fogo",
    "sem chamas",
    "nao ha fogo",
    "nao tem fogo",
    "nao vejo chamas",
    "fogo ja apagou",
    "fogo apagou",
    "queimou e apagou",
  ]);
  const smokeExplicitlyAbsent = noSmokeNorFire || hasAny(value, [
    "sem fumaca",
    "nao ha fumaca",
    "nao tem fumaca",
  ]);

  if (answer === "sim") {
    return result("active_fire", {
      categoryCandidates: [candidate("active_fire", "high")],
      confidence: "high",
      urgency: "emergency",
      adaptiveQuestion: null,
      requiresHumanReview: true,
      matchedSignals: ["person.confirmed_visible_flames", ...activeSignals],
      explanation: "A pessoa confirmou que há chamas agora.",
      nextStep:
        "Mantenha distância e procure imediatamente o serviço de emergência local.",
    });
  }
  if (activeSignals.length > 0 && !fireExplicitlyInactive) {
    const candidates = [candidate("active_fire", "high")];
    if (wasteSignals.length > 0)
      candidates.push(candidate("waste_or_debris", "medium"));
    return result("active_fire", {
      categoryCandidates: candidates,
      confidence: "high",
      urgency: "emergency",
      adaptiveQuestion: null,
      requiresHumanReview: true,
      matchedSignals: [...activeSignals, ...wasteSignals],
      explanation: "A descrição indica fogo ou incêndio ativo.",
      nextStep:
        "Mantenha distância e procure imediatamente o serviço de emergência local.",
    });
  }
  if (pollutionSignals.length > 0) {
    return result("environmental_pollution", {
      categoryCandidates: [candidate("environmental_pollution", "high")],
      confidence: "high",
      urgency: "attention",
      adaptiveQuestion: null,
      requiresHumanReview: false,
      matchedSignals: pollutionSignals,
      explanation: "A descrição aponta para poluição ou emissão percebida.",
      nextStep:
        "O relato pode ser guardado sem atribuir responsabilidade a uma empresa.",
    });
  }
  if (smokeSignals.length > 0 && !smokeExplicitlyAbsent) {
    const answered = answer === "nao" || answer === "nao_sei";
    const inactive = fireExplicitlyInactive || answer === "nao";
    return result("smoke_or_environmental_trace", {
      categoryCandidates: [
        candidate(
          "smoke_or_environmental_trace",
          inactive ? "high" : "medium",
        ),
        ...(!inactive ? [candidate("active_fire", "low")] : []),
      ],
      confidence: inactive ? "high" : answer === "nao_sei" ? "low" : "medium",
      urgency: "attention",
      adaptiveQuestion: inactive || answered ? null : SMOKE_ACTIVE_ADAPTIVE_QUESTION,
      requiresHumanReview: !inactive,
      matchedSignals: [
        ...smokeSignals,
        ...(fireExplicitlyInactive ? ["fire.explicitly_inactive"] : []),
        ...(answer === "nao_sei" ? ["person.flames_unknown"] : []),
      ],
      explanation: inactive
        ? "Há fumaça ou vestígio e não há indicação de chamas agora."
        : "Há fumaça ou vestígio sem confirmação de chamas.",
      nextStep:
        "Você pode informar se vê chamas, mas o relato já pode ser guardado.",
    });
  }
  if (
    smokeExplicitlyAbsent &&
    fireExplicitlyInactive &&
    (value.includes("fumaca") || value.includes("fogo"))
  ) {
    return result("other", {
      categoryCandidates: [candidate("other", "low")],
      confidence: "low",
      urgency: "attention",
      adaptiveQuestion: null,
      requiresHumanReview: true,
      matchedSignals: ["fire.explicitly_inactive", "trace.explicitly_absent"],
      explanation: "O texto informa que não há fogo nem fumaça agora.",
      nextStep: "O relato pode ser guardado e receber mais contexto depois.",
    });
  }
  if (wasteSignals.length > 0) {
    const sidewalkBlocked =
      hasAny(value, ["calcada", "passagem", "acesso"]) &&
      hasAny(value, ["bloqueada", "bloqueado", "impede passar", "sem passagem"]);
    if (sidewalkBlocked) return null;
    return result("waste_or_debris", {
      categoryCandidates: [candidate("waste_or_debris", "high")],
      confidence: "high",
      urgency: "attention",
      adaptiveQuestion: null,
      requiresHumanReview: false,
      matchedSignals: wasteSignals,
      explanation: "A descrição aponta para lixo, entulho ou descarte irregular.",
      nextStep: "O relato pode ser guardado agora.",
    });
  }
  return null;
}
