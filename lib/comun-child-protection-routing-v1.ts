import type {
  AdaptiveQuestion,
  ChildProtectionIssueType,
  RelataInput,
  RoutingDecision,
} from "./comun-relata-contract";

export const COMUN_CHILD_PROTECTION_ROUTING_VERSION =
  "comun-child-protection-routing-v1" as const;

export const CHILD_IMMEDIATE_DANGER_QUESTION: AdaptiveQuestion = {
  id: "child_immediate_danger",
  prompt: "Há perigo imediato agora?",
  answerKey: "child_immediate_danger",
  options: [
    { value: "sim", label: "Sim" },
    { value: "nao", label: "Não" },
    { value: "nao_sei", label: "Não sei" },
  ],
  blocking: false,
};

type Confidence = RoutingDecision["confidence"];

export type ChildProtectionRoutingResult = {
  selectedCategory: "child_protection";
  confidence: Confidence;
  urgency: RoutingDecision["urgency"];
  childProtectionIssueType: ChildProtectionIssueType;
  immediateDanger: boolean | null;
  requiresHumanReview: true;
  privacyClass: "high_risk";
  routingVersion: typeof COMUN_CHILD_PROTECTION_ROUTING_VERSION;
  adaptiveQuestion: AdaptiveQuestion | null;
  matchedSignals: string[];
  explanation: string;
  nextStep: string;
};

const ISSUE_SIGNALS: Record<
  ChildProtectionIssueType,
  readonly (readonly [string, string])[]
> = {
  immediate_danger: [
    ["perigo imediato", "child_protection.immediate_danger"],
    ["risco imediato", "child_protection.immediate_danger"],
    ["em perigo agora", "child_protection.immediate_danger"],
    ["precisa de ajuda agora", "child_protection.immediate_help"],
  ],
  violence_or_abuse_concern: [
    ["violencia contra uma crianca", "child_protection.violence_concern"],
    ["violencia contra um adolescente", "child_protection.violence_concern"],
    ["crianca foi agredida", "child_protection.aggression_concern"],
    ["adolescente foi agredido", "child_protection.aggression_concern"],
    ["suspeita de abuso", "child_protection.abuse_concern"],
  ],
  neglect_or_abandonment_concern: [
    ["negligencia grave", "child_protection.neglect_concern"],
    ["abandono grave", "child_protection.abandonment_concern"],
    ["crianca abandonada", "child_protection.abandonment_concern"],
    ["adolescente abandonado", "child_protection.abandonment_concern"],
  ],
  exploitation_or_rights_violation: [
    ["exploracao de uma crianca", "child_protection.exploitation_concern"],
    ["exploracao de crianca", "child_protection.exploitation_concern"],
    ["exploracao de adolescente", "child_protection.exploitation_concern"],
    [
      "violacao grave dos direitos de uma crianca",
      "child_protection.rights_violation_concern",
    ],
    [
      "violacao grave dos direitos de um adolescente",
      "child_protection.rights_violation_concern",
    ],
  ],
  institutional_protection_failure: [
    [
      "instituicao colocando uma crianca em risco",
      "child_protection.institutional_failure",
    ],
    [
      "escola colocando uma crianca em risco",
      "child_protection.institutional_failure",
    ],
    ["falha grave de protecao", "child_protection.institutional_failure"],
  ],
  other_child_protection: [
    [
      "situacao grave de protecao envolvendo uma crianca",
      "child_protection.serious_protection_context",
    ],
    [
      "situacao seria de protecao envolvendo uma crianca",
      "child_protection.serious_protection_context",
    ],
    [
      "situacao grave de protecao envolvendo um adolescente",
      "child_protection.serious_protection_context",
    ],
    [
      "possivel violacao de direitos de uma crianca",
      "child_protection.rights_violation_concern",
    ],
  ],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signalsFor(value: string, type: ChildProtectionIssueType) {
  if (
    type === "immediate_danger" &&
    [
      "sem perigo imediato",
      "sem indicacao de perigo imediato",
      "nao ha perigo imediato",
      "nao esta em perigo agora",
    ].some((phrase) => value.includes(phrase))
  )
    return [];
  return ISSUE_SIGNALS[type]
    .filter(([phrase]) => value.includes(phrase))
    .map(([, signal]) => signal);
}

export function routeChildProtectionV1(
  input: RelataInput,
): ChildProtectionRoutingResult | null {
  const value = normalize(input.text);
  if (!value) return null;

  const ranked = (Object.keys(ISSUE_SIGNALS) as ChildProtectionIssueType[])
    .map((type) => ({ type, signals: signalsFor(value, type) }))
    .filter((entry) => entry.signals.length > 0)
    .sort((a, b) => b.signals.length - a.signals.length);
  const selected = ranked[0];
  if (!selected) return null;

  const answer = input.answers?.child_immediate_danger;
  const evidenceImmediate = signalsFor(value, "immediate_danger").length > 0;
  const immediateDanger =
    answer === "sim"
      ? true
      : answer === "nao"
        ? false
        : evidenceImmediate
          ? true
          : null;
  const issueType = immediateDanger ? "immediate_danger" : selected.type;

  return {
    selectedCategory: "child_protection",
    confidence: selected.signals.length > 0 ? "high" : "medium",
    urgency: immediateDanger ? "emergency" : "urgent",
    childProtectionIssueType: issueType,
    immediateDanger,
    requiresHumanReview: true,
    privacyClass: "high_risk",
    routingVersion: COMUN_CHILD_PROTECTION_ROUTING_VERSION,
    adaptiveQuestion:
      answer || evidenceImmediate ? null : CHILD_IMMEDIATE_DANGER_QUESTION,
    matchedSignals: [
      ...new Set([
        ...ranked.flatMap((entry) => entry.signals),
        ...(answer ? ["person.answered_child_immediate_danger"] : []),
      ]),
    ],
    explanation:
      "A descrição indica uma possível situação de proteção de criança ou adolescente.",
    nextStep: immediateDanger
      ? "Procure ajuda de emergência e mantenha-se em segurança. O COMUN não acionou nenhum serviço."
      : "Guarde com proteção reforçada. Canais oficiais estarão disponíveis apenas para consulta.",
  };
}
