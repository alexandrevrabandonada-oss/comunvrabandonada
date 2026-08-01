import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import { ComunShell, Section } from "@/components/comun-shell";
import { getPublicOralHistory } from "@/lib/archive/oral-history";
import {
  createComunEntityContext,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ experiencia?: string }>;
}) {
  const { slug } = await params;
  const data = await getPublicOralHistory(slug);
  if (!data) notFound();
  const appV2 = isComunAppV2((await searchParams).experiencia);
  const interviewees = data.participants
    .filter(
      (participant: any) => participant.participant_role === "interviewee",
    )
    .map((participant: any) => participant.display_name)
    .join(" · ");

  if (appV2) {
    const relations: EntityRelation[] = [
      ...data.collections.flatMap((row: any) => {
        const collection = Array.isArray(row.comun_archive_collections)
          ? row.comun_archive_collections[0]
          : row.comun_archive_collections;
        return collection?.status === "published"
          ? [
              {
                kind: "memory" as const,
                slug: collection.slug,
                title: collection.title,
                href: `/comun/acervo/colecoes/${collection.slug}`,
                source: "junction" as const,
                scope: "Coleção editorial pública que reúne esta entrevista.",
              },
            ]
          : [];
      }),
      ...data.relations.flatMap((row: any) => {
        const target = Array.isArray(row.comun_archive_items)
          ? row.comun_archive_items[0]
          : row.comun_archive_items;
        return target?.status === "published" && target.visibility === "public"
          ? [
              {
                kind: "memory" as const,
                slug: target.slug,
                title: target.title,
                href: `/comun/acervo/${target.slug}`,
                source: "junction" as const,
                scope: row.public_note || "Relação editorial publicada.",
              },
            ]
          : [];
      }),
    ];
    const context = createComunEntityContext({
      kind: "memory",
      id: data.item.id,
      slug,
      title: data.item.title,
      state: "Revisada",
      summary: data.history.public_summary,
      primaryAction: data.audio.length
        ? {
            href: `/comun/acervo/historias-orais/${slug}#audio-autorizado`,
            label: "Ouvir áudio autorizado",
            description:
              "Acesse somente a versão permitida pelas pessoas participantes.",
          }
        : data.transcript
          ? {
              href: `/comun/acervo/historias-orais/${slug}#transcricao-publica`,
              label: "Ler transcrição pública",
            }
          : undefined,
      relations,
    });
    return (
      <ComunShell
        appBar={{
          title: data.item.title,
          contextLabel: "Acervo · história oral",
          backDestination: "/comun/acervo/historias-orais",
        }}
      >
        <main
          className="comun-v2-page"
          data-comun-app-v2-page="oral-history-detail"
        >
          <ComunEntityHeader context={context} />
          {interviewees ? (
            <p className="mt-4 font-bold text-comun-paper/78">{interviewees}</p>
          ) : null}
          <ComunRelationRail relations={relations} />
          {data.history.editorial_context_public ? (
            <aside className="surface-alert mt-7 rounded-[var(--comun-radius-card)] p-5 text-comun-black">
              <b>Aviso editorial</b>
              <p className="mt-2">{data.history.editorial_context_public}</p>
            </aside>
          ) : null}
          {data.audio.length ? (
            <ComunRelatedSection id="audio-autorizado" title="Áudio autorizado">
              {data.audio.map((audio: any) => (
                <audio
                  key={audio.id}
                  className="w-full"
                  controls
                  controlsList={audio.allow_download ? "" : "nodownload"}
                  preload="metadata"
                  src={audio.public_url}
                >
                  Use a transcrição abaixo.
                </audio>
              ))}
            </ComunRelatedSection>
          ) : null}
          {data.transcript ? (
            <ComunRelatedSection
              id="transcricao-publica"
              title="Transcrição pública"
            >
              {data.transcript.contains_redactions ? (
                <p className="mb-3 text-sm text-comun-paper/72">
                  Esta versão contém cortes editoriais sinalizados.
                </p>
              ) : null}
              <div className="surface-memory whitespace-pre-wrap rounded-[var(--comun-radius-cultural)] p-5 text-comun-black">
                {data.transcript.content}
              </div>
            </ComunRelatedSection>
          ) : null}
          {data.segments.length ? (
            <ComunRelatedSection title="Trechos autorizados">
              {data.segments.map((segment: any) => (
                <blockquote
                  key={segment.id}
                  className="mt-3 border-l-4 border-comun-yellow pl-4"
                >
                  {segment.public_text}
                </blockquote>
              ))}
            </ComunRelatedSection>
          ) : null}
          <p className="mt-8 text-sm text-comun-paper/70">
            Créditos: {data.item.credits ?? "Equipe COMUN"}. Para correção,
            restrição ou retirada, use o canal indicado nesta página.
          </p>
          <Link
            href={withComunAppV2(
              "/comun/acervo/historias-orais/direitos-e-retirada",
            )}
            className="mt-4 inline-flex min-h-11 items-center font-black underline"
          >
            Correção, restrição ou retirada
          </Link>
        </main>
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <Section>
        <p className="text-xs font-black uppercase text-comun-yellow">
          História oral revisada
        </p>
        <h1 className="mt-2 text-4xl font-black uppercase">
          {data.item.title}
        </h1>
        <p className="mt-3">{interviewees}</p>
        <p className="mt-4 max-w-3xl">{data.history.public_summary}</p>
        {data.audio.map((audio: any) => (
          <section className="mt-6" key={audio.id}>
            <h2 className="text-2xl font-black uppercase">Áudio autorizado</h2>
            <audio
              className="mt-3 w-full"
              controls
              controlsList={audio.allow_download ? "" : "nodownload"}
              preload="metadata"
              src={audio.public_url}
            />
          </section>
        ))}
        {data.transcript ? (
          <section className="mt-8">
            <h2 className="text-2xl font-black uppercase">
              Transcrição pública
            </h2>
            <div className="mt-4 whitespace-pre-wrap border-2 border-comun-black bg-white p-5 text-comun-black">
              {data.transcript.content}
            </div>
          </section>
        ) : null}
      </Section>
    </ComunShell>
  );
}
