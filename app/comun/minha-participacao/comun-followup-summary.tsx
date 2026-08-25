import type { DenunciasFollowupProjection } from "@/lib/comun-denuncias-followup";

export function ComunFollowupSummary({
  projection,
}: {
  projection: DenunciasFollowupProjection;
}) {
  return (
    <div className="grid gap-1 border-l-4 border-comun-yellow bg-[#f8f2e6] p-3" data-comun-followup="true">
      <p className="font-black">{projection.headline}</p>
      <p className="text-sm">{projection.explanation}</p>
      {projection.elapsedLabel ? <p className="text-xs">{projection.elapsedLabel}.</p> : null}
      {projection.officialDeadlineLabel && projection.state === "waiting" ? (
        <p className="text-xs">{projection.officialDeadlineLabel}</p>
      ) : null}
      {projection.nextActionLabel ? <p className="text-sm font-bold">Próximo passo: {projection.nextActionLabel}.</p> : null}
    </div>
  );
}
