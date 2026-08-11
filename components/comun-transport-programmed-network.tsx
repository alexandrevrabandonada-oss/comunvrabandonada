import Link from "next/link";
import {
  deriveScheduledGaps,
  getTransportSource,
  type TransportLine,
} from "@/lib/comun-transport-programmed-network";

function formatDate(value: string | undefined | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
        new Date(`${value}T12:00:00Z`),
      )
    : null;
}

function sourceSummary(line: TransportLine) {
  return (
    getTransportSource(line.timetableSourceId) ??
    getTransportSource(line.itinerarySourceId) ??
    getTransportSource(line.catalogSourceId)
  );
}

function documentGapMessage(dayLabel: string, partial: boolean) {
  return partial
    ? `Este snapshot ainda não normalizou horários de ${dayLabel.toLowerCase()}. Consulte o documento oficial.`
    : `Este documento não apresenta horários de ${dayLabel.toLowerCase()}.`;
}

export function TransportProgrammedNetwork({
  lines,
  operators,
  search,
  operator,
}: {
  lines: readonly TransportLine[];
  operators: readonly string[];
  search: string;
  operator: string;
}) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-comun-paper sm:py-12">
      <header className="max-w-3xl">
        <p className="text-xs font-black uppercase text-comun-yellow">
          Serviço programado oficial
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-[-.04em] sm:text-6xl">
          Observatório do Transporte
        </h1>
        <p className="mt-4 text-lg text-comun-paper/80">
          Linhas, horários e itinerários programados publicados oficialmente.
        </p>
        <p className="mt-4 border-l-4 border-comun-yellow pl-4 font-bold">
          Horários programados não são previsão de chegada nem comprovação de
          que a viagem foi realizada.
        </p>
      </header>

      <form
        className="mt-8 grid gap-3 border-2 border-comun-paper/35 bg-comun-paper p-4 text-comun-black sm:grid-cols-[1fr_auto_auto]"
        method="get"
      >
        <label className="grid gap-1 font-bold">
          Buscar linha, trajeto ou operadora
          <input
            className="min-h-11 border-2 border-comun-black px-3"
            name="busca"
            defaultValue={search}
          />
        </label>
        <label className="grid gap-1 font-bold">
          Operadora
          <select
            className="min-h-11 border-2 border-comun-black px-3"
            name="operadora"
            defaultValue={operator}
          >
            <option value="">Todas as operadoras</option>
            {operators.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 self-end bg-comun-yellow px-4 font-black uppercase">
          Filtrar
        </button>
      </form>

      <p className="mt-5 text-sm font-bold">
        {lines.length} linha(s) mostrada(s) no snapshot oficial.
      </p>
      <section
        className="mt-4 grid gap-3 sm:grid-cols-2"
        aria-label="Catálogo de linhas"
      >
        {lines.map((line) => {
          const source = sourceSummary(line);
          return (
            <article
              className="border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black"
              key={line.id}
            >
              <p className="text-3xl font-black">{line.lineCode}</p>
              <h2 className="mt-1 text-xl font-black">{line.routeLabel}</h2>
              <p className="mt-2 text-sm">
                Operadora no snapshot: <strong>{line.operator}</strong>
              </p>
              {source?.effectiveFrom ? (
                <p className="mt-1 text-sm">
                  Horário oficial vigente desde: {formatDate(source.effectiveFrom)}
                </p>
              ) : (
                <p className="mt-1 text-sm">
                  Horário ainda não normalizado neste snapshot.
                </p>
              )}
              <Link
                className="mt-4 inline-flex min-h-11 items-center bg-comun-yellow px-4 font-black uppercase"
                href={`/comun/observatorios/transporte/linhas/${line.lineCode}`}
              >
                Ver horários e itinerário
              </Link>
            </article>
          );
        })}
      </section>
      {!lines.length ? (
        <p className="mt-8 border-l-4 border-comun-yellow pl-4">
          Nenhuma linha corresponde à busca. O catálogo oficial completo
          continua disponível nas fontes.
        </p>
      ) : null}
      <Methodology />
    </main>
  );
}

