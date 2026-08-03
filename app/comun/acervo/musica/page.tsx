import Link from "next/link";
import {
  ComunCollectionPage,
  ComunEmptyStateV2,
} from "@/components/comun-relational";
import { ComunShell, Section } from "@/components/comun-shell";
import { listPublicReleases } from "@/lib/archive/local-music";
import { isComunAppV2, withComunAppV2 } from "@/lib/comun-shell-contract";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { items, total, page, facets } = await listPublicReleases(params);
  const queryFor = (number: number) =>
    new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(params).filter(([, value]) => value),
      ),
      page: String(number),
    }).toString();
  const appV2 = isComunAppV2(params.experiencia);

  if (appV2) {
    return (
      <ComunShell
        appBar={{
          title: "Música local",
          contextLabel: "Acervo · discografias documentadas",
          backDestination: "/comun/acervo",
        }}
      >
        <ComunCollectionPage
          kind="memory"
          title="Música local"
          summary="Discografias documentadas com créditos e direitos. O COMUN aponta para plataformas oficiais e não hospeda downloads de áudio."
          rail={[
            {
              kind: "memory",
              slug: "acervo",
              title: "Acervo",
              href: "/comun/acervo",
              source: "canonical_route",
            },
            {
              kind: "memory",
              slug: "artistas",
              title: "Artistas",
              href: "/comun/acervo/artistas",
              source: "canonical_route",
            },
          ]}
        >
          <ReleaseFilters params={params} facets={facets} appV2 />
          <p className="my-5 text-sm font-bold" aria-live="polite">
            {total} lançamento(s) público(s) neste recorte.
          </p>
          {items.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {items.map((item: any) => (
                <Link
                  key={item.id}
                  href={withComunAppV2(`/comun/acervo/musica/${item.slug}`)}
                  className="surface-memory rounded-[var(--comun-radius-cultural)] p-5 text-comun-black focus-visible:outline focus-visible:outline-4 focus-visible:outline-comun-yellow"
                >
                  <p className="comun-v2-status text-comun-rust">
                    {item.comun_archive_music_releases?.release_type} ·{" "}
                    {item.comun_archive_music_releases?.release_year ??
                      "data desconhecida"}
                  </p>
                  <h2 className="mt-2 text-xl font-black normal-case">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm text-comun-black/72">
                    {item.summary}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <ComunEmptyStateV2
              title="Nenhum lançamento neste recorte"
              explanation="Os filtros não encontraram uma discografia pública já revisada."
              related="Somente itens com documentação e direitos publicados entram nesta lista."
              action={{ href: "/comun/acervo/musica", label: "Limpar filtros" }}
              secondaryActions={[
                { href: "/comun/acervo", label: "Explorar o Acervo" },
              ]}
            />
          )}
          <Pagination page={page} total={total} queryFor={queryFor} appV2 />
        </ComunCollectionPage>
      </ComunShell>
    );
  }

  return (
    <ComunShell>
      <Section>
        <h1 className="text-4xl font-black uppercase">Música local</h1>
        <p className="mt-3 text-comun-paper/75">
          Discografias documentadas. O COMUN não hospeda nem oferece download de
          áudio.
        </p>
        <ReleaseFilters params={params} facets={facets} />
        <p className="mt-4" aria-live="polite">
          {total} lançamento(s)
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {items.map((item: any) => (
            <Link
              key={item.id}
              href={`/comun/acervo/musica/${item.slug}`}
              className="paper-panel border-2 border-comun-black p-4 focus-visible:outline focus-visible:outline-4"
            >
              <p className="text-xs font-black uppercase text-comun-rust">
                {item.comun_archive_music_releases?.release_type} ·{" "}
                {item.comun_archive_music_releases?.release_year ??
                  "data desconhecida"}
              </p>
              <h2 className="mt-2 text-xl font-black uppercase">
                {item.title}
              </h2>
              <p className="mt-2">{item.summary}</p>
            </Link>
          ))}
        </div>
        {!items.length ? (
          <p className="mt-6 border-2 p-4">
            Nenhum lançamento publicado com estes filtros.
          </p>
        ) : null}
        <Pagination page={page} total={total} queryFor={queryFor} />
      </Section>
    </ComunShell>
  );
}

function ReleaseFilters({
  params,
  facets,
  appV2 = false,
}: {
  params: Record<string, string | undefined>;
  facets: { types: string[]; decades: number[] };
  appV2?: boolean;
}) {
  return (
    <form
      aria-label="Filtros de lançamentos"
      className={`${appV2 ? "mt-0 rounded-[var(--comun-radius-cultural)] border border-comun-paper/20 p-4" : "mt-5"} grid gap-2 sm:grid-cols-2 lg:grid-cols-4`}
    >
      {!appV2 ? (
        <input type="hidden" name="experiencia" value="legacy" />
      ) : null}
      <input
        className="min-h-11 bg-comun-paper p-3 text-comun-black placeholder:text-comun-asphalt"
        name="q"
        defaultValue={params.q}
        placeholder="Título, artista ou crédito"
        aria-label="Busca"
      />
      <select
        className="min-h-11 bg-comun-paper p-3 text-comun-black"
        name="type"
        aria-label="Tipo de lançamento"
        defaultValue={params.type}
      >
        <option value="">Todos os tipos</option>
        {facets.types.map((type) => (
          <option key={type}>{type}</option>
        ))}
      </select>
      <select
        className="min-h-11 bg-comun-paper p-3 text-comun-black"
        name="decade"
        aria-label="Década"
        defaultValue={params.decade}
      >
        <option value="">Todas as décadas</option>
        {facets.decades.map((decade) => (
          <option key={decade} value={decade}>
            {decade}
          </option>
        ))}
      </select>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          name="with_links"
          value="1"
          defaultChecked={params.with_links === "1"}
        />{" "}
        Com link oficial
      </label>
      <button className="comun-v2-action">Filtrar</button>
    </form>
  );
}

function Pagination({
  page,
  total,
  queryFor,
  appV2 = false,
}: {
  page: number;
  total: number;
  queryFor: (page: number) => string;
  appV2?: boolean;
}) {
  if (page === 1 && page * 12 >= total) return null;
  return (
    <nav aria-label="Paginação" className="mt-6 flex justify-between">
      {page > 1 ? (
        <Link
          href={`${appV2 ? "/comun/acervo/musica" : ""}?${queryFor(page - 1)}`}
        >
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      {page * 12 < total ? (
        <Link
          href={`${appV2 ? "/comun/acervo/musica" : ""}?${queryFor(page + 1)}`}
        >
          Próxima →
        </Link>
      ) : null}
    </nav>
  );
}
