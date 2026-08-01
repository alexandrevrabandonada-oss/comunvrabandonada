import Link from "next/link";
import Image from "next/image";
import { ComunShell, Section } from "@/components/comun-shell";
import { ArtworkCard } from "@/components/territorial-art";
import {
  archiveDate,
  archiveItemHref,
  listPublicArchiveItems,
} from "@/lib/archive";
import { listIdentificationItems } from "@/lib/archive-identification";
import { listPublicArtworks } from "@/lib/archive/territorial-art";
import {
  ComunEmptyStateV2,
  ComunEntityHeader,
  ComunRelatedSection,
  ComunRelationRail,
} from "@/components/comun-relational";
import {
  createComunEntityContext,
  type EntityRelation,
} from "@/lib/comun-entity-context";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";
export const dynamic = "force-dynamic";
export default async function ArchivePage(props: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    city?: string;
    neighborhood?: string;
    from?: string;
    to?: string;
    place?: string;
    decade?: string;
    page?: string;
    experiencia?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const [items, identification, artworks] = await Promise.all([
    listPublicArchiveItems(searchParams),
    listIdentificationItems({ page: 1 }),
    listPublicArtworks({ page: 1, limit: 3 }),
  ]);
  const identificationPreview = identification.items.slice(0, 6);
  if (isComunAppV2(searchParams.experiencia))
    return (
      <ArchiveAppV2
        items={items}
        identification={identification}
        query={searchParams.q}
      />
    );
  return (
    <ComunShell>
      <Section>
        <p className="font-black uppercase text-comun-yellow">Acervo vivo</p>
        <h1 className="mt-2 text-4xl font-black uppercase text-comun-paper">
          Memória viva da cidade
        </h1>
        <p className="mt-3 max-w-3xl text-comun-paper/75">
          Fotografias, documentos, lugares, artistas e coleções publicados com
          revisão de fonte, direitos e privacidade.
        </p>
        <section
          aria-labelledby="memorias-em-identificacao"
          data-testid="historical-identification-preview"
          className="mt-6 border-2 border-comun-yellow bg-comun-asphalt/40 p-4 sm:p-6"
        >
          <p className="text-xs font-black uppercase tracking-wide text-comun-yellow">
            Autoria e contexto em identificação
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2
                id="memorias-em-identificacao"
                className="text-2xl font-black uppercase text-comun-paper sm:text-3xl"
              >
                Fotografias antigas de Volta Redonda
              </h2>
              <p className="mt-2 max-w-3xl text-comun-paper/75">
                {identification.total || 860} memórias aguardam a ajuda da
                comunidade para identificar lugares, pessoas, datas e
                acontecimentos. Os títulos são provisórios e toda contribuição
                passa por revisão.
              </p>
            </div>
            <Link
              href="/comun/acervo/identificar"
              className="inline-flex min-h-11 shrink-0 items-center justify-center bg-comun-yellow px-4 font-black uppercase text-comun-black"
            >
              Ver as {identification.total || 860} fotografias
            </Link>
          </div>

          {identificationPreview.length ? (
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {identificationPreview.map((item) => (
                <Link
                  href={`/comun/acervo/identificar/${item.public_slug}`}
                  key={item.id}
                  aria-label={`Abrir ${item.public_title}`}
                  className="group overflow-hidden border-2 border-comun-paper/25 bg-comun-black focus:outline-none focus:ring-4 focus:ring-comun-yellow"
                >
                  {item.preview_url ? (
                    <Image
                      src={item.preview_url}
                      alt="Fotografia histórica de Volta Redonda em identificação"
                      unoptimized
                      width={item.preview_width || 800}
                      height={item.preview_height || 600}
                      className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center p-3 text-center text-xs font-black uppercase text-comun-paper/70">
                      Restauração pendente
                    </div>
                  )}
                  <p className="line-clamp-2 p-2 text-xs font-black uppercase text-comun-paper group-hover:text-comun-yellow">
                    {item.public_title}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-comun-paper/70">
              A campanha está temporariamente indisponível. Use o botão acima
              para consultar seu estado.
            </p>
          )}
          <p className="mt-4 text-xs text-comun-paper/60">
            Esta campanha colaborativa é separada do acervo editorial: uma
            contribuição não transforma uma hipótese em fato histórico.
          </p>
        </section>
        <section
          aria-labelledby="arte-dos-territorios"
          className="mt-6 border-2 border-comun-yellow p-4 sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-comun-yellow">
                Acervo com autoria, direitos e contexto
              </p>
              <h2
                id="arte-dos-territorios"
                className="mt-2 text-2xl font-black uppercase text-comun-paper sm:text-3xl"
              >
                Arte dos Territórios
              </h2>
              <p className="mt-2 max-w-3xl text-comun-paper/75">
                Obras vinculadas às pessoas, lutas, lugares e memórias que as
                produziram.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/comun/acervo/arte"
                className="inline-flex min-h-11 items-center border-2 border-comun-yellow px-4 font-black uppercase text-comun-yellow"
              >
                Explorar arte
              </Link>
              <Link
                href="/comun/acervo/arte/contribuir"
                className="inline-flex min-h-11 items-center bg-comun-yellow px-4 font-black uppercase text-comun-black"
              >
                Contribuir
              </Link>
            </div>
          </div>
          {artworks.items.length ? (
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {artworks.items.map((item: any) => (
                <ArtworkCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-5 border-l-4 border-comun-yellow bg-comun-asphalt/40 p-4 text-sm text-comun-paper/75">
              <p className="font-black uppercase text-comun-paper">
                Acervo aberto à primeira obra
              </p>
              <p className="mt-1">
                Nenhuma obra foi publicada neste recorte. Contribuições passam
                por revisão de autoria, direitos, contexto e segurança.
              </p>
            </div>
          )}
        </section>
        <Link
          href="/comun/acervo/contribuir"
          className="mt-5 inline-flex border-2 border-comun-yellow px-4 py-3 font-black uppercase text-comun-yellow"
        >
          Enviar fotografia historica
        </Link>
        <Link
          href="/comun/acervo/artistas"
          className="ml-3 mt-5 inline-flex border-2 border-comun-yellow px-4 py-3 font-black uppercase text-comun-yellow"
        >
          Conhecer artistas locais
        </Link>
        <div className="mt-6 border-2 border-comun-yellow p-4 text-comun-paper">
          <h2 className="text-2xl font-black uppercase">Som da nossa região</h2>
          <p className="mt-2 max-w-2xl text-comun-paper/75">
            Artistas, discografias e coleções editoriais documentados com
            fontes, direitos e links oficiais.
          </p>
          <div className="mt-3 flex gap-4">
            <Link
              href="/comun/acervo/artistas"
              className="font-black uppercase text-comun-yellow"
            >
              Artistas
            </Link>
            <Link
              href="/comun/acervo/musica"
              className="font-black uppercase text-comun-yellow"
            >
              Lançamentos
            </Link>
            <Link
              href="/comun/acervo/colecoes"
              className="font-black uppercase text-comun-yellow"
            >
              Coleções
            </Link>
          </div>
        </div>
        <Link
          href="/comun/acervo/direitos-e-remocao"
          className="ml-3 mt-5 inline-flex px-4 py-3 font-black uppercase text-comun-yellow underline"
        >
          Direitos e remocao
        </Link>
        <h2 className="mt-10 text-2xl font-black uppercase text-comun-paper">
          Acervo editorial publicado
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-comun-paper/70">
          Itens formalmente publicados após revisão editorial. Use os filtros
          para pesquisar este catálogo.
        </p>
        <form className="mt-5 grid gap-2 border-2 border-comun-yellow bg-comun-black p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Buscar no acervo"
            className="min-h-11 bg-comun-paper px-3 text-comun-black lg:col-span-2"
          />
          <select
            name="type"
            aria-label="Tipo de item do acervo"
            defaultValue={searchParams.type}
            className="min-h-11 bg-comun-paper px-2 text-comun-black"
          >
            <option value="">Todos os tipos</option>
            {[
              ["photograph", "Fotografia"],
              ["document", "Documento"],
              ["place", "Lugar"],
              ["artist", "Artista"],
              ["music_release", "Lançamento musical"],
              ["oral_history", "História oral"],
              ["territorial_artwork", "Arte territorial"],
              ["poster", "Cartaz"],
              ["newspaper", "Jornal"],
              ["other", "Outro"],
            ].map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="city"
            defaultValue={searchParams.city}
            placeholder="Cidade"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="neighborhood"
            defaultValue={searchParams.neighborhood}
            placeholder="Bairro"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="place"
            defaultValue={searchParams.place}
            placeholder="Lugar"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="decade"
            type="number"
            step="10"
            defaultValue={searchParams.decade}
            placeholder="Decada"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="from"
            type="number"
            defaultValue={searchParams.from}
            placeholder="Ano inicial"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <input
            name="to"
            type="number"
            defaultValue={searchParams.to}
            placeholder="Ano final"
            className="min-h-11 bg-comun-paper px-3 text-comun-black"
          />
          <button className="min-h-11 bg-comun-yellow px-4 font-black uppercase text-comun-black">
            Filtrar
          </button>
        </form>
        <div className="mt-4 flex gap-3">
          <Link
            href="/comun/acervo/colecoes"
            className="font-black uppercase text-comun-yellow"
          >
            Ver coleções
          </Link>
          <span className="text-comun-paper/50">
            {items.length} resultado(s)
          </span>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const asset = item.assets.find((a) => a.public_url);
            return (
              <Link
                href={archiveItemHref(item)}
                key={item.id}
                className="paper-panel overflow-hidden border-2 border-comun-black"
              >
                {asset?.public_url && asset.mime_type?.startsWith("image/") ? (
                  <Image
                    src={asset.public_url}
                    alt={asset.alt_text ?? ""}
                    width={800}
                    height={600}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-comun-asphalt text-sm font-black uppercase text-comun-paper/60">
                    {item.item_type}
                  </div>
                )}
                <div className="p-4">
                  <p className="text-xs font-black uppercase text-comun-rust">
                    {item.item_type} · {archiveDate(item)}
                  </p>
                  <h2 className="mt-2 text-xl font-black uppercase">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-comun-asphalt/70">
                    {[item.place_name, item.neighborhood, item.city]
                      .filter(Boolean)
                      .join(" · ") || "Local não informado"}
                  </p>
                  {item.credits ? (
                    <p className="mt-2 text-xs font-bold">
                      Créditos: {item.credits}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
        {!items.length ? (
          <p className="mt-6 border-2 border-comun-yellow p-5 text-comun-paper/75">
            Nenhum item publicado corresponde aos filtros.
          </p>
        ) : null}
        {items.length === 24 ? (
          <Link
            href={`/comun/acervo?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v)), page: String((Number(searchParams.page) || 1) + 1) }).toString()}`}
            className="mt-8 inline-flex border-2 border-comun-yellow px-4 py-3 font-black uppercase text-comun-yellow"
          >
            Carregar mais resultados
          </Link>
        ) : null}
      </Section>
    </ComunShell>
  );
}

function ArchiveAppV2({
  items,
  identification,
  query,
}: {
  items: any[];
  identification: { total: number; items: any[] };
  query?: string;
}) {
  const relations: EntityRelation[] = [
    {
      kind: "memory",
      slug: "colecoes",
      title: "Coleções",
      href: "/comun/acervo/colecoes",
      source: "canonical_route",
    },
    {
      kind: "territory",
      slug: "territorios",
      title: "Por território",
      href: "/comun/territorios",
      source: "canonical_route",
    },
    {
      kind: "memory",
      slug: "arte",
      title: "Arte",
      href: "/comun/acervo/arte",
      source: "canonical_route",
    },
    {
      kind: "memory",
      slug: "musica",
      title: "Música",
      href: "/comun/acervo/musica",
      source: "canonical_route",
    },
    {
      kind: "memory",
      slug: "historias-orais",
      title: "História oral",
      href: "/comun/acervo/historias-orais",
      source: "canonical_route",
    },
    {
      kind: "memory",
      slug: "radio",
      title: "Rádio",
      href: "/comun/radio",
      source: "canonical_route",
    },
  ];
  const context = createComunEntityContext({
    kind: "memory",
    id: "archive-public-entry",
    slug: "acervo",
    title: "Acervo vivo",
    state: "Revisão editorial",
    summary:
      "Fotografias, documentos, lugares, artistas e histórias publicados com revisão de fonte, direitos e privacidade.",
    primaryAction: {
      href: "/comun/acervo/contribuir",
      label: "Enviar memória",
      description:
        "Contribua com contexto, fonte e direitos para revisão editorial.",
    },
    relations,
  });
  return (
    <ComunShell
      appBar={{
        title: "Acervo",
        contextLabel: "Memória coletiva",
        backDestination: "/comun/explorar",
      }}
    >
      <main
        className="comun-v2-page comun-relational-page"
        data-comun-app-v2-page="archive-entry"
      >
        <ComunEntityHeader context={context} />
        <form className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]" role="search">
          <label className="sr-only" htmlFor="archive-v2-search">
            Buscar no Acervo
          </label>
          <input
            id="archive-v2-search"
            name="q"
            defaultValue={query}
            placeholder="Buscar no Acervo"
            className="min-h-12 rounded-[var(--comun-radius-control)] border border-comun-paper/30 bg-comun-paper/5 px-4 text-comun-paper placeholder:text-comun-paper/50"
          />
          <input type="hidden" name="experiencia" value="app-v2" />
          <button className="comun-v2-action">Buscar</button>
        </form>

        <section
          className="surface-memory mt-6 rounded-[var(--comun-radius-cultural)] p-5 text-comun-black"
          aria-labelledby="archive-identification-v2"
        >
          <p className="comun-v2-eyebrow text-comun-rust">
            Identificação colaborativa
          </p>
          <h2
            id="archive-identification-v2"
            className="mt-2 text-2xl font-black normal-case"
          >
            Fotografias antigas de Volta Redonda
          </h2>
          <p className="mt-3">
            Ajude a reconhecer lugares, pessoas, datas e acontecimentos. Toda
            contribuição passa por revisão.
          </p>
          <p className="mt-3 text-sm font-bold">
            {identification.total} itens disponíveis nesta campanha · estado
            consultado agora.
          </p>
          <Link
            href={withComunAppV2("/comun/acervo/identificar")}
            className="comun-v2-action mt-5"
          >
            Ver campanha
          </Link>
        </section>

        <ComunRelationRail relations={relations} title="Explorar a memória" />

        <ComunRelatedSection
          title="Publicações e coleções"
          summary="Itens editoriais publicados neste recorte; identificação colaborativa é contada separadamente."
        >
          {items.length ? (
            <div className="divide-y divide-comun-paper/20">
              {items.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={withComunAppV2(archiveItemHref(item))}
                  className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 py-3 font-black"
                >
                  <span>
                    <small className="comun-v2-eyebrow block text-comun-paper/55">
                      {item.item_type}
                    </small>
                    {item.title}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhuma publicação neste recorte"
              explanation="Itens editoriais aparecem depois de revisão de fonte, direitos, privacidade e qualidade pública."
              related="A campanha de identificação pode ter itens sem que eles já sejam publicações editoriais."
              action={{
                href: "/comun/acervo/identificar",
                label: "Ver campanha de identificação",
              }}
              secondaryActions={[
                { href: "/comun/acervo/contribuir", label: "Como contribuir" },
              ]}
            />
          )}
        </ComunRelatedSection>
        <Link
          href={withComunAppV2("/comun/acervo/direitos-e-remocao")}
          className="mt-7 inline-flex min-h-11 items-center font-black text-comun-yellow underline"
        >
          Direitos, correção e retirada
        </Link>
      </main>
    </ComunShell>
  );
}
