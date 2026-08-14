import Link from "next/link";
import { Section } from "@/components/comun-shell";
import type { PublicPautaCycleMemoryV1 } from "@/lib/comun-pauta-cycle-memory";

const resultLabels = {
  confirmed: "Resultado confirmado",
  in_verification: "Resultado registrado, ainda em verificação",
  contested: "Resultado contestado",
  recorded: "Resultado público registrado",
} as const;

function DateText({ value }: { value: string | null }) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return (
    <time dateTime={value} className="text-xs font-black uppercase text-comun-asphalt/65">
      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(parsed)}
    </time>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <p className="paper-panel border-2 border-dashed border-comun-black/45 p-4 text-sm text-comun-asphalt/75">
      {children}
    </p>
  );
}

function Chapter({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`memory-${eyebrow}`} className="border-t-2 border-comun-paper/20 pt-7">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-comun-paper/60">
        {eyebrow}
      </p>
      <h3 id={`memory-${eyebrow}`} className="mt-1 text-xl font-black uppercase text-comun-yellow">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function PautaCycleMemory({
  memory,
  primary = false,
}: {
  memory: PublicPautaCycleMemoryV1;
  primary?: boolean;
}) {
  const { chapters } = memory;
  return (
    <Section>
      <div id="historia" className="scroll-mt-24" />
      <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/60">
        Memória coletiva
      </p>
      <h2 className="comun-prose mt-2 max-w-4xl text-3xl font-black uppercase text-comun-yellow">
        {primary ? "O que aconteceu com esta pauta?" : "O caminho até aqui"}
      </h2>
      <p className="comun-prose mt-3 max-w-3xl text-comun-paper/78">
        Uma leitura pública do que foi aprendido, decidido, feito e registrado até agora.
      </p>

      <div className="mt-8 grid gap-8">
        <Chapter eyebrow="01" title="A questão">
          <div className="paper-panel border-2 border-comun-black p-5">
            <p className="comun-prose text-lg font-black">
              {chapters.issue.problem ?? memory.pauta.title}
            </p>
            {chapters.issue.summary ? (
              <p className="comun-prose mt-3 text-comun-asphalt/80">{chapters.issue.summary}</p>
            ) : null}
            {chapters.issue.demand ? (
              <p className="comun-prose mt-4 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/80">
                <strong>O que se busca:</strong> {chapters.issue.demand}
              </p>
            ) : null}
          </div>
        </Chapter>

        <Chapter eyebrow="02" title="O que aprendemos">
          <div className="grid gap-3 lg:grid-cols-2">
            {chapters.evidence.map((item) => (
              <article key={item.sourceId} className="paper-panel border-2 border-comun-black p-4">
                <h4 className="font-black uppercase">{item.title}</h4>
                {item.summary ? <p className="comun-prose mt-2 text-sm text-comun-asphalt/78">{item.summary}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <DateText value={item.createdAt} />
                  {item.citation ? (
                    <Link href={item.citation.publicPath} className="text-sm font-black underline decoration-2 underline-offset-4">
                      Ver evidência pública
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
            {!chapters.evidence.length ? <Empty>Esta pauta ainda não possui evidências públicas vinculadas.</Empty> : null}
          </div>
        </Chapter>

        <Chapter eyebrow="03" title="Como a conversa avançou">
          <div className="grid gap-4">
            {chapters.conversation.map((roda) => (
              <article key={roda.rodaId} className="paper-panel border-2 border-comun-black p-5">
                <h4 className="text-lg font-black uppercase">{roda.title}</h4>
                <p className="comun-prose mt-2 text-comun-asphalt/80">{roda.question}</p>
                <div className="mt-4 grid gap-4">
                  {roda.rounds.map((round) => (
                    <section key={round.roundId} className="border-l-4 border-comun-yellow pl-4">
                      <h5 className="font-black">{round.title}</h5>
                      <p className="comun-prose mt-1 text-sm text-comun-asphalt/75">{round.synthesis.publicSummary}</p>
                      {round.synthesis.agreements.length ? <p className="mt-2 text-sm"><strong>Pontos de acordo:</strong> {round.synthesis.agreements.join(" · ")}</p> : null}
                      {round.synthesis.disagreements.length ? <p className="mt-2 text-sm"><strong>Divergências abertas:</strong> {round.synthesis.disagreements.join(" · ")}</p> : null}
                      {round.synthesis.openQuestions.length ? <p className="mt-2 text-sm"><strong>O que ainda precisamos saber:</strong> {round.synthesis.openQuestions.join(" · ")}</p> : null}
                      {round.synthesis.proposedNextSteps.length ? <p className="mt-2 text-sm"><strong>Próximos passos sugeridos:</strong> {round.synthesis.proposedNextSteps.join(" · ")}</p> : null}
                      <DateText value={round.synthesis.publishedAt} />
                    </section>
                  ))}
                  {!roda.rounds.length ? <Empty>Esta Roda ainda não possui uma síntese pública de conversa.</Empty> : null}
                </div>
              </article>
            ))}
            {!chapters.conversation.length ? <Empty>Esta pauta ainda não possui uma síntese pública de conversa.</Empty> : null}
          </div>
        </Chapter>

        <Chapter eyebrow="04" title="O que decidimos">
          <div className="grid gap-3">
            {chapters.decisions.map((decision) => (
              <article key={`${decision.sourceId}:${decision.title}`} className="paper-panel border-2 border-comun-black p-5">
                <h4 className="font-black uppercase">{decision.title}</h4>
                <p className="comun-prose mt-2 text-comun-asphalt/80">{decision.summary}</p>
                {decision.justification ? <p className="comun-prose mt-3 text-sm text-comun-asphalt/70"><strong>Por quê:</strong> {decision.justification}</p> : null}
                <div className="mt-3"><DateText value={decision.decidedAt} /></div>
              </article>
            ))}
            {!chapters.decisions.length ? <Empty>A conversa pública ainda não possui uma decisão publicada.</Empty> : null}
          </div>
        </Chapter>

        <Chapter eyebrow="05" title="O que fizemos">
          <div className="grid gap-4 lg:grid-cols-2">
            {chapters.actions.map((action) => (
              <article key={action.actionId} className="paper-panel border-2 border-comun-black p-5">
                <p className="text-xs font-black uppercase text-comun-asphalt/65">{action.status}</p>
                <h4 className="mt-1 text-lg font-black uppercase">{action.title}</h4>
                <p className="comun-prose mt-2 text-sm text-comun-asphalt/78">{action.summary || action.objective}</p>
                <p className="mt-3 text-xs text-comun-asphalt/65">
                  {action.relation === "explicit_cycle_link"
                    ? "Ação ligada explicitamente ao ciclo desta pauta."
                    : "Ação pública registrada na mesma pauta; esta página não presume causalidade."}
                </p>
                {action.updates.map((update) => (
                  <div key={update.updateId} className="mt-4 border-l-4 border-comun-yellow pl-3">
                    <p className="font-black">{update.title}</p>
                    <p className="comun-prose mt-1 text-sm text-comun-asphalt/75">{update.summary}</p>
                    <DateText value={update.occurredAt} />
                  </div>
                ))}
                {action.forwarding ? (
                  <p className="comun-prose mt-4 text-sm text-comun-asphalt/75">
                    <strong>Etapa institucional pública:</strong>{" "}
                    {action.forwarding.summary ?? action.forwarding.state}
                  </p>
                ) : null}
                {action.institutionalProtocol ? (
                  <div className="mt-4 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/75">
                    <p className="font-black">
                      {action.institutionalProtocol.kind === "official"
                        ? "Protocolo oficial"
                        : "Acompanhamento COMUN"}
                    </p>
                    <p className="mt-1">{action.institutionalProtocol.summary}</p>
                    <p className="mt-1 text-xs">
                      {action.institutionalProtocol.code} · {action.institutionalProtocol.status}
                    </p>
                    <DateText value={action.institutionalProtocol.responseReceivedAt} />
                  </div>
                ) : null}
                <Link href={`/comun/acoes/${action.slug}`} className="mt-4 inline-flex min-h-11 items-center font-black underline decoration-2 underline-offset-4">
                  Ver ação coletiva
                </Link>
              </article>
            ))}
            {!chapters.actions.length ? <Empty>Ainda não há uma ação coletiva pública ligada a esta pauta.</Empty> : null}
          </div>
        </Chapter>

        <Chapter eyebrow="06" title="O que aconteceu">
          <div className="grid gap-3">
            {chapters.results.map((result) => (
              <article key={result.sourceId} className="paper-panel border-2 border-comun-black p-5">
                <p className="text-xs font-black uppercase text-comun-asphalt/65">{resultLabels[result.state]}</p>
                <h4 className="mt-1 font-black uppercase">{result.title}</h4>
                <p className="comun-prose mt-2 text-comun-asphalt/80">{result.summary}</p>
                {result.evidenceSummary ? <p className="comun-prose mt-2 text-sm text-comun-asphalt/70">{result.evidenceSummary}</p> : null}
                <div className="mt-3"><DateText value={result.occurredAt} /></div>
              </article>
            ))}
            {!chapters.results.length ? <Empty>Ainda não há resultado público registrado.</Empty> : null}
          </div>
        </Chapter>

        <Chapter eyebrow="07" title="O que aprendemos depois">
          <div className="grid gap-4">
            {chapters.learnings.map((learning) => (
              <article key={learning.actionId} className="paper-panel border-2 border-comun-black p-5">
                <h4 className="font-black uppercase">{learning.actionTitle}</h4>
                {learning.memorySummary ? <p className="comun-prose mt-2 text-comun-asphalt/80">{learning.memorySummary}</p> : null}
                {learning.learnedSummary ? <p className="comun-prose mt-3 text-sm text-comun-asphalt/75"><strong>Aprendizado:</strong> {learning.learnedSummary}</p> : null}
                {learning.nextStepsSummary ? <p className="comun-prose mt-3 text-sm text-comun-asphalt/75"><strong>Próximos passos:</strong> {learning.nextStepsSummary}</p> : null}
                <div className="mt-3"><DateText value={learning.publishedAt} /></div>
                {learning.assets.map((asset) => (
                  <a key={asset.assetId} href={asset.publicUrl} className="mt-3 block font-black underline decoration-2 underline-offset-4">
                    {asset.title}
                  </a>
                ))}
              </article>
            ))}
            {!chapters.learnings.length ? <Empty>A memória pública das ações ainda não foi publicada.</Empty> : null}
          </div>
        </Chapter>

        {chapters.editorialSyntheses.length ? (
          <Chapter eyebrow="Sínteses" title="Leituras editoriais publicadas">
            <div className="grid gap-3 lg:grid-cols-2">
              {chapters.editorialSyntheses.map((dossier) => (
                <Link key={dossier.dossierId} href={dossier.publicPath} className="paper-panel border-2 border-comun-black p-4">
                  <p className="text-xs font-black uppercase text-comun-asphalt/65">Síntese editorial · {dossier.versionLabel}</p>
                  <h4 className="mt-2 font-black uppercase">{dossier.title}</h4>
                  <p className="comun-prose mt-2 text-sm text-comun-asphalt/75">{dossier.summary}</p>
                </Link>
              ))}
            </div>
          </Chapter>
        ) : null}

        <Chapter eyebrow="Agora" title="E agora?">
          <div className="paper-panel border-2 border-comun-black p-5">
            <p className="comun-prose text-comun-asphalt/85">
              {memory.currentNextStep ?? "O próximo passo público desta pauta ainda não foi registrado."}
            </p>
            {memory.limitations.length ? (
              <div className="mt-5 border-t-2 border-comun-black/15 pt-4">
                <h4 className="font-black uppercase">O que ainda precisamos saber</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-comun-asphalt/75">
                  {memory.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        </Chapter>
      </div>
    </Section>
  );
}
