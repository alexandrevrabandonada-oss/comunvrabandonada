import {
  COMUN_RELATA_RULE_VERSION,
  type RelataInput,
  type RelataCategory,
  type RoutingDecision,
} from "./comun-relata-contract";
import {
  canRelataAutoRoute,
  classifyRelataPrivacy,
  requiresRelataHumanReview,
} from "./comun-relata-privacy";

const DARK_STREET_QUESTION =
  "As casas também estão sem energia ou apenas as luminárias da rua?";

function normalized(input: RelataInput) {
  return `${input.text} ${Object.values(input.answers ?? {}).join(" ")}`.toLocaleLowerCase(
    "pt-BR",
  );
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function baseDecision(
  category: RelataCategory,
  input: RelataInput,
  overrides: Partial<RoutingDecision> = {},
): RoutingDecision {
  const privacyClass = classifyRelataPrivacy(input);
  return {
    category,
    urgency: "attention",
    agencyKind: "community_review",
    explanation:
      "O COMUN precisa confirmar o contexto antes de indicar o próximo passo.",
    nextStep: "Responda à pergunta de triagem para continuar.",
    missingInformation: [],
    privacyClass,
    publication:
      privacyClass === "public_safe" ? "public_safe" : "never_automatic",
    requiresHumanReview:
      requiresRelataHumanReview(privacyClass) ||
      !canRelataAutoRoute(privacyClass),
    ruleVersion: COMUN_RELATA_RULE_VERSION,
    confidence: "low",
    ...overrides,
  };
}

export function routeRelata(input: RelataInput): RoutingDecision {
  const value = normalized(input);
  const darkStreet = hasAny(value, [
    "rua toda escura",
    "rua está toda escura",
    "rua esta toda escura",
    "rua inteira está sem luz",
    "rua inteira esta sem luz",
    "rua toda está sem luz",
    "rua toda esta sem luz",
  ]);
  const homesAnswer = input.answers?.homes_power;

  // A fotografia, por si só, já é conteúdo mínimo válido. Não inventamos uma
  // categoria: guardamos como "other" e deixamos a classificação para depois.
  if (
    input.hasAttachment &&
    input.text.startsWith("Observação registrada a partir")
  ) {
    return baseDecision("other", input, {
      explanation: "A fotografia foi recebida como evidência privada.",
      nextStep:
        "Guarde o relato agora; você poderá completar o contexto depois.",
      missingInformation: [],
      confidence: "low",
      publication: "never_automatic",
    });
  }

  if (
    hasAny(value, [
      "ônibus",
      "onibus",
      "linha de ônibus",
      "ponto de ônibus",
      "ponto de onibus",
      "lotação",
      "lotacao",
    ])
  ) {
    return baseDecision("public_transport", input, {
      urgency: "attention",
      agencyKind: "public_transport",
      explanation:
        "A observação será guardada como transporte coletivo, sem envio automático a um órgão.",
      nextStep:
        "Revise a linha, o ponto e o horário antes de guardar o relato privado.",
      confidence: "medium",
      publication: "never_automatic",
    });
  }

  if (
    hasAny(value, [
      "calçada",
      "calcada",
      "rampa",
      "passagem bloqueada",
      "acessibilidade",
    ])
  ) {
    return baseDecision("sidewalk_accessibility", input, {
      agencyKind: "community_review",
      explanation:
        "A descrição aponta para uma barreira de calçada ou acessibilidade.",
      nextStep: "Confirme se a passagem está totalmente bloqueada, se puder.",
      missingInformation: hasAny(value, [
        "totalmente bloqueada",
        "totalmente bloqueado",
      ])
        ? []
        : ["A passagem está totalmente bloqueada?"],
      confidence: "medium",
      publication: "never_automatic",
    });
  }

  if (hasAny(value, ["lixo", "entulho", "descarte", "caçamba", "cacamba"])) {
    return baseDecision("waste_or_debris", input, {
      explanation: "A descrição aponta para lixo ou entulho no espaço comum.",
      nextStep:
        "Registre uma referência aproximada sem expor endereço residencial.",
      confidence: "medium",
      publication: "never_automatic",
    });
  }

  if (
    hasAny(value, [
      "posto de saúde",
      "ubs",
      "hospital",
      "consulta",
      "exame",
      "fila de cirurgia",
    ])
  ) {
    return baseDecision("public_health", input, {
      agencyKind: "community_review",
      explanation: "A descrição aponta para uma situação de saúde pública.",
      nextStep:
        "Se puder, informe em qual unidade aconteceu, sem dados pessoais.",
      confidence: "low",
      publication: "never_automatic",
    });
  }

  if (
    hasAny(value, ["escola", "creche", "merenda", "professor", "sala de aula"])
  ) {
    return baseDecision("public_education", input, {
      agencyKind: "community_review",
      explanation: "A descrição aponta para uma situação de educação pública.",
      nextStep:
        "Se souber, indique se é escola municipal, estadual ou não sabe.",
      confidence: "low",
      publication: "never_automatic",
    });
  }

  if (
    hasAny(value, [
      "trabalho",
      "empresa",
      "chefe",
      "salário",
      "salario",
      "assédio",
      "assedio",
      "burnout",
    ])
  ) {
    return baseDecision("workplace", input, {
      agencyKind: "community_review",
      explanation: "A descrição aponta para uma situação de trabalho.",
      nextStep:
        "O formulário detalhado continua disponível para contexto sensível.",
      confidence: "low",
      privacyClass: "sensitive",
      publication: "never_automatic",
    });
  }

  if (
    hasAny(value, [
      "poluição",
      "poluicao",
      "poluído",
      "poluido",
      "rio poluído",
      "rio poluido",
      "po preto",
      "cheiro forte",
      "cheiro químico",
      "cheiro quimico",
      "esgoto",
      "contaminada",
      "contaminado",
      "água contaminada",
      "agua contaminada",
    ])
  ) {
    return baseDecision("environmental_pollution", input, {
      agencyKind: "environmental",
      explanation: "A descrição aponta para poluição ou impacto ambiental.",
      nextStep:
        "Registre o momento e uma referência aproximada, sem endereço exato.",
      confidence: "medium",
      publication: "never_automatic",
    });
  }

  if (
    hasAny(value, [
      "sem água",
      "sem agua",
      "falta d'água",
      "falta de água",
      "falta de agua",
      "água não chega",
      "agua nao chega",
      "bairro sem água",
      "bairro sem agua",
      "abastecimento interrompido",
      "pouca pressão",
      "pouca pressao",
      "água chegando fraca",
      "agua chegando fraca",
      "vazamento da rede",
      "rede de abastecimento rompida",
      "cano de abastecimento rompido",
    ])
  ) {
    return baseDecision("water_supply", input, {
      urgency: "attention",
      agencyKind: "water_sanitation",
      explanation: "A descrição aponta para o abastecimento de água.",
      nextStep:
        "O relato pode ser guardado agora; o tipo de falha pode ser completado depois.",
      missingInformation: [],
      confidence: "high",
      publication: "never_automatic",
    });
  }

  if (darkStreet && !homesAnswer) {
    return baseDecision("public_lighting", input, {
      urgency: "attention",
      agencyKind: "public_lighting",
      explanation:
        "A descrição pode indicar iluminação pública ou uma falha de distribuição de energia.",
      missingInformation: [DARK_STREET_QUESTION],
      nextStep: DARK_STREET_QUESTION,
      confidence: "low",
    });
  }

  if (
    hasAny(value, [
      "fio caído",
      "fio eletrico caído",
      "fio elétrico caído",
      "cabo caído",
      "faísca",
      "choque",
    ])
  ) {
    return baseDecision("electrical_hazard", input, {
      urgency: "emergency",
      agencyKind: "emergency",
      explanation: "Há indicação de risco elétrico imediato.",
      nextStep:
        "Afaste-se, não toque no fio e procure o serviço de emergência local.",
      confidence: "high",
      requiresHumanReview: true,
      publication: "never_automatic",
    });
  }

  const explicitlyInactive = hasAny(value, [
    "sem fogo ativo",
    "sem fogo",
    "sem chamas",
    "fogo apagado",
    "não há fogo",
  ]);
  if (
    !explicitlyInactive &&
    hasAny(value, [
      "fogo",
      "incêndio",
      "incendio",
      "queimada ativa",
      "chamas",
      "pegando fogo",
    ])
  ) {
    return baseDecision("active_fire", input, {
      urgency: "emergency",
      agencyKind: "emergency",
      explanation: "A descrição indica fogo ativo.",
      nextStep:
        "Mantenha distância e procure imediatamente o serviço de emergência local.",
      confidence: "high",
      requiresHumanReview: true,
      publication: "never_automatic",
    });
  }

  if (
    hasAny(value, [
      "fumaça",
      "fumaca",
      "vestígio",
      "vestigio",
      "cheiro de queimado",
      "cinza",
    ])
  ) {
    return baseDecision("smoke_or_environmental_trace", input, {
      urgency: "attention",
      agencyKind: "environmental",
      explanation: "Há fumaça ou vestígio sem confirmação de fogo ativo.",
      nextStep:
        "Informe se ainda há chamas, de onde vem a fumaça e se alguém corre risco.",
      missingInformation: [
        "O fogo ainda está ativo ou restou apenas fumaça/vestígio?",
      ],
      confidence: "medium",
    });
  }

  if (
    hasAny(value, [
      "casa sem energia",
      "casas sem energia",
      "casas aqui estão sem luz",
      "casas aqui estao sem luz",
      "quarteirão sem energia",
      "bairro sem energia",
      "bairro inteiro está sem energia",
      "bairro inteiro esta sem energia",
      "falta de energia",
    ])
  ) {
    return baseDecision("power_distribution", input, {
      urgency: "attention",
      agencyKind: "power_distribution",
      explanation:
        "A descrição aponta para distribuição de energia, não apenas iluminação pública.",
      nextStep:
        "Registre o período aproximado e se imóveis vizinhos também estão sem energia.",
      confidence: "high",
    });
  }

  if (darkStreet && homesAnswer === "nao") {
    return baseDecision("public_lighting", input, {
      urgency: "attention",
      agencyKind: "public_lighting",
      explanation: "Somente as luminárias foram descritas como apagadas.",
      nextStep:
        "Registre o ponto de iluminação sem compartilhar endereço exato de pessoa.",
      confidence: "high",
    });
  }

  if (darkStreet && homesAnswer === "sim") {
    return baseDecision("power_distribution", input, {
      urgency: "attention",
      agencyKind: "power_distribution",
      explanation:
        "As casas também estão sem energia; a hipótese principal é distribuição.",
      nextStep:
        "Registre o período e mantenha distância de instalações danificadas.",
      confidence: "high",
    });
  }

  if (
    hasAny(value, [
      "poste está apagado",
      "poste esta apagado",
      "poste apagado",
      "luminária da rua não acende",
      "luminaria da rua nao acende",
      "luminárias da rua apagadas",
      "luminarias da rua apagadas",
    ])
  ) {
    return baseDecision("public_lighting", input, {
      urgency: "attention",
      agencyKind: "public_lighting",
      explanation: "A descrição aponta somente para iluminação pública.",
      nextStep: "O relato pode ser guardado sem pergunta adicional.",
      missingInformation: [],
      confidence: "high",
      publication: "never_automatic",
    });
  }

  return baseDecision("other", input, {
    nextStep:
      "Descreva o local de forma aproximada e o que precisa acontecer em seguida.",
    missingInformation: [
      "Qual é o tipo de situação e há risco imediato para alguém?",
    ],
  });
}

export { DARK_STREET_QUESTION };
