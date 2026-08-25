import { isEssentialServiceCategory } from "./comun-essential-services-feature";
import { HEALTH_ISSUE_TYPE_LABELS } from "./comun-health-service-routing-v1";
import type { HealthIssueType } from "./comun-relata-contract";
import { EDUCATION_ISSUE_TYPE_LABELS } from "./comun-education-service-routing-v1";
import type { EducationIssueType } from "./comun-relata-contract";

export const COMUN_RELATA_CATEGORY_LABELS = {
  sidewalk_accessibility: "Calçada e acessibilidade",
  public_transport: "Ônibus e transporte coletivo",
  water_supply: "Abastecimento de água",
  power_distribution: "Falta de energia",
  public_lighting: "Iluminação pública",
  electrical_hazard: "Risco elétrico",
  active_fire: "Fogo ou incêndio ativo",
  smoke_or_environmental_trace: "Fumaça ou vestígio ambiental",
  waste_or_debris: "Lixo ou entulho",
  public_health: "Saúde pública",
  public_education: "Educação pública",
  child_protection: "Proteção de criança ou adolescente",
  workplace: "Trabalho",
  environmental_pollution: "Poluição ambiental",
  urban_flooding: "Alagamento ou enchente",
  stormwater_drainage: "Drenagem, bueiro ou canal",
  tree_hazard: "Árvore, galho ou risco de queda",
  other: "A classificar",
} as const;

export type WalletRelataRoute =
  | "bus"
  | "essential_service"
  | "sensitive_service"
  | "sidewalk"
  | "no_verified_forwarding";

export type WalletRelataFeatureFlags = {
  stmuAssistedEnabled: boolean;
  stmuMultichannelEnabled: boolean;
  essentialServicesEnabled: boolean;
  essentialForwardingEnabled: boolean;
  sensitiveForwardingEnabled?: boolean;
  childProtectionChannelOnlyEnabled?: boolean;
  civicForwardingEnabled?: boolean;
};

export type WalletRelataAction = {
  route: WalletRelataRoute;
  categoryLabel: string;
  detailLabel: string | null;
  statusOverride: string | null;
  stateMessage: string | null;
  nextStep: string | null;
  availabilityMessage: string | null;
  showStmuAssisted: boolean;
  showStmuMultichannel: boolean;
  showEssentialServices: boolean;
  showSensitiveForwarding: boolean;
};

type WalletRelataActionInput = {
  category: string | null;
  presentationState: string;
  actionRequired: string | null;
  metadata: Record<string, unknown>;
  featureFlags: WalletRelataFeatureFlags;
};

const NO_VERIFIED_FORWARDING =
  "Encaminhamento assistido ainda não disponível para esta categoria.";

function categoryLabel(category: string | null) {
  if (!category) return "Categoria em revisão";
  return (
    COMUN_RELATA_CATEGORY_LABELS[
      category as keyof typeof COMUN_RELATA_CATEGORY_LABELS
    ] ?? "Categoria em revisão"
  );
}

function sidewalkPresentation(
  input: WalletRelataActionInput,
): WalletRelataAction {
  const reviewState =
    typeof input.metadata.sidewalkReviewState === "string"
      ? input.metadata.sidewalkReviewState
      : null;

  if (reviewState === "pending_review") {
    return baseAction("sidewalk", input, {
      statusOverride: "Em revisão",
      stateMessage: "Em revisão para o Mapa das Calçadas.",
    });
  }
  if (reviewState === "published") {
    return baseAction("sidewalk", input, {
      statusOverride: "Publicado",
      stateMessage: "Publicado no mapa após revisão.",
    });
  }
  if (
    reviewState === "withdrawn" ||
    input.presentationState === "withdrawn" ||
    input.presentationState === "Retirado"
  ) {
    return baseAction("sidewalk", input, {
      statusOverride: "Retirado",
      stateMessage: "Retirado.",
    });
  }
  if (reviewState === "needs_information") {
    return baseAction("sidewalk", input, {
      stateMessage:
        "Guardado. Este relato ainda não entrou na fila do Mapa das Calçadas.",
      nextStep: "Faltam informações para entrar no mapa",
    });
  }
  return baseAction("sidewalk", input, {
    stateMessage:
      "Guardado. Este relato ainda não entrou na fila do Mapa das Calçadas.",
    nextStep: input.actionRequired
      ? "Faltam informações para entrar no mapa"
      : null,
  });
}

function baseAction(
  route: WalletRelataRoute,
  input: WalletRelataActionInput,
  overrides: Partial<WalletRelataAction> = {},
): WalletRelataAction {
  return {
    route,
    categoryLabel: categoryLabel(input.category),
    detailLabel: null,
    statusOverride: null,
    stateMessage: null,
    nextStep: null,
    availabilityMessage: null,
    showStmuAssisted: false,
    showStmuMultichannel: false,
    showEssentialServices: false,
    showSensitiveForwarding: false,
    ...overrides,
  };
}

/**
 * Fail-closed resolver for the canonical Participation Wallet.
 * An institution is selected only by an explicit, verified category adapter.
 */
