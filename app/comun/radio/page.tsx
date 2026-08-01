import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { listPublicRadio } from "@/lib/radio";
import { ComunMemoryCard } from "@/components/comun-cards";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
export default async function RadioPage({
  searchParams,
}: {
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const appV2 = isComunAppV2((await searchParams).experiencia);
  const { programs, episodes, schedule } = await listPublicRadio();
  if (appV2)
    return (
      <ComunShell
        appBar={{
          title: "Rádio",
          contextLabel: "Escuta e memória",
          backDestination: "/comun/acervo",
        }}
      >
        <ComunCollectionPage
          kind="memory"
          title="Rádio Comunitária"
          summary="Programas e episódios publicados com contexto, autoria, direitos e relações cívicas somente quando existem."
          actions={
            <Link
              href={withComunAppV2("/comun/radio/contribuir")}
              className="comun-v2-action"
            >
              Enviar proposta ou áudio
            </Link>
          }
          rail={[
            {
              kind: "memory",
              slug: "acervo",
              title: "Acervo",
              href: "/comun/acervo",
              source: "canonical_route",
            },
            {
              kind: "territory",
              slug: "territorios",
              title: "Territórios",
              href: "/comun/territorios",
              source: "canonical_route",
            },
            {
              kind: "pauta",
              slug: "pautas",
              title: "Pautas",
              href: "/comun/pautas",
              source: "canonical_route",
            },
          ]}
        >
          <section aria-labelledby="radio-episodes-v2">
            <h2 id="radio-episodes-v2" className="comun-v2-section-title">
              Últimos episódios
            </h2>
            {episodes.length ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {episodes.map((episode: any) => (
                  <ComunMemoryCard
                    key={episode.archive_item_id}
                    href={withComunAppV2(
                      `/comun/radio/episodios/${episode.slug_public}`,
                    )}
                    title={episode.title_public}
                    summary={episode.summary_public}
                    context={
                      [episode.territory?.name, episode.pauta?.title]
                        .filter(Boolean)
                        .join(" · ") || "Rádio · sem relação cívica publicada"
                    }
                  />
                ))}
              </div>
            ) : (
              <ComunEmptyStateV2
                title="Nenhum episódio publicado"
                explanation="Áudios aparecem depois de revisão editorial, direitos, consentimentos e segurança."
                related="Um programa pode existir sem episódios publicados; relações com pautas não são obrigatórias."
                action={{
                  href: "/comun/radio/contribuir",
                  label: "Enviar proposta ou áudio",
                }}
                secondaryActions={[
                  { href: "/comun/acervo", label: "Explorar o Acervo" },
                ]}
              />
            )}
          </section>
          <section className="mt-8" aria-labelledby="radio-programs-v2">
            <h2 id="radio-programs-v2" className="comun-v2-section-title">
              Programas
            </h2>
            <div className="mt-3 divide-y divide-comun-paper/20">
              {programs.map((program: any) => (
                <Link
                  key={program.archive_item_id}
                  href={withComunAppV2(
                    `/comun/radio/programas/${program.slug_public}`,
                  )}
                  className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 py-3 font-black"
                >
                  <span>
                    <small className="comun-v2-eyebrow block text-comun-paper/55">
                      {program.format_type}
                    </small>
                    {program.title_public}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>
          <p className="mt-7 text-sm text-comun-paper/65">
            Grade editorial: {schedule.length} entradas públicas neste recorte.{" "}
            <Link
              href={withComunAppV2("/comun/radio/grade")}
              className="font-black underline"
            >
              Ver grade
            </Link>
          </p>
        </ComunCollectionPage>
      </ComunShell>
    );
  return (
    <ComunShell>
      <Section>
        <p className="text-xs font-black uppercase text-comun-yellow">
          Comunicação, memória e organização
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-paper sm:text-6xl">
          Rádio Comunitária
        </h1>
        <p className="mt-4 max-w-3xl text-comun-paper/80">
          Programas e episódios permanentes ligados às pautas e aos territórios.
          Sem autoplay, ranking ou transmissão simulada.
        </p>
        <Link
          href="/comun/radio/contribuir"
          prefetch={false}
          className="mt-6 inline-block bg-comun-yellow px-5 py-3 font-black uppercase text-comun-black"
        >
          Proponha um programa ou áudio
        </Link>
        <h2 className="mt-10 text-2xl font-black uppercase">
          Últimos episódios
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {episodes.map((e: any) => (
            <Link
              className="paper-panel border-2 p-5"
              href={`/comun/radio/episodios/${e.slug_public}`}
              prefetch={false}
              key={e.archive_item_id}
            >
              <b className="text-xl">{e.title_public}</b>
              <p>{e.summary_public}</p>
              <small>
                {Math.ceil((e.duration_seconds || 0) / 60)} min · transcrição{" "}
                {e.transcript_status}
              </small>
            </Link>
          ))}
        </div>
        <h2 className="mt-10 text-2xl font-black uppercase">Programas</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {programs.map((p: any) => (
            <Link
              className="paper-panel border-2 p-5"
              href={`/comun/radio/programas/${p.slug_public}`}
              prefetch={false}
              key={p.archive_item_id}
            >
              <b>{p.title_public}</b>
              <p>{p.subtitle_public || p.description_public}</p>
            </Link>
          ))}
        </div>
        <h2 className="mt-10 text-2xl font-black uppercase">Grade editorial</h2>
        <p className="mt-2">
          {schedule.length
            ? `${schedule.length} entradas publicadas.`
            : "Nenhuma estreia agendada."}{" "}
          <Link
            href="/comun/radio/grade"
            prefetch={false}
            className="underline"
          >
            Ver grade
          </Link>
        </p>
      </Section>
    </ComunShell>
  );
}
