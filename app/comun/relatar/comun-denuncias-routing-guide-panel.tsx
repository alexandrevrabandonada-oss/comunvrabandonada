"use client";

import type { ReactNode } from "react";
import type { RoutingDecision } from "@/lib/comun-relata-contract";
import { guideForDenuncia } from "@/lib/server/comun-denuncias-routing-guide";

export function ComunDenunciasRoutingGuidePanel({
  decision,
}: {
  decision: RoutingDecision;
}) {
  const guide = guideForDenuncia(decision);

  return (
    <section
      className="grid gap-3 border-2 border-comun-black bg-[#f8f2e6] p-4"
      aria-labelledby="denuncias-routing-guide-title"
    >
      <div>
        <p className="text-xs font-black uppercase">Como resolver isso</p>
        <h2 id="denuncias-routing-guide-title" className="text-lg font-black">
          {guide.headline}
        </h2>
        <p className="text-sm leading-6">{guide.explanation}</p>
      </div>
      {guide.immediateAction ? (
        <GuideBlock title="Agora">
          <p>{guide.immediateAction}</p>
        </GuideBlock>
      ) : null}
      {guide.primaryChannels.length > 0 ? (
        <GuideBlock title="Onde encaminhar">
          <ul className="grid gap-2">
            {guide.primaryChannels.map((channel) => (
              <li key={`${channel.institution}-${channel.label}`}>
                <a
                  className="font-black underline"
                  href={channel.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {channel.institution}: {channel.label}
                </a>
              </li>
            ))}
          </ul>
        </GuideBlock>
      ) : null}
      {guide.whatYouMayNeed.length > 0 ? (
        <GuideBlock title="Você pode precisar">
          <p>{guide.whatYouMayNeed.join(" · ")}</p>
        </GuideBlock>
      ) : null}
      <GuideBlock title="Protocolo">
        <p>{guide.protocolGuidance}</p>
      </GuideBlock>
      {guide.escalationSteps.length > 0 ? (
        <GuideBlock title="Se não resolver">
          <p>
            Use este próximo passo somente depois do atendimento inicial e
            guarde o protocolo anterior.
          </p>
          <ul className="mt-2 grid gap-2">
            {guide.escalationSteps.map((channel) => (
              <li key={`${channel.institution}-${channel.label}`}>
                <a
                  className="font-black underline"
                  href={channel.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {channel.institution}: {channel.label}
                </a>
              </li>
            ))}
          </ul>
        </GuideBlock>
      ) : null}
      {guide.requiresHumanReview ? (
        <p className="border-l-4 border-comun-red pl-3 text-sm font-bold">
          Este caso precisa de avaliação humana antes de indicar um órgão com
          certeza. O relato continua guardado de forma privada.
        </p>
      ) : null}
      {guide.privacyWarning ? <p className="text-sm">{guide.privacyWarning}</p> : null}
      <p className="text-sm font-bold">
        Preparar ou abrir um encaminhamento não significa que ele foi enviado.
        O COMUN não envia automaticamente a nenhum órgão.
      </p>
    </section>
  );
}

function GuideBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 text-sm">
      <p className="font-black uppercase">{title}</p>
      {children}
    </div>
  );
}
