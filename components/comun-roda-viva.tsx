import Link from "next/link";
import { submitCircleContributionAction } from "@/app/actions";
import { ComunShell, Section } from "@/components/comun-shell";
import type {
  PublicRodaRoundV1,
  PublicRodaV1,
  RodaContributionType,
} from "@/lib/comun-rodas-vivas";
import type { PublicPautaSpace } from "@/lib/pauta-spaces";

const contributionLabels: Record<RodaContributionType, string> = {
  testimony: "Experiência",
  question: "Pergunta",
  evidence: "Evidência pública",
  correction: "Correção",
  proposal: "Proposta",
  counterpoint: "Contraponto",
  task_offer: "Oferta de trabalho",
  support_offer: "Oferta de apoio",
  update: "Atualização",
  memory: "Memória",
};

export function ComunRodaViva({
  pauta,
  roda,
  contributionReceived,
}: {
  pauta: PublicPautaSpace;
  roda: PublicRodaV1;
  contributionReceived: boolean;
}) {
  const current = roda.currentRound;
  return (
    <ComunShell>
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <Link
          href={`/comun/pautas/${pauta.slug}`}
          className="inline-flex min-h-11 items-center font-black uppercase text-comun-yellow underline decoration-2 underline-offset-4"
        >
          ← Voltar à pauta
        </Link>
      </div>
      <Section>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-comun-paper/70">
          Roda Viva · {rodaStateLabel(roda.status)}
        </p>
        <h1 className="comun-prose mt-2 max-w-4xl text-3xl font-black uppercase text-comun-yellow min-[390px]:text-4xl">
          {roda.title}
        </h1>
        <h2 className="comun-prose mt-5 max-w-4xl text-xl font-black text-comun-paper">
          {roda.publicQuestion}
        </h2>
        {roda.publicContext ? (
          <p className="comun-prose mt-4 max-w-4xl text-comun-paper/80">
            {roda.publicContext}
          </p>
        ) : null}
        <p className="mt-5 text-sm text-comun-paper/75">
          Esta é uma conversa organizada em etapas. Contribuições públicas
          passam por moderação antes de aparecer.
        </p>
      </Section>

      {contributionReceived ? (
        <section
          className="bg-comun-black py-4"
          aria-labelledby="roda-confirmacao"
        >
          <div className="mx-auto max-w-6xl px-4">
            <p
              id="roda-confirmacao"
              role="status"
              aria-live="polite"
              tabIndex={-1}
              autoFocus
              className="border-2 border-comun-yellow p-4 font-bold text-comun-paper"
            >
              Contribuição recebida. Ela entra em moderação antes de aparecer
              publicamente.
            </p>
          </div>
        </section>
      ) : null}

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Rodada atual
        </h2>
        {current ? (
          <CurrentRound pauta={pauta} roda={roda} round={current} />
        ) : (
          <Empty text="Esta roda não possui uma rodada pública atual neste momento." />
        )}
      </Section>

      {current ? <Contributions round={current} /> : null}

      <Section>
        <h2 className="text-2xl font-black uppercase text-comun-yellow">
          Histórico da roda
        </h2>
        <div className="mt-4 grid gap-4">
          {roda.pastRounds.map((round) => (
            <PastRound key={round.id} round={round} />
          ))}
          {!roda.pastRounds.length ? (
            <Empty text="Ainda não há rodadas públicas anteriores." />
          ) : null}
        </div>
      </Section>
    </ComunShell>
  );
}

