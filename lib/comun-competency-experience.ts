import type {
  ComunCompetencyClaim,
  ComunCompetencyEvidence,
} from "./comun-competency-evidence";
import { validateComunCompetencyClaim } from "./comun-competency-evidence";

export const COMUN_COMPETENCY_EXPERIENCE_VERSION =
  "comun-competency-experience-v0" as const;

export type ComunCompetencyExperienceState =
  | "building_evidence"
  | "awaiting_review"
  | "demonstrated"
  | "review_due"
  | "retired";

export type ComunCompetencyExperienceCard = {
  readonly id: string;
  readonly competencyId: string;
  readonly label: string;
  readonly scope: string;
  readonly state: ComunCompetencyExperienceState;
  readonly stateLabel: string;
  readonly guidance: string;
  readonly publicVisibility: "private" | "public";
  readonly matching: "off" | "on";
  readonly demonstratedAt: string | null;
  readonly reviewDueAt: string | null;
  readonly evidenceCount: number;
};

const STATE_LABELS: Record<ComunCompetencyExperienceState, string> = {
  building_evidence: "Construindo evidência",
  awaiting_review: "Aguardando revisão",
  demonstrated: "Demonstrada",
  review_due: "Precisa revisar",
  retired: "Arquivada",
};

const GUIDANCE: Record<ComunCompetencyExperienceState, string> = {
  building_evidence:
    "Continue praticando em trabalho real. Estudo sozinho não conclui esta competência.",
  awaiting_review:
    "Há evidência registrada, mas outra pessoa ainda precisa revisar a demonstração.",
  demonstrated:
    "Há evidência validada para este escopo. Você controla publicação e sugestões de tarefas separadamente.",
  review_due:
    "A demonstração precisa ser atualizada antes de voltar a ser usada para sugestões de tarefas.",
  retired:
    "Esta afirmação foi encerrada e não deve ser usada como capacidade vigente.",
};

function deriveState(
  claim: ComunCompetencyClaim,
  evidence: readonly ComunCompetencyEvidence[],
): ComunCompetencyExperienceState {
  if (claim.state === "retired") return "retired";
  if (claim.state === "review_due") return "review_due";
  if (claim.state === "demonstrated") {
    return validateComunCompetencyClaim(claim, evidence).length === 0
      ? "demonstrated"
      : "awaiting_review";
  }

  const linked = new Map(evidence.map((item) => [item.id, item] as const));
  const hasAnyEvidence = claim.evidenceIds.some((id) => linked.has(id));
  return hasAnyEvidence ? "awaiting_review" : "building_evidence";
}

export function buildComunCompetencyExperienceCard(
  claim: ComunCompetencyClaim,
  evidence: readonly ComunCompetencyEvidence[],
): ComunCompetencyExperienceCard {
  const state = deriveState(claim, evidence);

  return {
    id: claim.id,
    competencyId: claim.competencyId,
    label: claim.label,
    scope: claim.scope,
    state,
    stateLabel: STATE_LABELS[state],
    guidance: GUIDANCE[state],
    publicVisibility:
      claim.visibility === "public_opt_in" && state === "demonstrated"
        ? "public"
        : "private",
    matching:
      claim.allowMatching && state === "demonstrated" ? "on" : "off",
    demonstratedAt: state === "demonstrated" ? claim.demonstratedAt : null,
    reviewDueAt: claim.reviewDueAt,
    evidenceCount: claim.evidenceIds.length,
  };
}

export function sortComunCompetencyExperienceCards(
  cards: readonly ComunCompetencyExperienceCard[],
) {
  const priority: Record<ComunCompetencyExperienceState, number> = {
    review_due: 0,
    awaiting_review: 1,
    building_evidence: 2,
    demonstrated: 3,
    retired: 4,
  };

  return [...cards].sort(
    (a, b) =>
      priority[a.state] - priority[b.state] ||
      a.label.localeCompare(b.label, "pt-BR"),
  );
}

export type ComunCompetencyExperienceSummary = {
  readonly total: number;
  readonly demonstrated: number;
  readonly needsAttention: number;
  readonly publicCount: number;
  readonly matchingCount: number;
};

export function summarizeComunCompetencyExperience(
  cards: readonly ComunCompetencyExperienceCard[],
): ComunCompetencyExperienceSummary {
  return {
    total: cards.length,
    demonstrated: cards.filter((card) => card.state === "demonstrated").length,
    needsAttention: cards.filter(
      (card) =>
        card.state === "review_due" || card.state === "awaiting_review",
    ).length,
    publicCount: cards.filter((card) => card.publicVisibility === "public")
      .length,
    matchingCount: cards.filter((card) => card.matching === "on").length,
  };
}
