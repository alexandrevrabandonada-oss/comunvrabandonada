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
  return `${input.text} ${Object.values(input.answers ?? {}).join(" ")}`.toLocaleLowerCase("pt-BR");
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
    explanation: "O COMUN precisa confirmar o contexto antes de indicar o próximo passo.",
    nextStep: "Responda à pergunta de triagem para continuar.",
    missingInformation: [],
    privacyClass,
    publication: privacyClass === "public_safe" ? "public_safe" : "never_automatic",
    requiresHumanReview: requiresRelataHumanReview(privacyClass) || !canRelataAutoRoute(privacyClass),
    ruleVersion: COMUN_RELATA_RULE_VERSION,
    confidence: "low",
    ...overrides,
  };
}

export function routeRelata(input: RelataInput): RoutingDecision {
  const value = normalized(input);
  const darkStreet = hasAny(value, ["rua toda escura", "rua está toda escura", "rua esta toda escura", "luminárias apagadas", "luminaria apagada"]);
  const homesAnswer = input.answers?.homes_power;

  if (hasAny(value, ["ônibus", "onibus", "linha de ônibus", "ponto de ônibus", "ponto de onibus", "lotação", "lotacao"])) {
    return baseDecision("public_transport", input, {
      urgency: "attention",
      agencyKind: "public_transport",
      explanation: "A observação será guardada como transporte coletivo, sem envio automático a um órgão.",
      nextStep: "Revise a linha, o ponto e o horário antes de guardar o relato privado.",
      confidence: "medium",
      publication: "never_automatic",
    });
  }

  if (darkStreet && !homesAnswer) {
    return baseDecision("public_lighting", input, {
      urgency: "attention",
      agencyKind: "public_lighting",
      explanation: "A descrição pode indicar iluminação pública ou uma falha de distribuição de energia.",
      missingInformation: [DARK_STREET_QUESTION],
      nextStep: DARK_STREET_QUESTION,
      confidence: "low",
    });
  }

  if (hasAny(value, ["fio caído", "fio eletrico caído", "fio elétrico caído", "cabo caído", "faísca", "faísca", "choque"])) {
    return baseDecision("electrical_hazard", input, {
      urgency: "emergency",
      agencyKind: "emergency",
      explanation: "Há indicação de risco elétrico imediato.",
      nextStep: "Afaste-se, não toque no fio e procure o serviço de emergência local.",
      confidence: "high",
      requiresHumanReview: true,
      publication: "never_automatic",
    });
  }

  const explicitlyInactive = hasAny(value, ["sem fogo ativo", "sem fogo", "sem chamas", "fogo apagado", "não há fogo"]);
  if (!explicitlyInactive && hasAny(value, ["fogo", "incêndio", "incendio", "queimada ativa", "chamas", "pegando fogo"])) {
    return baseDecision("active_fire", input, {
      urgency: "emergency",
      agencyKind: "emergency",
      explanation: "A descrição indica fogo ativo.",
      nextStep: "Mantenha distância e procure imediatamente o serviço de emergência local.",
      confidence: "high",
      requiresHumanReview: true,
      publication: "never_automatic",
    });
  }

  if (hasAny(value, ["fumaça", "fumaca", "vestígio", "vestigio", "cheiro de queimado", "cinza"])) {
    return baseDecision("smoke_or_environmental_trace", input, {
      urgency: "attention",
      agencyKind: "environmental",
      explanation: "Há fumaça ou vestígio sem confirmação de fogo ativo.",
      nextStep: "Informe se ainda há chamas, de onde vem a fumaça e se alguém corre risco.",
      missingInformation: ["O fogo ainda está ativo ou restou apenas fumaça/vestígio?"],
      confidence: "medium",
    });
  }

  if (hasAny(value, ["casa sem energia", "casas sem energia", "quarteirão sem energia", "bairro sem energia", "falta de energia"])) {
    return baseDecision("power_distribution", input, {
      urgency: "attention",
      agencyKind: "power_distribution",
      explanation: "A descrição aponta para distribuição de energia, não apenas iluminação pública.",
      nextStep: "Registre o período aproximado e se imóveis vizinhos também estão sem energia.",
      confidence: "high",
    });
  }

  if (darkStreet && homesAnswer === "nao") {
    return baseDecision("public_lighting", input, {
      urgency: "attention",
      agencyKind: "public_lighting",
      explanation: "Somente as luminárias foram descritas como apagadas.",
      nextStep: "Registre o ponto de iluminação sem compartilhar endereço exato de pessoa.",
      confidence: "high",
    });
  }

  if (darkStreet && homesAnswer === "sim") {
    return baseDecision("power_distribution", input, {
      urgency: "attention",
      agencyKind: "power_distribution",
      explanation: "As casas também estão sem energia; a hipótese principal é distribuição.",
      nextStep: "Registre o período e mantenha distância de instalações danificadas.",
      confidence: "high",
    });
  }

  return baseDecision("other", input, {
    nextStep: "Descreva o local de forma aproximada e o que precisa acontecer em seguida.",
    missingInformation: ["Qual é o tipo de situação e há risco imediato para alguém?"],
  });
}

export { DARK_STREET_QUESTION };