export function resolveWalletRelataAction(
  input: WalletRelataActionInput,
): WalletRelataAction {
  if (
    input.presentationState === "withdrawn" ||
    input.presentationState === "Retirado"
  ) {
    return baseAction("no_verified_forwarding", input, {
      statusOverride: "Retirado",
      stateMessage: "Retirado.",
    });
  }

  if (input.category === "public_transport") {
    const ready = ["Pronto para encaminhar", "ready_to_forward"].includes(
      input.presentationState,
    );
    return baseAction("bus", input, {
      nextStep: ready ? "Você pode preparar o encaminhamento à STMU" : null,
      showStmuAssisted: input.featureFlags.stmuAssistedEnabled,
      showStmuMultichannel:
        !input.featureFlags.stmuAssistedEnabled &&
        input.featureFlags.stmuMultichannelEnabled,
      availabilityMessage:
        input.featureFlags.stmuAssistedEnabled ||
        input.featureFlags.stmuMultichannelEnabled
          ? null
          : "Relato guardado. O encaminhamento assistido não está disponível agora.",
    });
  }

  if (isEssentialServiceCategory(input.category)) {
    const forwardingAvailable =
      input.featureFlags.essentialServicesEnabled &&
      input.featureFlags.essentialForwardingEnabled;
    const ready = ["Pronto para encaminhar", "ready_to_forward"].includes(
      input.presentationState,
    );
    return baseAction("essential_service", input, {
      nextStep:
        forwardingAvailable && ready
          ? "Você pode preparar o encaminhamento"
          : null,
      availabilityMessage: forwardingAvailable
        ? null
        : "Relato guardado. O encaminhamento assistido não está disponível agora.",
      showEssentialServices: forwardingAvailable,
    });
  }

  if (input.category === "sidewalk_accessibility") {
    return sidewalkPresentation(input);
  }

  if (input.category === "public_health") {
    const healthIssueType =
      typeof input.metadata.healthIssueType === "string"
        ? (input.metadata.healthIssueType as HealthIssueType)
        : null;
    return baseAction(
      input.featureFlags.sensitiveForwardingEnabled
        ? "sensitive_service"
        : "no_verified_forwarding",
      input,
      {
      detailLabel:
        healthIssueType && healthIssueType in HEALTH_ISSUE_TYPE_LABELS
          ? HEALTH_ISSUE_TYPE_LABELS[healthIssueType]
          : null,
      stateMessage: "Guardado no COMUN.",
      nextStep: "Você pode consultar os canais oficiais do SUS.",
        availabilityMessage: input.featureFlags.sensitiveForwardingEnabled
          ? null
          : "O encaminhamento sensível permanece desativado. Nenhum dado de saúde foi enviado.",
        showSensitiveForwarding:
          input.featureFlags.sensitiveForwardingEnabled,
      },
    );
  }

  if (input.category === "public_education") {
    const educationIssueType =
      typeof input.metadata.educationIssueType === "string"
        ? (input.metadata.educationIssueType as EducationIssueType)
        : null;
    const childSafetySignal = input.metadata.childSafetySignal === true;
    return baseAction(
      input.featureFlags.sensitiveForwardingEnabled
        ? "sensitive_service"
        : "no_verified_forwarding",
      input,
      {
      detailLabel:
        educationIssueType && educationIssueType in EDUCATION_ISSUE_TYPE_LABELS
          ? EDUCATION_ISSUE_TYPE_LABELS[educationIssueType]
          : null,
      stateMessage: "Guardado no COMUN.",
      nextStep: childSafetySignal
        ? "Consulte a rede de proteção; um canal educacional não é suficiente para este sinal."
        : "Você pode consultar os canais oficiais da Educação.",
        availabilityMessage: input.featureFlags.sensitiveForwardingEnabled
          ? null
          : "O encaminhamento sensível permanece desativado. Nenhum dado educacional foi enviado.",
        showSensitiveForwarding:
          input.featureFlags.sensitiveForwardingEnabled,
      },
    );
  }

  if (input.category === "child_protection") {
    const available =
      input.featureFlags.sensitiveForwardingEnabled &&
      input.featureFlags.childProtectionChannelOnlyEnabled;
    return baseAction(available ? "sensitive_service" : "no_verified_forwarding", input, {
      detailLabel: null,
      statusOverride: "Guardado com proteção reforçada",
      stateMessage: "Este registro não será publicado.",
      nextStep:
        input.metadata.immediateDanger === true
          ? "Situação que pode exigir ajuda imediata."
          : "Canais de proteção estão disponíveis para consulta.",
      availabilityMessage: available
        ? null
        : "O encaminhamento sensível permanece desativado. Nenhum dado foi enviado.",
      showSensitiveForwarding: available,
    });
  }

  if (
    input.category === "waste_or_debris" ||
    input.category === "smoke_or_environmental_trace" ||
    input.category === "environmental_pollution" ||
    input.category === "urban_flooding" ||
    input.category === "stormwater_drainage" ||
    input.category === "tree_hazard"
  ) {
    const urgent = ["urgent", "emergency"].includes(
      String(input.metadata.urgency ?? ""),
    );
    const civicAvailable =
      input.featureFlags.civicForwardingEnabled === true && !urgent;
    return baseAction("no_verified_forwarding", input, {
      stateMessage: "Guardado no COMUN.",
      nextStep: urgent
        ? "Situação que pode exigir atendimento imediato."
        : civicAvailable
          ? "Você pode revisar o que será levado ao serviço."
          : null,
      availabilityMessage: civicAvailable ? null : NO_VERIFIED_FORWARDING,
    });
  }

  const isPhotoOnly =
    input.metadata.captureBasis === "photo_only" ||
    input.metadata.semanticTextState === "absent";
  return baseAction("no_verified_forwarding", input, {
    stateMessage: "Guardado no COMUN.",
    nextStep:
      input.category === "other" && isPhotoOnly
        ? "Acrescente contexto para classificar"
        : null,
    availabilityMessage: NO_VERIFIED_FORWARDING,
  });
}