function CurrentRound({
  pauta,
  roda,
  round,
}: {
  pauta: PublicPautaSpace;
  roda: PublicRodaV1;
  round: PublicRodaRoundV1;
}) {
  const canUsePublicForm =
    round.canParticipate &&
    roda.status === "open" &&
    roda.participationMode === "moderated_public";
  return (
    <div className="paper-panel mt-4 border-2 border-comun-black p-5">
      <p className="text-xs font-black uppercase text-comun-asphalt/70">
        {roundStateLabel(round.status)}
      </p>
      <h3 className="comun-prose mt-2 text-xl font-black uppercase">
        {round.title}
      </h3>
      <p className="comun-prose mt-3 text-comun-asphalt/85">
        {round.publicPrompt}
      </p>
      {round.publicGuidance ? (
        <p className="comun-prose mt-3 border-l-4 border-comun-yellow pl-3 text-sm text-comun-asphalt/80">
          {round.publicGuidance}
        </p>
      ) : null}
      {canUsePublicForm ? (
        <ContributionForm pauta={pauta} roda={roda} round={round} />
      ) : (
        <ParticipationClosed mode={roda.participationMode} />
      )}
      <Synthesis round={round} />
    </div>
  );
}

function ContributionForm({
  pauta,
  roda,
  round,
}: {
  pauta: PublicPautaSpace;
  roda: PublicRodaV1;
  round: PublicRodaRoundV1;
}) {
  return (
    <form
      action={submitCircleContributionAction}
      className="mt-6 grid gap-3 border-t-2 border-comun-black pt-5"
    >
      <input type="hidden" name="circle_id" value={roda.id} />
      <input type="hidden" name="round_id" value={round.id} />
      <input type="hidden" name="pauta_slug" value={pauta.slug} />
      <input type="hidden" name="roda_viva" value="1" />
      <label className="hidden">
        Site da empresa
        <input name="company_website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="grid gap-1 text-sm font-black uppercase">
        Como quer aparecer (opcional)
        <input
          name="author_alias"
          maxLength={80}
          className="min-h-11 border-2 border-comun-black px-3"
        />
      </label>
      <fieldset className="grid gap-1">
        <legend className="text-sm font-black uppercase">
          Tipo de contribuição
        </legend>
        <select
          aria-label="Tipo de contribuição"
          name="contribution_type"
          className="min-h-11 border-2 border-comun-black px-3"
          defaultValue="testimony"
        >
          {(
            Object.entries(contributionLabels) as [
              RodaContributionType,
              string,
            ][]
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </fieldset>
      <label className="grid gap-1 text-sm font-black uppercase">
        Sua contribuição
        <textarea
          name="body"
          minLength={24}
          maxLength={6000}
          rows={6}
          required
          className="border-2 border-comun-black p-3"
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
        <input type="checkbox" name="anonymous" className="size-5" />
        Publicar sem mostrar meu nome/apelido
      </label>
      <label className="grid gap-1 text-sm font-black uppercase">
        Confirmação humana: quanto é 2 + 3?
        <input
          name="human_check"
          required
          inputMode="numeric"
          className="min-h-11 border-2 border-comun-black px-3"
        />
      </label>
      <p className="text-xs font-bold text-comun-asphalt/75">
        Não envie CPF, telefone, endereço completo ou dados sensíveis de
        terceiros.
      </p>
      <button
        data-comun-primary-action="true"
        className="min-h-12 border-2 border-comun-black bg-comun-yellow px-5 font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2"
      >
        Contribuir nesta rodada
      </button>
    </form>
  );
}

function ParticipationClosed({
  mode,
}: {
  mode: PublicRodaV1["participationMode"];
}) {
  const text =
    mode === "registered_members"
      ? "Esta rodada recebe contribuições de participantes cadastrados na pauta."
      : mode === "moderated_public"
        ? "Esta rodada não está aberta para novas contribuições."
        : "Esta rodada possui participação restrita.";
  return (
    <p className="mt-5 border-2 border-comun-black bg-comun-yellow/25 p-3 text-sm font-bold">
      {text}
    </p>
  );
}

function Contributions({ round }: { round: PublicRodaRoundV1 }) {
  const groups = new Map<
    RodaContributionType,
    PublicRodaRoundV1["contributions"]
  >();
  for (const item of round.contributions)
    groups.set(item.contributionType, [
      ...(groups.get(item.contributionType) ?? []),
      item,
    ]);
  return (
    <Section>
      <h2 className="text-2xl font-black uppercase text-comun-yellow">
        Contribuições públicas
      </h2>
      <p className="comun-prose mt-2 max-w-3xl text-comun-paper/75">
        Participações visíveis depois da moderação, organizadas por tipo.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[...groups.entries()].map(([type, items]) => (
          <section
            key={type}
            aria-labelledby={`grupo-${type}`}
            className="paper-panel border-2 border-comun-black p-4"
          >
            <h3 id={`grupo-${type}`} className="font-black uppercase">
              {contributionLabels[type]}
            </h3>
            <div className="mt-3 grid gap-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="border-l-4 border-comun-yellow pl-3"
                >
                  <p className="comun-prose text-sm text-comun-asphalt/85">
                    {item.publicBody}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase text-comun-asphalt/70">
                    {item.publicAuthorLabel}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!round.contributions.length ? (
          <Empty text="Ainda não há contribuições públicas nesta rodada." />
        ) : null}
      </div>
      {round.contributionsTruncated ? (
        <p className="mt-4 text-sm text-comun-paper/75">
          Mostrando as 40 contribuições públicas mais antigas desta rodada.
        </p>
      ) : null}
    </Section>
  );
}

function PastRound({ round }: { round: PublicRodaRoundV1 }) {
  return (
    <article className="paper-panel border-2 border-comun-black p-4">
      <p className="text-xs font-black uppercase text-comun-asphalt/70">
        {roundStateLabel(round.status)}
      </p>
      <h3 className="mt-1 font-black uppercase">{round.title}</h3>
      <p className="comun-prose mt-2 text-sm text-comun-asphalt/80">
        {round.publicPrompt}
      </p>
      <Synthesis round={round} />
    </article>
  );
}

function Synthesis({ round }: { round: PublicRodaRoundV1 }) {
  if (round.synthesis.state === "none")
    return (
      <p className="mt-4 text-sm text-comun-asphalt/75">
        Esta rodada ainda não possui síntese pública.
      </p>
    );
  if (round.synthesis.state === "unavailable")
    return (
      <p className="mt-4 border-l-4 border-comun-yellow pl-3 text-sm font-bold">
        A síntese pública está temporariamente indisponível.
      </p>
    );
  const groups = [
    ["Pontos de acordo", round.synthesis.agreements],
    ["Divergências que continuam abertas", round.synthesis.disagreements],
    [
      "O que ainda precisamos saber",
      [...round.synthesis.openQuestions, ...round.synthesis.missingEvidence],
    ],
    ["Próximos passos sugeridos", round.synthesis.proposedNextSteps],
  ] as const;
  return (
    <section className="mt-5 border-t-2 border-comun-black pt-4">
      <h4 className="font-black uppercase">Síntese desta rodada</h4>
      <p className="comun-prose mt-2 text-sm text-comun-asphalt/85">
        {round.synthesis.publicSummary}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {groups
          .filter(([, items]) => items.length)
          .map(([label, items]) => (
            <section key={label}>
              <h5 className="text-sm font-black uppercase">{label}</h5>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="border-2 border-comun-yellow bg-comun-black p-4 text-sm text-comun-paper/80">
      {text}
    </p>
  );
}
function rodaStateLabel(state: PublicRodaV1["status"]) {
  return (
    {
      open: "Aberta",
      synthesizing: "Em síntese",
      decision: "Em decisão",
      action: "Em ação",
      completed: "Concluída",
    } as const
  )[state];
}
function roundStateLabel(state: PublicRodaRoundV1["status"]) {
  return (
    {
      open: "Rodada aberta",
      closed: "Rodada encerrada",
      synthesized: "Rodada sintetizada",
    } as const
  )[state];
}
