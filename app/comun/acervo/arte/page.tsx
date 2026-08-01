import Link from "next/link";
import { ComunShell, Section } from "@/components/comun-shell";
import { ArtworkCard, ArtworkEmptyState } from "@/components/territorial-art";
import {
  artworkTypes,
  listPublicArtworks,
  listPublicArtworkTerritories,
} from "@/lib/archive/territorial-art";
import { ComunMemoryCard } from "@/components/comun-cards";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";

export default async function ArtArchive({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    territorio?: string;
    pagina?: string;
    experiencia?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.pagina) || 1);
  const [result, territories] = await Promise.all([
    listPublicArtworks({
      query: params.q,
      type: params.tipo,
      territorySlug: params.territorio,
      page,
    }),
    listPublicArtworkTerritories(),
  ]);
  const href = (nextPage: number) =>
    `?${new URLSearchParams(Object.fromEntries(Object.entries({ ...params, pagina: String(nextPage) }).filter(([, value]) => value))).toString()}`;
  if (isComunAppV2(params.experiencia))
    return (
      <ComunShell
        appBar={{
          title: "Arte",
          contextLabel: "Acervo · autoria e território",
          backDestination: "/comun/acervo",
        }}
      >
        <ComunCollectionPage
          kind="memory"
          title="Arte dos territórios"
          summary="Obras publicadas com autoria, direitos e contexto. Vínculos com território ou pauta aparecem somente quando são canônicos."
          actions={
            <Link
              href={withComunAppV2("/comun/acervo/arte/contribuir")}
              className="comun-v2-action"
            >
              Contribuir com uma obra
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
              kind: "memory",
              slug: "radio",
              title: "Rádio",
              href: "/comun/radio",
              source: "canonical_route",
            },
          ]}
        >
          <form className="grid gap-3 rounded-[var(--comun-radius-cultural)] border border-comun-paper/20 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
            <input type="hidden" name="experiencia" value="app-v2" />
            <label className="font-bold">
              Buscar
              <input
                name="q"
                defaultValue={params.q}
                className="mt-1 min-h-11 w-full bg-comun-paper p-2 text-comun-black"
              />
            </label>
            <label className="font-bold">
              Linguagem
              <select
                name="tipo"
                defaultValue={params.tipo || ""}
                className="mt-1 min-h-11 w-full bg-comun-paper p-2 text-comun-black"
              >
                <option value="">Todas</option>
                {artworkTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-bold">
              Território
              <select
                name="territorio"
                defaultValue={params.territorio || ""}
                className="mt-1 min-h-11 w-full bg-comun-paper p-2 text-comun-black"
              >
                <option value="">Todos</option>
                {territories.map((territory: any) => (
                  <option key={territory.id} value={territory.slug}>
                    {territory.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="comun-v2-action self-end">Filtrar</button>
          </form>
          <p className="my-5 text-sm font-bold">
            {result.count} obra(s) publicada(s) · filtros e revisão editorial
            deste recorte.
          </p>
          {result.items.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {result.items.map((item: any) => (
                <ComunMemoryCard
                  key={item.id}
                  href={withComunAppV2(`/comun/acervo/arte/${item.slug}`)}
                  title={item.title}
                  summary={
                    item.summary ??
                    item.comun_archive_artworks?.description_public ??
                    "Obra publicada no Acervo."
                  }
                  context={
                    [
                      item.comun_archive_artworks?.territory?.name,
                      item.comun_archive_artworks?.artwork_type,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Arte · relação territorial não publicada"
                  }
                />
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhuma obra neste recorte"
              explanation="Obras aparecem somente depois de revisão de autoria, direitos, contexto e segurança."
              related="Uma contribuição em revisão não é uma publicação editorial."
              action={{
                href: "/comun/acervo/arte/contribuir",
                label: "Contribuir com uma obra",
              }}
              secondaryActions={[
                { href: "/comun/acervo", label: "Voltar ao Acervo" },
              ]}
            />
          )}
          <nav className="mt-8 flex gap-3" aria-label="Paginação">
            {page > 1 ? (
              <Link
                href={withComunAppV2(href(page - 1))}
                className="comun-v2-action"
              >
                Anterior
              </Link>
            ) : null}
            {result.count > page * 12 ? (
              <Link
                href={withComunAppV2(href(page + 1))}
                className="comun-v2-action"
              >
                Próxima
              </Link>
            ) : null}
          </nav>
        </ComunCollectionPage>
      </ComunShell>
    );
  return (
    <ComunShell>
      <section className="border-b-2 border-comun-black bg-comun-yellow text-comun-black">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="text-xs font-black uppercase tracking-[.2em]">
            Acervo Vivo
          </p>
          <h1 className="mt-2 max-w-4xl text-5xl font-black uppercase leading-none sm:text-7xl">
            Arte dos territórios
          </h1>
          <p className="mt-5 max-w-2xl text-lg">
            Obras com autoria, direitos e contexto, vinculadas às lutas e
            memórias que as produziram.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/comun/acervo"
              className="inline-flex min-h-12 items-center border-2 border-comun-black px-5 font-black uppercase"
            >
              ← Acervo
            </Link>
            <Link
              href="/comun/acervo/arte/contribuir"
              className="inline-flex min-h-12 items-center border-2 border-comun-black bg-comun-black px-5 font-black uppercase text-comun-yellow"
            >
              Contribuir com uma obra
            </Link>
          </div>
        </div>
      </section>
      <Section>
        <form className="grid gap-3 border-2 border-comun-black bg-white p-4 text-comun-black sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="font-bold">
            Buscar
            <input
              name="q"
              defaultValue={params.q}
              className="mt-1 min-h-11 w-full border-2 border-comun-black p-2"
            />
          </label>
          <label className="font-bold">
            Linguagem
            <select
              name="tipo"
              defaultValue={params.tipo || ""}
              className="mt-1 min-h-11 w-full border-2 border-comun-black p-2"
            >
              <option value="">Todas</option>
              {artworkTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="font-bold">
            Território
            <select
              name="territorio"
              defaultValue={params.territorio || ""}
              className="mt-1 min-h-11 w-full border-2 border-comun-black p-2"
            >
              <option value="">Todos</option>
              {territories.map((territory: any) => (
                <option key={territory.id} value={territory.slug}>
                  {territory.name}
                </option>
              ))}
            </select>
          </label>
          <button className="min-h-11 self-end border-2 border-comun-black bg-comun-yellow px-5 py-2 font-black uppercase">
            Filtrar
          </button>
        </form>
        <p className="my-5 text-sm font-bold">
          {result.count} obra(s) publicada(s)
        </p>
        {result.items.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {result.items.map((item: any) => (
              <ArtworkCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <ArtworkEmptyState />
        )}
        <nav className="mt-8 flex gap-3" aria-label="Paginação">
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              className="border-2 border-comun-yellow px-4 py-2 font-bold"
            >
              Anterior
            </Link>
          ) : null}
          {result.count > page * 12 ? (
            <Link
              href={href(page + 1)}
              className="border-2 border-comun-yellow px-4 py-2 font-bold"
            >
              Próxima
            </Link>
          ) : null}
        </nav>
      </Section>
    </ComunShell>
  );
}
