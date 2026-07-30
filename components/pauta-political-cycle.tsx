import Link from "next/link";
import {
  pautaActionCycleStages,
  type PautaActionCycleStage,
} from "@/lib/pauta-action-cycle";

const labels: Record<PautaActionCycleStage, string> = {
  contribution: "O que chegou",
  moderation: "O que foi revisado",
  conversation: "Conversa organizada",
  synthesis: "Síntese construída",
  decision: "Decisão da comunidade",
  action: "Ação coletiva",
  tasks: "Tarefas e participação",
  forwarding: "Encaminhamento",
  protocol: "Protocolo",
  response: "Resposta recebida",
  result: "Resultado verificado",
  memory: "Memória coletiva",
  reopened: "Processo reaberto",
};

export function PautaPoliticalCycle({ cycle }: { cycle: any }) {
  if (!cycle) return null;
  const currentIndex = pautaActionCycleStages.indexOf(cycle.currentStage);
  const publicStages = pautaActionCycleStages.filter(
    (stage) => stage !== "reopened" || cycle.currentStage === "reopened",
  );
  return (
    <section className="border-y-2 border-comun-yellow bg-comun-black py-8">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-xs font-black uppercase text-comun-yellow">
          Do relato ao resultado
        </p>
        <h2 className="mt-2 text-3xl font-black uppercase text-comun-paper">
          Caminho desta pauta
        </h2>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Cada passo exige revisão e deixa memória. Atividade realizada não é
          apresentada como problema resolvido.
        </p>
        <ol className="mt-6 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {publicStages.map((stage, index) => {
            const completed = index < currentIndex;
            const current = stage === cycle.currentStage;
            return (
              <li
                key={stage}
                className={`border-2 p-3 ${
                  current
                    ? "border-comun-yellow bg-comun-yellow text-comun-black"
                    : completed
                      ? "border-comun-yellow text-comun-paper"
                      : "border-comun-paper/25 text-comun-paper/55"
                }`}
              >
                <p className="text-xs font-black uppercase">
                  {completed
                    ? "construído"
                    : current
                      ? "etapa atual"
                      : "a seguir"}
                </p>
                <p className="mt-1 font-black uppercase">{labels[stage]}</p>
              </li>
            );
          })}
        </ol>

        {cycle.decision ? (
          <article className="mt-6 border-2 border-comun-yellow bg-comun-paper p-4 text-comun-black">
            <p className="text-xs font-black uppercase">Decisão revisada</p>
            <h3 className="mt-1 text-xl font-black uppercase">
              {cycle.decision.public_title}
            </h3>
            <p className="mt-2">{cycle.decision.public_summary}</p>
            <p className="mt-2 text-sm text-comun-asphalt/75">
              Por quê: {cycle.decision.public_justification}
            </p>
          </article>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {cycle.action ? (
            <Link
              href={`/comun/acoes/${cycle.action.slug}`}
              className="border-2 border-comun-yellow p-4 text-comun-paper"
            >
              <p className="text-xs font-black uppercase text-comun-yellow">
                O que está sendo feito
              </p>
              <h3 className="mt-1 font-black uppercase">
                {cycle.action.title}
              </h3>
              <p className="mt-2 text-sm text-comun-paper/75">
                {cycle.action.summary}
              </p>
            </Link>
          ) : null}
          {cycle.protocol ? (
            <article className="border-2 border-comun-yellow p-4 text-comun-paper">
              <p className="text-xs font-black uppercase text-comun-yellow">
                Encaminhamento oficial
              </p>
              <h3 className="mt-1 font-black uppercase">
                {cycle.protocol.official_protocol_number ??
                  cycle.protocol.comun_protocol}
              </h3>
              <p className="mt-2 text-sm text-comun-paper/75">
                {cycle.protocol.public_summary ??
                  "O resumo público está em revisão."}
              </p>
            </article>
          ) : null}
          {cycle.result ? (
            <article className="border-2 border-comun-yellow p-4 text-comun-paper">
              <p className="text-xs font-black uppercase text-comun-yellow">
                Resultado, não só atividade
              </p>
              <h3 className="mt-1 font-black uppercase">
                {cycle.result.title}
              </h3>
              <p className="mt-2 text-sm text-comun-paper/75">
                {cycle.result.public_summary}
              </p>
            </article>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3">
          {cycle.timeline.map((event: any) => (
            <article
              key={event.id}
              className="border-l-4 border-comun-yellow bg-comun-paper p-4 text-comun-black"
            >
              <p className="text-xs font-black uppercase">
                {labels[event.to_stage as PautaActionCycleStage] ??
                  event.to_stage}
              </p>
              <p className="mt-1 text-sm">{event.public_summary}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 border-2 border-comun-yellow p-4 font-bold text-comun-paper">
          Próximo passo:{" "}
          {cycle.nextAction ?? "A equipe está revisando o próximo passo."}
        </p>
      </div>
    </section>
  );
}
