import type {
  AdaptiveQuestion,
  HealthIssueType,
  PrivacyClass,
  RelataInput,
  RoutingDecision,
} from "./comun-relata-contract";

export const COMUN_HEALTH_SERVICE_ROUTING_VERSION =
  "comun-health-service-routing-v1" as const;

export const HEALTH_ISSUE_TYPE_LABELS: Record<HealthIssueType, string> = {
  access_or_waiting: "Atendimento ou demora",
  exam_or_procedure: "Exame, procedimento ou cirurgia",
  medicine_or_supply: "Medicamento ou insumo",
  staff_or_service_availability: "Falta de profissional ou serviço",
  facility_or_accessibility: "Estrutura ou acessibilidade",
  care_conduct: "Conduta no atendimento",
  transfer_or_health_transport: "Transferência ou transporte sanitário",
  information_or_followup: "Informação ou acompanhamento",
  other_health_service: "Outro problema no SUS",
};

export const HEALTH_ISSUE_TYPE_QUESTION: AdaptiveQuestion = {
  id: "health_issue_type",
  prompt: "Qual é o principal problema?",
  answerKey: "health_issue_type",
  options: [
    { value: "access_or_waiting", label: "Atendimento ou demora" },
    { value: "exam_or_procedure", label: "Exame ou procedimento" },
    { value: "medicine_or_supply", label: "Medicamento" },
    {
      value: "staff_or_service_availability",
      label: "Falta de profissional",
    },
    { value: "facility_or_accessibility", label: "Estrutura ou acessibilidade" },
    { value: "care_conduct", label: "Conduta no atendimento" },
    {
      value: "transfer_or_health_transport",
      label: "Transferência ou transporte",
    },
    { value: "other_health_service", label: "Outro" },
  ],
  blocking: false,
};

type Confidence = RoutingDecision["confidence"];

export type HealthServiceRoutingResult = {
  selectedCategory: "public_health";
  healthIssueType: HealthIssueType;
  confidence: Confidence;
  urgency: RoutingDecision["urgency"];
  adaptiveQuestion: AdaptiveQuestion | null;
  requiresHumanReview: boolean;
  privacyClass: Extract<PrivacyClass, "sensitive" | "high_risk">;
  routingVersion: typeof COMUN_HEALTH_SERVICE_ROUTING_VERSION;
  matchedSignals: string[];
  explanation: string;
  nextStep: string;
};

const HEALTH_CONTEXT = [
  "sus",
  "ubs",
  "upa",
  "posto de saude",
  "unidade de saude",
  "hospital publico",
  "hospital municipal",
  "hospital estadual",
  "farmacia da unidade",
] as const;

const ISSUE_SIGNALS: Record<HealthIssueType, readonly (readonly [string, string])[]> = {
  access_or_waiting: [
    ["nao fui atendido", "health.access.not_attended"],
    ["horas esperando", "health.access.long_wait"],
    ["fila", "health.access.queue"],
    ["consulta atrasada", "health.access.delayed_appointment"],
    ["sem vaga", "health.access.no_slot"],
    ["vaga", "health.access.slot"],
    ["retorno nao marcado", "health.access.followup_not_booked"],
  ],
  exam_or_procedure: [
    ["exame", "health.procedure.exam"],
    ["cirurgia", "health.procedure.surgery"],
    ["procedimento", "health.procedure.generic"],
    ["resultado nao liberado", "health.procedure.result_delayed"],
    ["aguardando ha meses", "health.procedure.long_wait"],
    ["regulacao", "health.procedure.regulation"],
  ],
  medicine_or_supply: [
    ["remedio", "health.supply.medicine"],
    ["medicamento", "health.supply.medicine"],
    ["farmacia sem", "health.supply.pharmacy_shortage"],
    ["falta de insumo", "health.supply.shortage"],
    ["material em falta", "health.supply.material_shortage"],
  ],
  staff_or_service_availability: [
    ["sem medico", "health.staff.no_doctor"],
    ["sem enfermeiro", "health.staff.no_nurse"],
    ["falta de profissional", "health.staff.shortage"],
    ["servico suspenso", "health.service.suspended"],
    ["especialidade indisponivel", "health.service.specialty_unavailable"],
  ],
  facility_or_accessibility: [
    ["banheiro quebrado", "health.facility.broken_bathroom"],
    ["elevador", "health.facility.elevator"],
    ["rampa", "health.facility.ramp"],
    ["cadeira", "health.facility.chair"],
    ["equipamento", "health.facility.equipment"],
    ["sala", "health.facility.room"],
    ["sem climatizacao", "health.facility.climate"],
    ["sem acessibilidade", "health.facility.accessibility"],
    ["nao tem acessibilidade", "health.facility.accessibility"],
  ],
  care_conduct: [
    ["atendimento desrespeitoso", "health.conduct.disrespect"],
    ["atendimento foi desrespeitoso", "health.conduct.disrespect"],
    ["desrespeitoso", "health.conduct.disrespect"],
    ["discriminacao", "health.conduct.discrimination"],
    ["informacao recusada", "health.conduct.information_refused"],
    ["tratamento inadequado", "health.conduct.inadequate_treatment"],
  ],
  transfer_or_health_transport: [
    ["ambulancia para transferencia", "health.transport.ambulance_transfer"],
    ["transporte sanitario", "health.transport.sanitary_transport"],
    ["remocao", "health.transport.removal"],
    ["transferencia entre unidades", "health.transport.unit_transfer"],
  ],
  information_or_followup: [
    ["ninguem informa", "health.information.not_provided"],
    ["sem informacao", "health.information.missing"],
    ["acompanhamento", "health.information.followup"],
  ],
  other_health_service: [],
};

