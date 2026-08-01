import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import { ComunShell, Section } from "@/components/comun-shell";
import { getPublicRelease } from "@/lib/archive/local-music";
import { createComunEntityContext } from "@/lib/comun-entity-context";
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
  const data = await getPublicRelease(slug);
  if (!data?.release) notFound();
  const release = data.release;
  const cover =
    data.assets.find((asset: any) => asset.id === release.cover_asset_id) ??
    data.assets.find((asset: any) => asset.asset_role === "cover");
  const appV2 = isComunAppV2((await searchParams).experiencia);

  if (appV2) {
    const relations = [
      ...(data.artist
        ? [
            {
              kind: "memory" as const,
              slug: data.artist.slug,
              title: data.artist.title,
              href: `/comun/acervo/artistas/${data.artist.slug}`,
              source: "foreign_key" as const,
              scope: "Artista principal documentado neste lançamento.",
            },
          ]
        : []),
      {
        kind: "memory" as const,
        slug: "musica",
        title: "Música local",
        href: "/comun/acervo/musica",
        source: "canonical_route" as const,
      },
    ];
    const context = createComunEntityContext({
      kind: "memory",
      id: data.item.id,
      slug,
      title: data.item.title,
      state: "Publicado",
      summary: data.item.description ?? data.item.summary ?? undefined,
      primaryAction: data.links.length
        ? {
            href: `/comun/acervo/musica/${slug}#plataformas`,
            label: "Ver plataformas oficiais",
            description: "Escolha uma fonte externa revisada para ouvir.",
          }
        : undefined,
      relations,
    });
    return (
      <ComunShell
        appBar={{
          title: data.item.title,
          contextLabel: "Acervo · música local",
          backDestination: "/comun/acervo/musica",
        }}
      >
        <main className="comun-v2-page" data-comun-app-v2-page="music-detail">
          <ComunEntityHeader context={context} />
          <ComunRelationRail relations={relations} />
          <div className="mt-8 grid gap-6 md:grid-cols-[minmax(220px,320px)_1fr]">
            <aside className="surface-memory rounded-[var(--comun-radius-cultural)] p-3 text-comun-black">
              {cover?.public_url ? (
                <Image
                  src={cover.public_url}
                  alt={cover.alt_text || `Capa de ${data.item.title}`}
                  width={600}
                  height={600}
                  className="aspect-square w-full rounded-[var(--comun-radius-control)] object-cover"
                />
              ) : (
                <div className="grid aspect-square place-items-center border border-dashed border-comun-black/40 p-6 text-center font-black">
                  Capa não disponível
                </div>
              )}
            </aside>
            <div>
              <p className="comun-v2-status text-comun-yellow">
                {release.release_type} ·{" "}
                {release.release_date ??
                  release.release_year ??
                  "data desconhecida"}
              </p>
              <dl className="surface-memory mt-4 grid gap-3 rounded-[var(--comun-radius-cultural)] p-5 text-comun-black sm:grid-cols-2">
                <div>
                  <dt className="font-black">Selo</dt>
                  <dd>{release.label_name || "Não informado"}</dd>
                </div>
                <div>
                  <dt className="font-black">Produção</dt>
                  <dd>{release.producers_public || "Não informada"}</dd>
                </div>
                <div>
                  <dt className="font-black">Gravação</dt>
                  <dd>{release.recording_location || "Não informada"}</dd>
                </div>
                <div>
                  <dt className="font-black">Créditos</dt>
                  <dd>{data.item.credits || "Não informados"}</dd>
                </div>
              </dl>
            </div>
          </div>
          <ComunRelatedSection title="Faixas">
            {data.tracks.length ? (
              <ol className="surface-memory grid gap-2 rounded-[var(--comun-radius-cultural)] p-5 text-comun-black">
                {data.tracks.map((track: any) => (
                  <li
                    key={track.id}
                    className="border-b border-comun-black/25 pb-2"
                  >
                    {track.track_number ? `${track.track_number}. ` : ""}
                    {track.title}
                    {track.performers_public
                      ? ` — ${track.performers_public}`
                      : ""}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-comun-paper/72">
                Faixas ainda não publicadas.
              </p>
            )}
          </ComunRelatedSection>
          <ComunRelatedSection
            id="plataformas"
            title="Ouvir em plataforma externa"
            summary="O áudio vem da plataforma indicada; o COMUN não hospeda arquivo nem download."
          >
            <div className="flex flex-wrap gap-2">
              {data.links.map((link: any) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="comun-v2-action"
                >
                  {link.display_label || link.platform} ↗
                </a>
              ))}
            </div>
          </ComunRelatedSection>
        </main>
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <Section>
        <Link
          href="/comun/acervo/musica"
          className="font-black uppercase text-comun-yellow"
        >
          ← Música local
        </Link>
        <div className="mt-5 grid gap-6 md:grid-cols-[320px_1fr]">
          <aside>
            {cover?.public_url ? (
              <Image
                src={cover.public_url}
                alt={cover.alt_text || `Capa de ${data.item.title}`}
                width={600}
                height={600}
                className="aspect-square w-full border-2 border-comun-black object-cover"
              />
            ) : (
              <div className="paper-panel flex aspect-square items-center justify-center border-2 border-comun-black p-6 text-center font-black uppercase">
                Capa não disponível
              </div>
            )}
          </aside>
          <article>
            <p className="text-sm font-black uppercase text-comun-rust">
              {release.release_type} ·{" "}
              {release.release_date ??
                release.release_year ??
                "data desconhecida"}
            </p>
            <h1 className="mt-2 text-4xl font-black uppercase">
              {data.item.title}
            </h1>
            {data.artist ? (
              <Link
                href={`/comun/acervo/artistas/${data.artist.slug}`}
                className="mt-2 block text-xl underline"
              >
                {data.artist.title}
              </Link>
            ) : null}
            <p className="mt-4">{data.item.description}</p>
            <h2 className="mt-8 text-2xl font-black uppercase">Faixas</h2>
            <ol className="mt-3 grid gap-2">
              {data.tracks.map((track: any) => (
                <li
                  key={track.id}
                  className="border-b border-comun-black/30 pb-2"
                >
                  {track.track_number ? `${track.track_number}. ` : ""}
                  {track.title}
                </li>
              ))}
            </ol>
          </article>
        </div>
      </Section>
    </ComunShell>
  );
}
