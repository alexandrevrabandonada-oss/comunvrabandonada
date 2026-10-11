import Link from "next/link";
import type { ParticipationGuidanceStage } from "@/lib/comun-practice-guidance";
import {
  materialsForGuidance,
  publicPracticeMaterialHref,
} from "@/lib/learning/public-practice-materials";

export function ComunPracticeMaterialLinks({
  stage,
  appV2 = true,
}: {
  stage: ParticipationGuidanceStage;
  appV2?: boolean;
}) {
  return (
    <div className="mt-4" data-comun-practice-material-links={stage}>
      <p className="font-bold">Para aprofundar, sem cadastro</p>
      <ul className="mt-2 space-y-2">
        {materialsForGuidance(stage).map((material) => (
          <li key={material.id}>
            <Link
              href={publicPracticeMaterialHref(material.id, stage, appV2)!}
              prefetch={false}
              className="inline-flex min-h-11 items-center font-bold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {material.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
