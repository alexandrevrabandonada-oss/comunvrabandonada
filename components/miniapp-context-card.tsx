import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";
import { sidewalkMiniappDefinition } from "@/lib/sidewalk-miniapp-definition";
import { ComunMiniappCard } from "@/components/comun-cards";
import { withComunAppV2 } from "@/lib/comun-shell-contract";

export function MiniAppContextCard({
  compact = false,
  appV2 = false,
}: {
  compact?: boolean;
  appV2?: boolean;
}) {
  if (appV2)
    return (
      <ComunMiniappCard
        href={withComunAppV2(sidewalkMiniappDefinition.routes.home)}
        contributionHref={withComunAppV2(
          sidewalkMiniappDefinition.routes.contribution,
        )}
        title={sidewalkMiniappDefinition.title}
        objective="Registrar barreiras e acompanhar prioridades"
        territory={sidewalkMiniappDefinition.context.territory.label}
        status="Registros publicados e revisados"
        impact="Prioridades em acompanhamento"
        action={sidewalkMiniappDefinition.primaryAction.label}
      />
    );
  return (
    <article
      className={`border-2 border-comun-black bg-white text-comun-black ${compact ? "p-4" : "p-5"}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center bg-comun-yellow">
          <MapPinned size={21} />
        </span>
        <div>
          <p className="text-xs font-bold">MAPA DAS CALÇADAS · EM ATIVIDADE</p>
          <h3 className="mt-1 text-xl font-black">
            {sidewalkMiniappDefinition.title}
          </h3>
          <p className="mt-2 text-sm text-comun-black/70">
            Registre barreiras, acompanhe prioridades e veja o que virou ação,
            resultado e memória.
          </p>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 border-t border-comun-black/20 pt-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-bold">Pauta</dt>
          <dd>Calçadas em circulação</dd>
        </div>
        <div>
          <dt className="font-bold">Território</dt>
          <dd>{sidewalkMiniappDefinition.context.territory.label}</dd>
        </div>
        <div>
          <dt className="font-bold">O que fazer</dt>
          <dd>Registrar ou atualizar um trecho</dd>
        </div>
        <div>
          <dt className="font-bold">Próxima ação coletiva</dt>
          <dd>Acompanhar prioridades publicadas</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-4">
        <Link
          href={sidewalkMiniappDefinition.routes.home}
          className="inline-flex items-center gap-2 font-black underline"
        >
          Abrir ferramenta <ArrowRight size={17} />
        </Link>
        <Link
          href={sidewalkMiniappDefinition.routes.contribution}
          className="font-bold underline"
        >
          {sidewalkMiniappDefinition.primaryAction.label}
        </Link>
      </div>
    </article>
  );
}

export function ContinueMiniappCard() {
  return (
    <article className="border-l-4 border-comun-yellow bg-white p-4 text-comun-black">
      <p className="text-xs font-bold">CONTINUE DE ONDE PAROU</p>
      <h3 className="mt-1 font-black">Acompanhe o Mapa das Calçadas</h3>
      <p className="mt-2 text-sm">
        Retome contribuições em revisão, prioridades acompanhadas, tarefas e
        respostas pela sua área.
      </p>
      <Link
        href={sidewalkMiniappDefinition.routes.participation}
        className="mt-3 inline-flex font-black underline"
      >
        Abrir Minha participação
      </Link>
    </article>
  );
}
