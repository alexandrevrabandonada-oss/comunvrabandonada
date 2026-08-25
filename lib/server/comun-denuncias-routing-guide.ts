import type { RelataCategory, RoutingDecision } from "../comun-relata-contract";
import {
  listRelataChannelsFor,
  RELATA_OFFICIAL_SOURCES,
} from "../comun-relata-channels";
import { listInstitutionalChannels } from "./comun-institutional-channel-catalog";
import { listComunHealthInstitutionalChannels } from "./comun-health-institutional-channel-catalog";
import { listComunEducationInstitutionalChannels } from "./comun-education-institutional-channel-catalog";
import { listComunChildProtectionChannels } from "./comun-child-protection-channel-catalog";
import { COMUN_ENVIRONMENTAL_CHANNEL_CATALOG } from "./comun-environmental-channel-catalog";
import { COMUN_URBAN_INCIDENT_CHANNEL_CATALOG } from "./comun-urban-incident-channel-catalog";

/**
 * Read-only projection over the versioned channel catalogs. It is deliberately
 * not a forwarding adapter: opening or preparing a channel never means sent.
 */
export type DenunciasGuideChannel = {
  institution: string;
  label: string;
  destination: string | null;
  sourceUrl: string;
  sourceVerified: boolean;
  operationalStatus: "operationally_unchecked" | "source_only" | "conflicting_sources";
  automationAllowed: false;
  escalationOnly: boolean;
};

export type DenunciasRoutingGuide = {
  category: RelataCategory;
  urgency: RoutingDecision["urgency"];
  headline: string;
  explanation: string;
  immediateAction?: string;
  primaryChannels: DenunciasGuideChannel[];
  escalationSteps: DenunciasGuideChannel[];
  whatYouMayNeed: string[];
  protocolGuidance: string;
  privacyWarning?: string;
  canUseAssistedForwarding: boolean;
  requiresHumanReview: boolean;
  automationAllowed: false;
};

const categoryCopy: Record<RelataCategory, { headline: string; needs: string[]; privacy?: string }> = {
  public_lighting: { headline: "Poste apagado ou com defeito", needs: ["referência aproximada do ponto"] },
  power_distribution: { headline: "Falta de energia", needs: ["período aproximado", "protocolo anterior, se houver"], privacy: "CPF, instalação e senha devem ser informados somente à Light." },
  water_supply: { headline: "Falta d'água", needs: ["referência do local", "horário em que percebeu"] },
  public_transport: { headline: "Problema no transporte", needs: ["linha, ponto e horário, se souber"] },
  electrical_hazard: { headline: "Risco elétrico", needs: [], privacy: "Não se aproxime, não toque e não compartilhe dados pessoais." },
  active_fire: { headline: "Fogo acontecendo agora", needs: [] },
  smoke_or_environmental_trace: { headline: "Fumaça ou vestígio ambiental", needs: ["local aproximado", "quando aconteceu"] },
  sidewalk_accessibility: { headline: "Barreira na calçada", needs: ["referência aproximada", "como a passagem foi afetada"] },
  waste_or_debris: { headline: "Lixo ou entulho", needs: ["referência aproximada do local"] },
  public_health: { headline: "Problema no atendimento SUS", needs: ["nome da unidade, se quiser informar diretamente ao órgão"], privacy: "Não guarde prontuário, diagnóstico, CPF ou dados de paciente no COMUN." },
  public_education: { headline: "Problema na escola", needs: ["rede municipal, estadual ou não sei"], privacy: "Não inclua matrícula, turma, endereço ou dados de estudante." },
  child_protection: { headline: "Proteção de criança ou adolescente", needs: [], privacy: "Priorize segurança. Não exponha dados identificáveis no COMUN." },
  workplace: { headline: "Problema no trabalho", needs: [], privacy: "Situações de trabalho podem exigir avaliação humana e dados sensíveis não devem ser enviados ao COMUN." },
  environmental_pollution: { headline: "Poluição ambiental", needs: ["local aproximado", "momento e descrição factual"] },
  urban_flooding: { headline: "Alagamento", needs: ["referência aproximada e risco atual"] },
  stormwater_drainage: { headline: "Drenagem ou bueiro", needs: ["referência aproximada do ponto"] },
  tree_hazard: { headline: "Árvore em risco", needs: ["referência aproximada e risco observado"] },
  other: { headline: "Vamos entender o que aconteceu", needs: [] },
};

function relataRouteFor(category: RelataCategory) {
  if (category === "power_distribution") return "power_distribution";
  if (category === "active_fire" || category === "electrical_hazard") return "emergency";
  if (
    category === "smoke_or_environmental_trace" ||
    category === "environmental_pollution"
  )
    return "environmental";
  if (category === "public_transport") return "public_transport";
  return "community_review";
}