export function TransportLineDetail({ line }: { line: TransportLine }) {
  const serviceDays = ["weekday", "saturday", "sunday_holiday"] as const;
  const dayLabels = {
    weekday: "Dias úteis",
    saturday: "Sábado",
    sunday_holiday: "Domingo e feriado",
  };
  const source = sourceSummary(line);
  const timetablePartial = line.timetableStatus === "partial";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-comun-paper sm:py-12">
      <Link className="font-bold underline" href="/comun/observatorios/transporte">
        ← Voltar ao catálogo
      </Link>
      <header className="mt-6">
        <p className="text-xs font-black uppercase text-comun-yellow">
          Serviço programado oficial
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase sm:text-6xl">
          {line.lineCode}
        </h1>
        <p className="mt-3 text-xl">{line.routeLabel}</p>
        <p className="mt-2">
          Operadora no snapshot: <strong>{line.operator}</strong>
        </p>
      </header>

      <section
        className="mt-8 border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black"
        aria-labelledby="timetable"
      >
        <h2 id="timetable" className="text-2xl font-black uppercase">
          Horários programados
        </h2>
        {timetablePartial ? (
          <p className="mt-3 border-l-4 border-comun-yellow pl-3 text-sm">
            Transcrição parcial neste snapshot. Consulte o documento oficial
            para o quadro completo.
          </p>
        ) : null}
        {line.servicePatterns.length ? (
          serviceDays.map((day) => {
            const patterns = line.servicePatterns.filter(
              (pattern) => pattern.serviceDayType === day,
            );
            return (
              <section className="mt-6" key={day}>
                <h3 className="text-lg font-black">{dayLabels[day]}</h3>
                {patterns.length ? (
                  patterns.map((pattern) => {
                    const facts = deriveScheduledGaps(pattern.departures);
                    return (
                      <div
                        className="mt-3 border-l-4 border-comun-yellow pl-4"
                        key={`${day}-${pattern.originLabel}`}
                      >
                        <p className="font-bold">
                          Saída {pattern.originLabel}
                          {pattern.directionLabel
                            ? ` → ${pattern.directionLabel}`
                            : ""}
                        </p>
                        <p className="mt-1 text-sm">
                          Primeira: {facts.first ?? "não informada"} · Última: {" "}
                          {facts.last ?? "não informada"} · {facts.count} partida(s){" "}
                          programada(s)
                          {facts.medianGapMinutes !== null
                            ? ` · Intervalo mediano programado: ${facts.medianGapMinutes} min`
                            : ""}
                        </p>
                        <ol
                          className="mt-3 flex flex-wrap gap-2"
                          aria-label={`Partidas programadas de ${pattern.originLabel}`}
                        >
                          {pattern.departures.map((departure, index) => (
                            <li
                              className="border border-comun-black px-2 py-1 font-mono text-sm"
                              key={`${departure.time}-${index}`}
                            >
                              {departure.time}
                              {departure.serviceDayOffset ? " +1" : ""}
                              {departure.variantCode
                                ? ` (${departure.variantCode})`
                                : ""}
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })
                ) : (
                  <p className="mt-2">
                    {documentGapMessage(dayLabels[day], timetablePartial)}
                  </p>
                )}
              </section>
            );
          })
        ) : (
          <p className="mt-3">
            Consulte o horário oficial: este documento ainda não foi
            normalizado neste snapshot.
          </p>
        )}
      </section>

      <section
        className="mt-6 border-2 border-comun-paper/35 bg-comun-paper p-5 text-comun-black"
        aria-labelledby="itinerary"
      >
        <h2 id="itinerary" className="text-2xl font-black uppercase">
          Itinerários
        </h2>
        {line.itineraryVariants.length ? (
          line.itineraryVariants.map((variant) => (
            <article className="mt-4" key={variant.variantId}>
              <h3 className="font-black">{variant.label}</h3>
              <p className="text-sm">
                Sequência de vias publicada no itinerário oficial.
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-6">
                {variant.streetSequence.map((street) => (
                  <li key={street}>{street}</li>
                ))}
              </ol>
            </article>
          ))
        ) : (
          <p className="mt-3">
            Consulte o itinerário oficial: este documento ainda não foi
            normalizado neste snapshot.
          </p>
        )}
      </section>

      {line.notes.length ? (
        <section className="mt-6 border-l-4 border-comun-yellow pl-4">
          <h2 className="font-black uppercase">Notas e variantes</h2>
          <ul className="mt-2 space-y-1">
            {line.notes.map((note) => (
              <li key={note.code}>
                <strong>{note.code}</strong> — {note.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 text-sm">
        <h2 className="font-black uppercase">Fonte e vigência</h2>
        <p className="mt-2">Fonte oficial: {source?.publisher ?? "Catálogo PMVR/STMU"}</p>
        {source?.orderNumber ? <p>Ordem de Serviço: {source.orderNumber}</p> : null}
        {source?.effectiveFrom ? <p>Vigente desde: {formatDate(source.effectiveFrom)}</p> : null}
        {source ? <p>Documento verificado em: {formatDate(source.retrievedAt.slice(0, 10))}</p> : null}
        {source ? (
          <a
            className="mt-3 inline-flex min-h-11 items-center border-2 border-comun-paper px-4 font-black uppercase"
            href={source.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir documento oficial
          </a>
        ) : null}
      </section>
      <p className="mt-8 border-l-4 border-comun-yellow pl-4 text-sm">
        Os horários são programados. Esta página não contém tempo real, GPS,
        pontos geográficos, relatos ou dados de encaminhamento.
      </p>
      <p className="mt-6">
        <Link
          className="inline-flex min-h-11 items-center bg-comun-yellow px-4 font-black uppercase text-comun-black"
          href="/comun/onibus"
        >
          Seu ônibus não cumpriu o programado? Registrar problema
        </Link>
      </p>
    </main>
  );
}

export function Methodology() {
  return (
    <section className="mt-10 max-w-4xl border-l-4 border-comun-yellow pl-4 text-sm">
      <h2 className="font-black uppercase">Sobre estes dados</h2>
      <p className="mt-2">
        O snapshot reúne documentos oficiais PMVR/STMU verificados em
        11/08/2026. Alterações oficiais não são ingeridas automaticamente.
        Ausência no documento não prova ausência de serviço. Não há tempo real,
        mapa de pontos ou relatos comunitários nesta camada.
      </p>
      <Link
        href="/comun/observatorios/transporte/fontes"
        className="mt-3 inline-block font-black underline"
      >
        Ver fontes e metodologia
      </Link>
    </section>
  );
}
