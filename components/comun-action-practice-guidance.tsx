import { guidanceStageForPublicAction } from "@/lib/comun-practice-guidance";
import { ComunPracticeGuidance } from "@/components/comun-practice-guidance";

export function ComunActionPracticeGuidance({
  status,
  appV2 = true,
}: {
  status: unknown;
  appV2?: boolean;
}) {
  const stage = guidanceStageForPublicAction(status);
  if (!stage) return null;
  return <ComunPracticeGuidance stage={stage} context="action" appV2={appV2} />;
}