function fromRelata(category: RelataCategory) {
  return listRelataChannelsFor(relataRouteFor(category))
    .filter(
      (channel) =>
        channel.category === category ||
        channel.category === "cross_category" ||
        (category === "electrical_hazard" && channel.emergency),
    )
    .map((channel) => {
      const source = RELATA_OFFICIAL_SOURCES.find((candidate) =>
        channel.sourceIds.includes(candidate.id),
      );
      return {
        institution: channel.label,
        label: channel.service,
        destination: channel.channelValue,
        sourceUrl: source?.url ?? "",
        sourceVerified: channel.sourceVerified,
        operationalStatus: channel.sourceConflict
          ? ("conflicting_sources" as const)
          : ("source_only" as const),
        automationAllowed: false as const,
        escalationOnly: channel.priorProtocolRequired,
      };
    });
}

function sourceCatalogChannels(category: RelataCategory): DenunciasGuideChannel[] {
  if (["water_supply", "power_distribution", "public_lighting"].includes(category)) return listInstitutionalChannels(category as "water_supply" | "power_distribution" | "public_lighting").map((c) => ({ institution: c.institution, label: c.label, destination: c.destination, sourceUrl: c.sourceUrl, sourceVerified: true, operationalStatus: "operationally_unchecked", automationAllowed: false, escalationOnly: false }));
  if (category === "public_health") return listComunHealthInstitutionalChannels().map((c) => ({ institution: c.institution, label: c.institution, destination: c.destination, sourceUrl: c.sourceUrl, sourceVerified: c.sourceStatus === "source_verified", operationalStatus: "operationally_unchecked", automationAllowed: false, escalationOnly: false }));
  if (category === "public_education") return listComunEducationInstitutionalChannels().filter((c) => !c.protectionOnly).map((c) => ({ institution: c.institution, label: c.institution, destination: c.destination, sourceUrl: c.sourceUrl, sourceVerified: c.sourceStatus === "source_verified", operationalStatus: "operationally_unchecked", automationAllowed: false, escalationOnly: false }));
  if (category === "child_protection") return listComunChildProtectionChannels().map((c) => ({ institution: c.institution, label: c.institution, destination: c.destination, sourceUrl: c.sourceUrls[0] ?? "", sourceVerified: c.sourceStatus === "source_verified", operationalStatus: c.sourceStatus === "source_verified" ? "operationally_unchecked" : "conflicting_sources", automationAllowed: false, escalationOnly: false }));
  const specialized = category === "urban_flooding" || category === "stormwater_drainage" || category === "tree_hazard" ? COMUN_URBAN_INCIDENT_CHANNEL_CATALOG.filter((c) => c.categories.includes(category as never)) : ["active_fire", "smoke_or_environmental_trace", "environmental_pollution", "waste_or_debris"].includes(category) ? COMUN_ENVIRONMENTAL_CHANNEL_CATALOG.filter((c) => c.categories.includes(category as never)) : [];
  return specialized.map((c) => ({ institution: c.institution, label: c.institution, destination: c.destination, sourceUrl: c.sourceUrl, sourceVerified: true, operationalStatus: "operationally_unchecked", automationAllowed: false, escalationOnly: false }));
}

export function guideForDenuncia(decision: RoutingDecision): DenunciasRoutingGuide {
  const copy = categoryCopy[decision.category];
  const emergency = decision.urgency === "emergency";
  const catalog = emergency
    ? fromRelata(decision.category)
    : sourceCatalogChannels(decision.category);
  const relataEscalations =
    decision.category === "power_distribution"
      ? fromRelata(decision.category).filter((channel) => channel.escalationOnly)
      : [];
  const primaryChannels = catalog.filter((channel) => !channel.escalationOnly);
  const escalationSteps = [
    ...catalog.filter((channel) => channel.escalationOnly),
    ...relataEscalations,
  ];
  return { category: decision.category, urgency: decision.urgency, headline: copy.headline, explanation: decision.explanation, immediateAction: emergency ? decision.nextStep : undefined, primaryChannels, escalationSteps, whatYouMayNeed: copy.needs, protocolGuidance: "Seu protocolo no COMUN não é o protocolo do órgão. Se o atendimento externo gerar um número, guarde-o para registrar depois.", privacyWarning: copy.privacy, canUseAssistedForwarding: ["water_supply", "power_distribution", "public_lighting"].includes(decision.category), requiresHumanReview: decision.requiresHumanReview || primaryChannels.length === 0, automationAllowed: false };
}

export const DENUNCIAS_GUIDE_CATEGORIES: readonly RelataCategory[] = Object.keys(categoryCopy) as RelataCategory[];
