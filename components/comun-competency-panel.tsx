import type { ComunCompetencyExperienceCard } from "@/lib/comun-competency-experience";

function StateBadge({
  stateLabel,
}: {
  stateLabel: string;
}) {
  return (
    <span className="comun-v2-status">
      {stateLabel}
    </span>
  );
}

export function ComunCompetencyPanel({
  cards,
}: {
  cards: readonly ComunCompetencyExperienceCard[];
}) {
  if (!cards.length) {
    return (
      <section
        aria-labelledby="competency-panel-title"
        className="rounded-[var(--comun-radius-card)] border-2 border-comun-paper/20 p-5"
      >
        <h2
          id="competency-panel-title"
          className="text-xl font-black uppercase text-comun-yellow"
        >
          Minhas competências
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-comun-paper/70">
          Quando uma prática real for revisada e demonstrar uma capacidade,
          ela poderá aparecer aqui. Concluir conteúdo, sozinho, não cria uma
          competência.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="competency-panel-title">
      <div className="mb-4">
        <h2
          id="competency-panel-title"
          className="text-2xl font-black uppercase text-comun-yellow"
        >
          Minhas competências
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-comun-paper/70">
          Capacidades demonstradas em prática real. Publicação e sugestões de
          tarefas são controles separados.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <article
            key={card.id}
            className="rounded-[var(--comun-radius-card)] border-2 border-comun-paper/20 p-5"
          >
            <StateBadge stateLabel={card.stateLabel} />
            <h3 className="mt-3 text-xl font-black">{card.label}</h3>
            <p className="mt-2 text-sm text-comun-paper/75">{card.scope}</p>
            <p className="mt-3 text-sm">{card.guidance}</p>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-black uppercase text-comun-paper/60">
                  Perfil público
                </dt>
                <dd>
                  {card.publicVisibility === "public"
                    ? "Visível por escolha sua"
                    : "Privado"}
                </dd>
              </div>
              <div>
                <dt className="font-black uppercase text-comun-paper/60">
                  Sugestões de tarefas
                </dt>
                <dd>
                  {card.matching === "on"
                    ? "Permitidas"
                    : "Desligadas"}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
