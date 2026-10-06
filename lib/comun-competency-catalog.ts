export const COMUN_COMPETENCY_CATALOG_VERSION =
  "comun-competency-catalog-r0" as const;

export type ComunCompetencyCatalogEntry = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly evidenceRule: string;
};

export const COMUN_COMPETENCY_CATALOG_R0: readonly ComunCompetencyCatalogEntry[] =
  [
    {
      id: "problem-framing",
      label: "Formulação de problema e objetivo",
      description:
        "Distingue condição observável, hipótese, lacuna e objetivo verificável.",
      evidenceRule:
        "Exige revisão de prática real; conclusão de missão isolada não demonstra a competência.",
    },
    {
      id: "evidence-handling",
      label: "Investigação e uso responsável de evidências",
      description:
        "Localiza fontes adequadas, registra origem e limites e protege dados desnecessários.",
      evidenceRule:
        "Exige evidência revisada em contexto real; volume de fontes não substitui qualidade.",
    },
    {
      id: "community-facilitation",
      label: "Escuta e facilitação comunitária",
      description:
        "Conduz escuta e conversa com consentimento, síntese, responsabilidade e retorno.",
      evidenceRule:
        "Exige prática revisada; participação em reunião não equivale a facilitação demonstrada.",
    },
    {
      id: "strategic-cycle",
      label: "Construção e revisão de ciclo estratégico",
      description:
        "Liga objetivo, hipótese, ação, responsável, marco e revisão com base em resultado.",
      evidenceRule:
        "Exige ciclo aplicado e revisado; plano escrito sem execução não é demonstração completa.",
    },
  ] as const;

export type ComunLearningPracticeState =
  | "pending"
  | "validated"
  | "revision_requested";

export type ComunCompetencyCandidate = {
  readonly competencyId: string;
  readonly missionId: string;
  readonly contributionScope: string;
};

const PRACTICE_TO_COMPETENCY: Readonly<
  Record<string, readonly ComunCompetencyCandidate[]>
> = {
  "o-que-e-um-problema": [
    {
      competencyId: "problem-framing",
      missionId: "o-que-e-um-problema",
      contributionScope: "Descrição de condição observável e lacunas.",
    },
  ],
  "objetivo-observavel": [
    {
      competencyId: "problem-framing",
      missionId: "objetivo-observavel",
      contributionScope: "Definição de objetivo verificável.",
    },
  ],
  "minha-primeira-pauta": [
    {
      competencyId: "problem-framing",
      missionId: "minha-primeira-pauta",
      contributionScope: "Síntese de problema, evidência, lacuna e objetivo.",
    },
  ],
  "fonte-primaria": [
    {
      competencyId: "evidence-handling",
      missionId: "fonte-primaria",
      contributionScope: "Localização e contextualização de fonte original.",
    },
  ],
  "transparencia-e-lai": [
    {
      competencyId: "evidence-handling",
      missionId: "transparencia-e-lai",
      contributionScope: "Formulação delimitada de busca ou pedido de informação.",
    },
  ],
  "adicionar-evidencia": [
    {
      competencyId: "evidence-handling",
      missionId: "adicionar-evidencia",
      contributionScope: "Registro revisável de afirmação, fonte e limite.",
    },
  ],
  "conversa-individual": [
    {
      competencyId: "community-facilitation",
      missionId: "conversa-individual",
      contributionScope: "Escuta, convite e retorno com participação voluntária.",
    },
  ],
  "facilite-de-verdade": [
    {
      competencyId: "community-facilitation",
      missionId: "facilite-de-verdade",
      contributionScope: "Facilitação curta com síntese e encaminhamento.",
    },
  ],
  "primeiro-ciclo-estrategico": [
    {
      competencyId: "strategic-cycle",
      missionId: "primeiro-ciclo-estrategico",
      contributionScope:
        "Registro aplicado de objetivo, hipótese, ação, marco e revisão.",
    },
  ],
};

export function listCompetencyCandidatesFromLearningPractice(input: {
  readonly missionId: string;
  readonly state: ComunLearningPracticeState;
}): readonly ComunCompetencyCandidate[] {
  if (input.state !== "validated") return [];
  return PRACTICE_TO_COMPETENCY[input.missionId] ?? [];
}

export function getComunCompetencyCatalogEntry(id: string) {
  return COMUN_COMPETENCY_CATALOG_R0.find((entry) => entry.id === id) ?? null;
}
