import type {
  AdaptiveQuestion,
  EducationIssueType,
  PrivacyClass,
  RelataInput,
  RoutingDecision,
} from "./comun-relata-contract";

export const COMUN_EDUCATION_SERVICE_ROUTING_VERSION =
  "comun-education-service-routing-v1" as const;

export const EDUCATION_ISSUE_TYPE_LABELS: Record<EducationIssueType, string> = {
  staff_or_service_availability: "Falta de profissional ou serviço",
  infrastructure_or_climate: "Estrutura ou climatização",
  school_meals_or_supplies: "Merenda, material ou insumo",
  school_transport_or_access: "Transporte ou acesso à escola",
  accessibility_or_inclusion: "Acessibilidade ou inclusão",
  enrollment_or_attendance: "Matrícula, vaga ou permanência",
  discrimination_or_bullying: "Discriminação ou bullying",
  information_or_management: "Informação ou gestão escolar",
  other_education_service: "Outro problema na Educação",
};

export const EDUCATION_ISSUE_TYPE_QUESTION: AdaptiveQuestion = {
  id: "education_issue_type",
  prompt: "Qual é o principal problema?",
  answerKey: "education_issue_type",
  options: [
    { value: "staff_or_service_availability", label: "Falta de profissional" },
    { value: "infrastructure_or_climate", label: "Estrutura ou climatização" },
    { value: "school_meals_or_supplies", label: "Merenda ou material" },
    { value: "school_transport_or_access", label: "Transporte escolar" },
    {
      value: "accessibility_or_inclusion",
      label: "Acessibilidade ou inclusão",
    },
    { value: "enrollment_or_attendance", label: "Matrícula ou vaga" },
    { value: "discrimination_or_bullying", label: "Discriminação ou bullying" },
    { value: "information_or_management", label: "Informação ou gestão" },
    { value: "other_education_service", label: "Outro" },
  ],
  blocking: false,
};

type Confidence = RoutingDecision["confidence"];

export type EducationServiceRoutingResult = {
  selectedCategory: "public_education";
  educationIssueType: EducationIssueType;
  confidence: Confidence;
  urgency: RoutingDecision["urgency"];
  adaptiveQuestion: AdaptiveQuestion | null;
  requiresHumanReview: true;
  privacyClass: Extract<PrivacyClass, "restricted" | "sensitive" | "high_risk">;
  childSafetySignal: boolean;
  routingVersion: typeof COMUN_EDUCATION_SERVICE_ROUTING_VERSION;
  matchedSignals: string[];
  explanation: string;
  nextStep: string;
};

const EDUCATION_CONTEXT = [
  "escola",
  "creche",
  "colegio publico",
  "rede municipal de ensino",
  "rede estadual de ensino",
  "sala de aula",
  "salas",
  "turma",
  "merenda",
  "transporte escolar",
  "onibus escolar",
] as const;

const LABOR_SIGNALS = [
  "sem receber salario",
  "salario atrasado",
  "nao recebe salario",
  "fgts",
  "direitos trabalhistas",
  "trabalhando sem direitos",
  "jornada de trabalho",
  "assedio laboral",
] as const;

const CHILD_SAFETY_SIGNALS = [
  "crianca agredida",
  "agrediu uma crianca",
  "agredindo estudante",
  "violencia fisica",
  "violencia sexual",
  "abuso sexual",
  "exploracao sexual",
  "abandono",
  "ameaca grave",
  "crianca em perigo",
  "estudante em perigo",
] as const;

const ISSUE_SIGNALS: Record<
  EducationIssueType,
  readonly (readonly [string, string])[]
