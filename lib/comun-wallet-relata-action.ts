import { isEssentialServiceCategory } from "./comun-essential-services-feature";

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
  workplace: "Trabalho",
  environmental_pollution: "Poluição ambiental",
  other: "A classificar",
} as const;

export type WalletRelataRoute =
  "bus" | "essential_service" | "sidewalk" | "no_verified_forwarding";

export type WalletRelataFeatureFlags = {
  stmuAssistedEnabled: boolean;
  stmuMultichannelEnabled: boolean;
  essentialServicesEnabled: boolean;
  essentialForwardingEnabled: boolean;
};

export type WalletRelataAction = {
  route: WalletRelataRoute;
  categoryLabel: string;
  statusOverride: string | null;
  stateMessage: string | null;
  nextStep: string | null;
  availabilityMessage: string | null;
  showStmuAssisted: boolean;
  showStmuMultichannel: boolean;
  showEssentialServices: boolean;
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
    statusOverride: null,
    stateMessage: null,
    nextStep: null,
    availabilityMessage: null,
    showStmuAssisted: false,
    showStmuMultichannel: false,
    showEssentialServices: false,
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
