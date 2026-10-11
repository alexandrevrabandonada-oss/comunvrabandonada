import { catalog } from "./core";
import { withComunAppV2 } from "../comun-experience";
import type { ParticipationGuidanceStage } from "../comun-practice-guidance";

export const practiceMaterialIds = {
  pauta: ["evidencia-ou-suposicao", "hierarquia-de-fontes"],
  participacao: ["problema-ao-convite", "recursos-obstaculos"],
  resultado: ["limites-da-evidencia", "objetivo-observavel"],
  registro: ["o-que-e-um-problema", "evidencia-ou-suposicao"],
  acompanhamento: ["transparencia-e-lai", "atores-institucionais"],
  devolutiva: ["limites-da-evidencia", "hipotese-de-mudanca"],
} as const satisfies Record<ParticipationGuidanceStage, readonly string[]>;

// Public editorial excerpts only. Quizzes, progress and practice records stay
// in the existing School flow; this reader never loads a session or database.
export function getPublicPracticeMaterial(value: unknown) {
  if (typeof value !== "string") return null;
  if (
    !Object.values(practiceMaterialIds).some((ids) =>
      ids.some((id) => id === value),
    )
  )
    return null;
  const mission = catalog.missions.find((item) => item.id === value);
  if (!mission) return null;
  return {
    id: mission.id,
    title: mission.title,
    concept: mission.concept,
    application: mission.application,
    version: mission.version,
    programTitle: catalog.program.title,
    reviewedAt: catalog.program.reviewedAt,
    editor: catalog.program.editor,
  };
}

export function materialsForGuidance(stage: ParticipationGuidanceStage) {
  return practiceMaterialIds[stage].flatMap((id) => {
    const material = getPublicPracticeMaterial(id);
    return material ? [material] : [];
  });
}

export function publicPracticeMaterialHref(
  id: string,
  stage: ParticipationGuidanceStage,
  appV2 = true,
) {
  if (!materialsForGuidance(stage).some((material) => material.id === id))
    return null;
  return withComunAppV2(`/comun/ajuda/praticas/${id}?etapa=${stage}`, appV2);
}