> = {
  staff_or_service_availability: [
    ["sem professor", "education.staff.no_teacher"],
    ["turma sem professor", "education.staff.no_teacher"],
    ["falta de cuidador", "education.staff.no_caregiver"],
    ["falta de mediador", "education.staff.no_mediator"],
    ["falta de inspetor", "education.staff.no_inspector"],
    ["falta de profissional de apoio", "education.staff.no_support"],
    ["aula suspensa", "education.service.suspended_class"],
    ["servico interrompido", "education.service.interrupted"],
  ],
  infrastructure_or_climate: [
    ["sala muito quente", "education.facility.hot_room"],
    ["salas muito quentes", "education.facility.hot_room"],
    ["sem ventilador", "education.facility.no_fan"],
    ["sem ar condicionado", "education.facility.no_air_conditioning"],
    ["telhado", "education.facility.roof"],
    ["infiltracao", "education.facility.leak"],
    ["banheiro quebrado", "education.facility.broken_bathroom"],
    ["falta de agua na escola", "education.facility.no_water"],
    ["equipamento quebrado", "education.facility.broken_equipment"],
    ["quadra sem condicao", "education.facility.unusable_court"],
    ["sala interditada", "education.facility.closed_room"],
  ],
  school_meals_or_supplies: [
    ["sem merenda", "education.meals.none"],
    ["merenda insuficiente", "education.meals.insufficient"],
    ["alimento estragado", "education.meals.spoiled"],
    ["falta de material", "education.supplies.material"],
    ["falta de uniforme", "education.supplies.uniform"],
    ["falta de livro", "education.supplies.book"],
    ["falta de insumo escolar", "education.supplies.school_supply"],
  ],
  school_transport_or_access: [
    ["transporte escolar", "education.transport.school_transport"],
    ["rota escolar", "education.transport.route"],
    ["onibus escolar", "education.transport.school_bus"],
    ["nao buscou os alunos", "education.transport.not_collected"],
    ["estudante sem transporte", "education.transport.no_access"],
    ["veiculo escolar", "education.transport.vehicle"],
  ],
  accessibility_or_inclusion: [
    ["escola sem rampa", "education.inclusion.no_ramp"],
    ["nao tem rampa", "education.inclusion.no_ramp"],
    ["falta de acessibilidade", "education.inclusion.accessibility"],
    ["banheiro acessivel", "education.inclusion.bathroom"],
    ["estudante sem apoio", "education.inclusion.no_support"],
    ["recurso de inclusao", "education.inclusion.resource"],
    ["pessoa com deficiencia", "education.inclusion.disability"],
  ],
  enrollment_or_attendance: [
    ["nao conseguiu matricula", "education.enrollment.denied"],
    ["nao consigo vaga", "education.enrollment.no_slot"],
    ["falta de vaga", "education.enrollment.no_slot"],
    ["transferencia escolar", "education.enrollment.transfer"],
    ["fora da escola", "education.attendance.out_of_school"],
    ["infrequencia", "education.attendance.absence"],
    ["retorno nao autorizado", "education.attendance.return_denied"],
    ["dificuldade de permanencia", "education.attendance.retention"],
  ],
  discrimination_or_bullying: [
    ["bullying", "education.safety.bullying"],
    ["discriminacao", "education.safety.discrimination"],
    ["racismo", "education.safety.racism"],
    ["capacitismo", "education.safety.ableism"],
    ["humilhacao", "education.safety.humiliation"],
    ["perseguicao escolar", "education.safety.harassment"],
  ],
  information_or_management: [
    ["nao informa", "education.information.not_provided"],
    ["sem informacao", "education.information.missing"],
    ["quando as aulas voltam", "education.information.class_return"],
    ["comunicacao da escola", "education.information.school_communication"],
    ["gestao escolar", "education.management.school"],
  ],
  other_education_service: [],
};

