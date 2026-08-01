import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { listPublicRadio } from "@/lib/radio";
export default async function RadioPage() {
  const { programs, episodes, schedule } = await listPublicRadio();
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
