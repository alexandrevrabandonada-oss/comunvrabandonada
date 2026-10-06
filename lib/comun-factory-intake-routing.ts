export const COMUN_FACTORY_INTAKE_ROUTING_VERSION =
  "comun-factory-intake-routing-v0" as const;

export const COMUN_FACTORY_INTAKE_INTENTS = [
  "civic_problem",
  "repair_object",
  "prototype_request",
  "learning_project",
  "critical_component",
  "unknown",
] as const;

export type ComunFactoryIntakeIntent =
  (typeof COMUN_FACTORY_INTAKE_INTENTS)[number];

export type ComunFactoryIntakeRoutingInput = {
  readonly intent: ComunFactoryIntakeIntent;
  readonly confirmedByPerson: boolean;
  readonly hasImmediatePublicDanger: boolean;
  readonly hasCriticalSafetyUse: boolean;
};

export type ComunFactoryIntakeDestination =
  | "canonical_relata"
  | "factory_private_triage"
  | "school_context"
  | "qualified_referral"
  | "human_triage";

export type ComunFactoryIntakeRoutingDecision = {
  readonly destination: ComunFactoryIntakeDestination;
  readonly href: string | null;
  readonly persistFactoryCase: false;
  readonly requiresHumanReview: boolean;
  readonly reason:
    | "reuse_canonical_civic_intake"
    | "private_factory_pilot_triage"
    | "learning_starts_in_escola"
    | "critical_use_outside_common_factory_flow"
    | "intent_not_confirmed"
    | "unknown_intent";
};

export function routeComunFactoryIntake(
  input: ComunFactoryIntakeRoutingInput,
): ComunFactoryIntakeRoutingDecision {
  if (!input.confirmedByPerson) {
    return {
      destination: "human_triage",
      href: null,
      persistFactoryCase: false,
      requiresHumanReview: true,
      reason: "intent_not_confirmed",
    };
  }

  if (input.intent === "civic_problem" || input.hasImmediatePublicDanger) {
    return {
      destination: "canonical_relata",
      href: "/comun/relatar",
      persistFactoryCase: false,
      requiresHumanReview: false,
      reason: "reuse_canonical_civic_intake",
    };
  }

  if (input.intent === "critical_component" || input.hasCriticalSafetyUse) {
    return {
      destination: "qualified_referral",
      href: null,
      persistFactoryCase: false,
      requiresHumanReview: true,
      reason: "critical_use_outside_common_factory_flow",
    };
  }

  if (input.intent === "learning_project") {
    return {
      destination: "school_context",
      href: "/comun/escola",
      persistFactoryCase: false,
      requiresHumanReview: false,
      reason: "learning_starts_in_escola",
    };
  }

  if (
    input.intent === "repair_object" ||
    input.intent === "prototype_request"
  ) {
    return {
      destination: "factory_private_triage",
      href: null,
      persistFactoryCase: false,
      requiresHumanReview: true,
      reason: "private_factory_pilot_triage",
    };
  }

  return {
    destination: "human_triage",
    href: null,
    persistFactoryCase: false,
    requiresHumanReview: true,
    reason: "unknown_intent",
  };
}

export type ComunFactoryEntryDoor = {
  readonly id: "problem" | "make" | "learn";
  readonly label: string;
  readonly description: string;
};

export const COMUN_FACTORY_ENTRY_DOORS: readonly ComunFactoryEntryDoor[] = [
  {
    id: "problem",
    label: "Tenho um problema",
    description:
      "Conte o que não está funcionando; o COMUN ajuda a encontrar o fluxo certo antes de fabricar.",
  },
  {
    id: "make",
    label: "Quero fazer",
    description:
      "Encontre trabalho real e tarefas que já existem no COMUN, sem uma segunda fila de responsabilidades.",
  },
  {
    id: "learn",
    label: "Quero aprender",
    description:
      "Entre pela Escola COMUN e aprenda a menor habilidade necessária para avançar numa prática real.",
  },
] as const;
