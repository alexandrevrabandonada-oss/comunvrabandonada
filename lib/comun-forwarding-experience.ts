import type { RelataCategory, RelataUrgency } from "./comun-relata-contract";
import { COMUN_RELATA_CATEGORY_LABELS } from "./comun-wallet-relata-action";

export type ComunForwardingExperienceMode =
  | "essential_assisted"
  | "sensitive_assisted"
  | "specialized"
  | "emergency"
  | "human_review"
  | "civic_assisted";

export type ComunForwardingExperience = {
  mode: ComunForwardingExperienceMode;
  headline: string;
  explanation: string;
  actionLabel: string;
  privacyNote?: string;
  escalationNote?: string;
  automationAllowed: false;
};

export type ComunForwardingExperienceInput = {
  category: string | null;
  urgency?: string | null;
  metadata: Record<string, unknown>;
  essentialForwardingEnabled: boolean;
  sensitiveForwardingEnabled: boolean;
  civicForwardingEnabled: boolean;
};

const CIVIC_CATEGORIES = new Set([
  "waste_or_debris",
  "smoke_or_environmental_trace",
  "environmental_pollution",
  "stormwater_drainage",
  "urban_flooding",
  "tree_hazard",
]);

function label(category: string | null) {
  return (
    COMUN_RELATA_CATEGORY_LABELS[
      category as keyof typeof COMUN_RELATA_CATEGORY_LABELS
    ] ?? "este problema"
  );
}

function urgency(input: ComunForwardingExperienceInput) {
  return String(input.urgency ?? input.metadata.urgency ?? "routine") as RelataUrgency;
}

function emergency(input: ComunForwardingExperienceInput) {
  const value = urgency(input);
  if (["urgent", "emergency"].includes(value)) return true;
  return (
    input.metadata.immediateDanger === true ||
    input.metadata.smokeActive === true ||
    input.metadata.floodActiveRisk === true ||
    input.metadata.treeFallState === "falling" ||
    input.category === "active_fire"
  );
}

function humanReview(category: string | null): ComunForwardingExperience {
  return {
    mode: "human_review",
    headline: `Vamos revisar ${label(category)} antes de indicar um encaminhamento`,
    explanation:
      "O COMUN guardou seu relato, mas ainda não há um caminho seguro o bastante para preparar agora.",
    actionLabel: "Continuar acompanhando",
    escalationNote: "Você poderá acrescentar contexto e revisar o próximo passo.",
    automationAllowed: false,
  };
}

export function resolveComunForwardingExperience(
  input: ComunForwardingExperienceInput,
): ComunForwardingExperience {
  if (emergency(input)) {
    return {
      mode: "emergency",
      headline: "Procure atendimento emergencial agora",
      explanation:
        "O COMUN não deve colocar uma situação urgente em uma fila comum. Se for seguro, guarde o relato depois.",
      actionLabel: "Ver orientação imediata",
      privacyNote: "Não envie dados sensíveis ao COMUN para pedir socorro.",
      automationAllowed: false,
    };
  }

  if (
    ["water_supply", "power_distribution", "public_lighting"].includes(
      input.category ?? "",
    ) &&
    input.essentialForwardingEnabled
  ) {
    return {
      mode: "essential_assisted",
      headline: "O próximo passo é abrir o canal do serviço",
      explanation:
        "O COMUN prepara uma mensagem para você conferir. Nada é enviado por esta tela.",
      actionLabel: "Preparar encaminhamento",
      privacyNote: "Informe dados de consumidor diretamente ao serviço, nunca ao COMUN.",
      automationAllowed: false,
    };
  }

  if (
    ["public_health", "public_education", "child_protection"].includes(
      input.category ?? "",
    ) &&
    input.sensitiveForwardingEnabled
  ) {
    return {
      mode: "sensitive_assisted",
      headline: "Escolha com cuidado o que levar ao canal",
      explanation:
        "O COMUN mostra uma prévia e só prepara o que você confirmar. Na proteção infantil, o conteúdo é informado diretamente ao canal.",
      actionLabel: "Revisar antes de abrir o canal",
      privacyNote: "Nenhum relato sensível é copiado automaticamente.",
      automationAllowed: false,
    };
  }

  if (input.category === "sidewalk_accessibility") {
    return {
      mode: "specialized",
      headline: "Este problema segue pelo acompanhamento de Calçadas",
      explanation:
        "A experiência especializada preserva o contrato próprio de acessibilidade e não usa o encaminhamento genérico.",
      actionLabel: "Abrir acompanhamento de Calçadas",
      automationAllowed: false,
    };
  }

  if (CIVIC_CATEGORIES.has(input.category ?? "") && input.civicForwardingEnabled) {
    return {
      mode: "civic_assisted",
      headline: "Podemos preparar o caminho para o serviço público",
      explanation:
        "Você escolhe a referência pública e escreve a mensagem. Primeiro verá o que será levado; nada é enviado automaticamente.",
      actionLabel: "Revisar o que será levado",
      privacyNote: "Não inclua contato, documento ou endereço residencial exato.",
      automationAllowed: false,
    };
  }

  if (
    input.category === "active_fire" ||
    input.category === "electrical_hazard" ||
    input.category === "urban_flooding" ||
    input.category === "tree_hazard"
  ) {
    return humanReview(input.category);
  }

  return humanReview(input.category);
}