const ALLOWED_ANSWERS = new Set<EducationIssueType>(
  Object.keys(EDUCATION_ISSUE_TYPE_LABELS) as EducationIssueType[],
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

function signalsFor(value: string, type: EducationIssueType) {
  return ISSUE_SIGNALS[type]
    .filter(([phrase]) => value.includes(phrase))
    .map(([, signal]) => signal);
}

function selectedType(
  value: string,
  answer: string | undefined,
): {
  type: EducationIssueType;
  matchedSignals: string[];
  confidence: Confidence;
} {
  if (answer && ALLOWED_ANSWERS.has(answer as EducationIssueType)) {
    return {
      type: answer as EducationIssueType,
      matchedSignals: ["person.selected_education_issue_type"],
      confidence: "high",
    };
  }
  const ranked = (Object.keys(ISSUE_SIGNALS) as EducationIssueType[])
    .filter((type) => type !== "other_education_service")
    .map((type) => ({ type, matchedSignals: signalsFor(value, type) }))
    .filter((entry) => entry.matchedSignals.length > 0)
    .sort((a, b) => b.matchedSignals.length - a.matchedSignals.length);
  return ranked[0]
    ? { ...ranked[0], confidence: "high" }
    : {
        type: "other_education_service",
        matchedSignals: ["education.service_context"],
        confidence: "medium",
      };
}

function educationPrivacy(
  value: string,
  issueType: EducationIssueType,
  childSafetySignal: boolean,
): "restricted" | "sensitive" | "high_risk" {
  if (
    childSafetySignal ||
    issueType === "discrimination_or_bullying" ||
    contains(value, [
      "nome do estudante",
      "nome da aluna",
      "nome do aluno",
      "meu filho",
      "minha filha",
      "turma do",
      "matricula numero",
      "boletim",
      "lista de chamada",
      "cpf",
      "documento",
      "endereco residencial",
      "ameaca",
      "retaliacao",
    ])
  )
    return "high_risk";
  if (
    issueType === "accessibility_or_inclusion" ||
    contains(value, [
      "deficiencia",
      "condicao individual",
      "crianca",
      "adolescente",
      "estudante",
      "aluno",
      "aluna",
    ])
  )
    return "sensitive";
  return "restricted";
}

export function routeEducationServiceV1(
  input: RelataInput,
): EducationServiceRoutingResult | null {
  const value = normalize(input.text);
  if (contains(value, LABOR_SIGNALS)) return null;
  const allIssueSignals = (
    Object.keys(ISSUE_SIGNALS) as EducationIssueType[]
  ).flatMap((type) => signalsFor(value, type));
  const hasContext = contains(value, EDUCATION_CONTEXT);
  const directEducationProblem = contains(value, [
    "transporte escolar",
    "onibus escolar",
    "nao conseguiu matricula",
    "nao consigo vaga para matricula",
    "falta de vaga na escola",
    "bullying",
    "perseguicao escolar",
  ]);
  if (!hasContext && !directEducationProblem) return null;

  const selection = selectedType(value, input.answers?.education_issue_type);
  const childSafetySignal = contains(value, CHILD_SAFETY_SIGNALS);
  const immediateRisk = contains(value, [
    "perigo imediato",
    "agredindo agora",
    "violencia agora",
    "risco imediato",
    "desabando",
    "incendio",
  ]);
  const physicalRisk =
    immediateRisk ||
    contains(value, [
      "risco estrutural",
      "teto caindo",
      "parede caindo",
      "sala interditada",
      "adulto agrediu",
    ]);
  const healthGuidance = contains(value, ["passando mal", "passou mal"]);

  return {
    selectedCategory: "public_education",
    educationIssueType: selection.type,
    confidence: selection.confidence,
    urgency: immediateRisk
      ? "emergency"
      : physicalRisk || childSafetySignal
        ? "urgent"
        : "attention",
    adaptiveQuestion:
      input.answers?.education_issue_type || selection.confidence === "high"
        ? null
        : EDUCATION_ISSUE_TYPE_QUESTION,
    requiresHumanReview: true,
    privacyClass: educationPrivacy(value, selection.type, childSafetySignal),
    childSafetySignal,
    routingVersion: COMUN_EDUCATION_SERVICE_ROUTING_VERSION,
    matchedSignals: [
      ...new Set([
        ...allIssueSignals,
        ...selection.matchedSignals,
        ...(childSafetySignal
          ? ["education.child_safety.review_required"]
          : []),
      ]),
    ],
    explanation: childSafetySignal
      ? "A descrição indica um problema educacional com sinal de proteção infantil."
      : "A descrição indica um problema em um serviço público de Educação.",
    nextStep: childSafetySignal
      ? "Guarde privadamente e procure a rede de proteção adequada. O COMUN não acionou ninguém."
      : physicalRisk
        ? "Afaste-se do risco e procure ajuda adequada. O COMUN não acionou nenhum serviço."
        : healthGuidance
          ? "Guarde o problema educacional e procure atendimento de saúde se alguém estiver passando mal."
          : "O relato pode ser guardado agora, sem nome de estudante, turma, matrícula ou documento.",
  };
}
