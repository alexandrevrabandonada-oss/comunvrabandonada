import Link from "next/link";
import {
  guidanceStageForPublicAction,
  participationGuidance,
  participationGuidanceHref,
} from "@/lib/comun-practice-guidance";

export function ComunActionPracticeGuidance({
  status,
  appV2 = true,
}: {
  status: unknown;
  appV2?: boolean;
}) {
  const stage = guidanceStageForPublicAction(status);
  if (!stage) return null;
  const guidance = participationGuidance[stage];

  return (
    <details
      data-comun-action-practice-guidance={stage}
      className="my-5 border-2 border-comun-black/25 bg-comun-paper p-4 text-comun-black"
    >
      <summary className="min-h-11 cursor-pointer py-2 font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
        {guidance.title}
      </summary>
      <p className="mt-3 max-w-3xl">{guidance.summary}</p>
      <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5">
        {guidance.checks.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ul>
      <Link
        href={participationGuidanceHref(stage, appV2)}
        prefetch={false}
        className="mt-3 inline-flex min-h-11 items-center font-black underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        Abrir orientação completa
      </Link>
    </details>
  );
}
