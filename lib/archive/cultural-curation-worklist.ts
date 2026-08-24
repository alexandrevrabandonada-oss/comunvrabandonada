import type {
  CulturalCurationReadiness,
  CulturalSpecialization,
} from "./cultural-curation-readiness";
import { humanizeCurationBlocker } from "./cultural-curation-copy";

export type CulturalWorkStage =
  | "arrived"
  | "needs_information"
  | "can_become_draft"
  | "in_preparation"
  | "ready_for_review"
  | "needs_routing";

export type CulturalCurationWorkItem = {
  sourceType: "archive_submission" | "artwork_submission" | "oral_history_suggestion" | "radio_contribution";
  sourceId: string;
  specialization: CulturalSpecialization;
  title: string;
  protocolOrLabel: string;
  createdAt: string;
  territoryLabel?: string | null;
  sourceStatus: string;
  stage: CulturalWorkStage;
  attention: "normal" | "attention" | "high";
  situationLabel: string;
  situationDetail: string;
  nextActionLabel: string;
  detailHref: string;
  rootHref?: string | null;
  rootExists: boolean;
  publicationEligible: false;
};

export type WorklistProjectionInput = Omit<CulturalCurationWorkItem,
  "stage" | "situationLabel" | "situationDetail" | "nextActionLabel" | "publicationEligible"
> & {
  readiness: CulturalCurationReadiness;
  routingRequired?: boolean;
};

const terminalStatuses = new Set(["rejected", "archived", "withdrawn", "published"]);
const informationBlockers = new Set([
  "missing_specialization", "incomplete_handoff", "material_incomplete", "provenance_incomplete", "private_root_source_ineligible",
]);
const routingBlockers = new Set([
  "radio_private_root_destination_required", "radio_existing_target_reconciliation_required",
  "artwork_existing_target_reconciliation_required", "music_pipeline_required",
]);

const stageCopy: Record<CulturalWorkStage, { label: string; detail: string; action: string }> = {
  arrived: { label: "Recebido", detail: "A contribuição chegou e ainda precisa da primeira triagem.", action: "Abrir para começar a triagem" },
  needs_information: { label: "Precisa de informação", detail: "Ainda faltam dados mínimos para continuar com segurança.", action: "Abrir e completar as informações" },
  can_become_draft: { label: "Pode virar rascunho privado", detail: "O envelope está suficiente para uma decisão editorial explícita.", action: "Abrir e decidir" },
  in_preparation: { label: "Em preparação", detail: "O rascunho privado existe e ainda há trabalho especializado pela frente.", action: "Abrir e continuar o preparo" },
  ready_for_review: { label: "Pronto para revisão editorial", detail: "Os gates de readiness estão completos; publicação continua separada.", action: "Abrir para revisar" },
  needs_routing: { label: "Precisa de encaminhamento", detail: "A contribuição deve seguir para o destino especializado correto.", action: "Abrir e escolher o destino" },
};

export function projectCulturalCurationWorkItem(input: WorklistProjectionInput): CulturalCurationWorkItem | null {
  if (terminalStatuses.has(input.sourceStatus)) return null;
  const { readiness } = input;
  let stage: CulturalWorkStage;

  if (readiness.readyForEditorialReview) stage = "ready_for_review";
  else if (input.routingRequired || readiness.blockers.some((code) => routingBlockers.has(code))) stage = "needs_routing";
  else if (input.rootExists) stage = "in_preparation";
  else if (readiness.readyForPrivateRootCreation) stage = "can_become_draft";
  else if (readiness.blockers.some((code) => informationBlockers.has(code))) stage = "needs_information";
  else if (["draft", "submitted", "pending", "triage"].includes(input.sourceStatus)) stage = "arrived";
  else stage = "needs_information";

  const primary = readiness.blockers[0] ? humanizeCurationBlocker(readiness.blockers[0]) : null;
  const base = stageCopy[stage];
  return {
    ...input,
    stage,
    situationLabel: stage === "in_preparation" && primary ? primary.title : base.label,
    situationDetail: primary && stage !== "ready_for_review" && stage !== "can_become_draft" ? primary.explanation : base.detail,
    nextActionLabel: primary && stage !== "ready_for_review" && stage !== "can_become_draft" ? primary.nextAction : base.action,
    publicationEligible: false,
  };
}

const priority: Record<CulturalWorkStage, number> = {
  in_preparation: 0,
  ready_for_review: 1,
  can_become_draft: 2,
  needs_information: 3,
  needs_routing: 4,
  arrived: 5,
};

export function sortCulturalCurationWorklist(items: CulturalCurationWorkItem[]) {
  return [...items].sort((a, b) => {
    const riskA = a.attention === "high" ? -2 : a.attention === "attention" ? -1 : 0;
    const riskB = b.attention === "high" ? -2 : b.attention === "attention" ? -1 : 0;
    return riskA - riskB || priority[a.stage] - priority[b.stage] || Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
}

export function formatCulturalWorkAge(createdAt: string, now = new Date()) {
  const days = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86_400_000));
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 14) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (days < 60) return `há ${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}

export const culturalWorkStageLabels: Record<CulturalWorkStage, string> = Object.fromEntries(
  Object.entries(stageCopy).map(([key, value]) => [key, value.label]),
) as Record<CulturalWorkStage, string>;