const ALLOWED_ANSWERS = new Set<HealthIssueType>(
  Object.keys(HEALTH_ISSUE_TYPE_LABELS) as HealthIssueType[],
);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contains(value: string, phrases: readonly string[]) {
  return phrases.some((phrase) => value.includes(phrase));
}

function signalsFor(value: string, type: HealthIssueType) {
  return ISSUE_SIGNALS[type]
    .filter(([phrase]) => value.includes(phrase))
    .map(([, signal]) => signal);
}

function selectedType(
  value: string,
  answer: string | undefined,
): { type: HealthIssueType; matchedSignals: string[]; confidence: Confidence } {
  if (answer && ALLOWED_ANSWERS.has(answer as HealthIssueType)) {
    return {
      type: answer as HealthIssueType,
      matchedSignals: ["person.selected_health_issue_type"],
      confidence: "high",
    };
  }
  const ranked = (Object.keys(ISSUE_SIGNALS) as HealthIssueType[])
    .filter((type) => type !== "other_health_service")
    .map((type) => ({ type, matchedSignals: signalsFor(value, type) }))
    .filter((entry) => entry.matchedSignals.length > 0)
    .sort((a, b) => b.matchedSignals.length - a.matchedSignals.length);
  return ranked[0]
    ? { ...ranked[0], confidence: "high" }
    : {
        type: "other_health_service",
        matchedSignals: ["health.service_context"],
        confidence: "medium",
      };
}

function healthPrivacy(value: string): "sensitive" | "high_risk" {
  const highRisk = contains(value, [
    "meu diagnostico",
    "minha doenca",
    "meu exame",
    "meu resultado",
    "minha receita",
    "meu prontuario",
    "cartao sus",
    "cpf",
    "documento",
    "nome do paciente",
    "meu filho",
    "minha filha",
    "crianca",
    "adolescente",
    "gravidez",
    "gestante",
    "ameaca",
    "retaliacao",
    "violencia",
  ]);
  return highRisk ? "high_risk" : "sensitive";
}

export function routeHealthServiceV1(
  input: RelataInput,
): HealthServiceRoutingResult | null {
  const value = normalize(input.text);
  const answer = input.answers?.health_issue_type;
  const allIssueSignals = (Object.keys(ISSUE_SIGNALS) as HealthIssueType[])
    .flatMap((type) => signalsFor(value, type));
  const hasContext = contains(value, HEALTH_CONTEXT);
  const directServiceProblem = contains(value, [
    "consulta",
    "exame",
    "cirurgia",
    "procedimento",
    "medicamento",
    "remedio",
    "regulacao",
    "atendimento imediato",
    "nao fui atendido",
    "transporte sanitario",
  ]);
  if (!hasContext && !directServiceProblem) return null;

  const selection = selectedType(value, answer);
  const emergency = contains(value, [
    "risco de vida",
    "risco imediato a vida",
    "atendimento imediato",
    "agravamento grave",
    "nao consegue respirar",
    "inconsciente",
  ]);

  return {
    selectedCategory: "public_health",
    healthIssueType: selection.type,
    confidence: selection.confidence,
    urgency: emergency ? "emergency" : "attention",
    adaptiveQuestion:
      answer || selection.confidence === "high" ? null : HEALTH_ISSUE_TYPE_QUESTION,
    requiresHumanReview: true,
    privacyClass: healthPrivacy(value),
    routingVersion: COMUN_HEALTH_SERVICE_ROUTING_VERSION,
    matchedSignals: [...new Set([...allIssueSignals, ...selection.matchedSignals])],
    explanation: emergency
      ? "A descrição indica um problema do SUS com possível necessidade de atendimento imediato."
      : "A descrição indica um problema em um serviço público de saúde.",
    nextStep: emergency
      ? "Procure atendimento de urgência. Em risco imediato à vida, o SAMU 192 é o canal emergencial. O COMUN não faz essa chamada."
      : "O relato pode ser guardado agora, sem nome de paciente, documento, diagnóstico ou prontuário.",
  };
}
